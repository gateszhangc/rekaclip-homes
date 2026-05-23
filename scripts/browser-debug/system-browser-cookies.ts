import { execFile } from "node:child_process";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Cookie } from "playwright";

const execFileAsync = promisify(execFile);

type SupportedBrowserName = "Chrome" | "Comet";

type BrowserRegistryEntry = {
  name: SupportedBrowserName;
  dataDir: string;
  keychainService: string;
};

type RawCookieRow = {
  hostKey: string;
  name: string;
  valueHex: string;
  encryptedValueHex: string;
  path: string;
  expiresUtc: string;
  isSecure: string;
  isHttpOnly: string;
  hasExpires: string;
  sameSite: string;
};

export type ResolvedBrowserProfile = {
  browserName: SupportedBrowserName;
  profileName: string;
  cookieDbPath: string;
  matchingCookieCount: number;
  emails: string[];
};

const BROWSERS: BrowserRegistryEntry[] = [
  {
    name: "Chrome",
    dataDir: join(homedir(), "Library", "Application Support", "Google", "Chrome"),
    keychainService: "Chrome Safe Storage",
  },
  {
    name: "Comet",
    dataDir: join(homedir(), "Library", "Application Support", "Comet"),
    keychainService: "Comet Safe Storage",
  },
];

const CHROMIUM_EPOCH_OFFSET = 11644473600000000n;
const SQLITE_SEPARATOR = "\u001f";

function getCookieWhereClause(hostNeedles: string[]): string {
  return hostNeedles
    .map((needle) => {
      const escaped = needle.replace(/'/g, "''");
      return `host_key like '%${escaped}%'`;
    })
    .join(" or ");
}

function parseProfileName(rawValue?: string | null): string | null {
  const value = (rawValue || "").trim();
  return value || null;
}

function decodeHexUtf8(hex: string): string {
  if (!hex) {
    return "";
  }
  return Buffer.from(hex, "hex").toString("utf8");
}

function decryptChromiumCookieValue(
  encryptedHex: string,
  derivedKey: Buffer
): string {
  if (!encryptedHex) {
    return "";
  }

  const encryptedValue = Buffer.from(encryptedHex, "hex");
  if (encryptedValue.length < 4) {
    return "";
  }

  const prefix = encryptedValue.subarray(0, 3).toString("utf8");
  if (prefix !== "v10" && prefix !== "v11") {
    throw new Error(`Unsupported Chromium cookie prefix: ${prefix}`);
  }

  const ciphertext = encryptedValue.subarray(3);
  const iv = Buffer.alloc(16, 0x20);
  const decipher = createDecipheriv("aes-128-cbc", derivedKey, iv);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  if (plaintext.length <= 32) {
    return "";
  }

  return plaintext.subarray(32).toString("utf8");
}

function chromiumEpochToUnixSeconds(
  expiresUtc: string,
  hasExpires: string
): number {
  if (hasExpires === "0") {
    return -1;
  }

  const rawValue = BigInt(expiresUtc || "0");
  if (rawValue === 0n) {
    return -1;
  }

  const unixMicroseconds = rawValue - CHROMIUM_EPOCH_OFFSET;
  return Number(unixMicroseconds / 1000000n);
}

function mapSameSite(rawValue: string): Cookie["sameSite"] {
  switch (Number(rawValue || "1")) {
    case 0:
      return "None";
    case 2:
      return "Strict";
    default:
      return "Lax";
  }
}

function findBrowserByName(rawValue?: string | null): BrowserRegistryEntry[] {
  const normalized = (rawValue || "").trim().toLowerCase();
  if (!normalized) {
    return BROWSERS;
  }

  return BROWSERS.filter((browser) => browser.name.toLowerCase() === normalized);
}

async function listProfiles(browser: BrowserRegistryEntry): Promise<string[]> {
  if (!existsSync(browser.dataDir)) {
    return [];
  }

  const entries = await readdir(browser.dataDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((profileName) =>
      existsSync(join(browser.dataDir, profileName, "Cookies"))
    )
    .sort((left, right) => {
      if (left === "Default") return -1;
      if (right === "Default") return 1;
      return left.localeCompare(right);
    });
}

async function readProfileEmails(
  browser: BrowserRegistryEntry,
  profileName: string
): Promise<string[]> {
  const preferencesPath = join(browser.dataDir, profileName, "Preferences");
  if (!existsSync(preferencesPath)) {
    return [];
  }

  try {
    const raw = await readFile(preferencesPath, "utf8");
    const data = JSON.parse(raw) as {
      account_info?: Array<{ email?: string }>;
    };
    return (data.account_info || [])
      .map((account) => (account.email || "").trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function runSqliteQuery(dbPath: string, sql: string): Promise<string> {
  const { stdout } = await execFileAsync("sqlite3", [
    dbPath,
    "-readonly",
    "-separator",
    SQLITE_SEPARATOR,
    sql,
  ]);

  return stdout.trim();
}

async function countMatchingCookies(
  dbPath: string,
  hostNeedles: string[]
): Promise<number> {
  const whereClause = getCookieWhereClause(hostNeedles);
  const raw = await runSqliteQuery(
    dbPath,
    `select count(*) from cookies where ${whereClause};`
  );

  return Number(raw || "0");
}

async function loadChromiumCookies(
  dbPath: string,
  hostNeedles: string[]
): Promise<RawCookieRow[]> {
  const whereClause = getCookieWhereClause(hostNeedles);
  const raw = await runSqliteQuery(
    dbPath,
    [
      "select",
      "host_key,",
      "name,",
      "hex(value),",
      "hex(encrypted_value),",
      "path,",
      "expires_utc,",
      "is_secure,",
      "is_httponly,",
      "has_expires,",
      "samesite",
      "from cookies",
      `where ${whereClause}`,
      "order by host_key, name;",
    ].join(" ")
  );

  if (!raw) {
    return [];
  }

  return raw.split("\n").map((line) => {
    const [
      hostKey,
      name,
      valueHex,
      encryptedValueHex,
      path,
      expiresUtc,
      isSecure,
      isHttpOnly,
      hasExpires,
      sameSite,
    ] = line.split(SQLITE_SEPARATOR);

    return {
      hostKey,
      name,
      valueHex,
      encryptedValueHex,
      path,
      expiresUtc,
      isSecure,
      isHttpOnly,
      hasExpires,
      sameSite,
    };
  });
}

async function deriveCookieKey(browser: BrowserRegistryEntry): Promise<Buffer> {
  const { stdout } = await execFileAsync("security", [
    "find-generic-password",
    "-s",
    browser.keychainService,
    "-w",
  ]);

  return pbkdf2Sync(stdout.trim(), "saltysalt", 1003, 16, "sha1");
}

export async function resolveBrowserProfile(options?: {
  browserName?: string;
  profileName?: string;
  email?: string;
  hostNeedles?: string[];
}): Promise<ResolvedBrowserProfile> {
  const hostNeedles = options?.hostNeedles?.length
    ? options.hostNeedles
    : ["localhost", "127.0.0.1"];
  const preferredProfileName = parseProfileName(options?.profileName);
  const preferredEmail = (options?.email || "").trim().toLowerCase();
  const browsers = findBrowserByName(options?.browserName);

  if (browsers.length === 0) {
    throw new Error(
      `Unsupported browser "${options?.browserName}". Expected one of: ${BROWSERS.map((browser) => browser.name).join(", ")}`
    );
  }

  const candidates: Array<
    ResolvedBrowserProfile & { profileRank: number }
  > = [];

  for (const browser of browsers) {
    const profileNames = await listProfiles(browser);

    for (const profileName of profileNames) {
      if (preferredProfileName && profileName !== preferredProfileName) {
        continue;
      }

      const cookieDbPath = join(browser.dataDir, profileName, "Cookies");
      const emails = await readProfileEmails(browser, profileName);
      if (preferredEmail && !emails.includes(preferredEmail)) {
        continue;
      }

      const matchingCookieCount = await countMatchingCookies(cookieDbPath, hostNeedles);
      const profileRank = profileName === "Default" ? 0 : 1;

      candidates.push({
        browserName: browser.name,
        profileName,
        cookieDbPath,
        emails,
        matchingCookieCount,
        profileRank,
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "No Chromium profile matched the requested browser/email/profile filters."
    );
  }

  candidates.sort((left, right) => {
    if (right.matchingCookieCount !== left.matchingCookieCount) {
      return right.matchingCookieCount - left.matchingCookieCount;
    }
    if (right.profileRank !== left.profileRank) {
      return right.profileRank - left.profileRank;
    }
    return left.profileName.localeCompare(right.profileName);
  });

  const selected = candidates[0];
  return {
    browserName: selected.browserName,
    profileName: selected.profileName,
    cookieDbPath: selected.cookieDbPath,
    matchingCookieCount: selected.matchingCookieCount,
    emails: selected.emails,
  };
}

export async function importSystemBrowserCookies(options?: {
  browserName?: string;
  profileName?: string;
  email?: string;
  hostNeedles?: string[];
}): Promise<{
  profile: ResolvedBrowserProfile;
  cookies: Cookie[];
}> {
  const hostNeedles = options?.hostNeedles?.length
    ? options.hostNeedles
    : ["localhost", "127.0.0.1"];
  const profile = await resolveBrowserProfile({
    browserName: options?.browserName,
    profileName: options?.profileName,
    email: options?.email,
    hostNeedles,
  });
  const browser = BROWSERS.find(
    (entry) => entry.name === profile.browserName
  );

  if (!browser) {
    throw new Error(`Unsupported browser "${profile.browserName}"`);
  }

  const derivedKey = await deriveCookieKey(browser);
  const rows = await loadChromiumCookies(profile.cookieDbPath, hostNeedles);

  const cookies = rows.map((row) => {
    const rawValue = decodeHexUtf8(row.valueHex);
    const value =
      rawValue ||
      decryptChromiumCookieValue(row.encryptedValueHex, derivedKey);

    return {
      name: row.name,
      value,
      domain: row.hostKey,
      path: row.path || "/",
      expires: chromiumEpochToUnixSeconds(row.expiresUtc, row.hasExpires),
      secure: row.isSecure === "1",
      httpOnly: row.isHttpOnly === "1",
      sameSite: mapSameSite(row.sameSite),
    } satisfies Cookie;
  });

  return {
    profile,
    cookies,
  };
}
