/**
 * Upload Public Images to Cloudflare R2
 *
 * This script uploads all images under public/ to Cloudflare R2 and
 * rewrites code references from "/path/to/image" to the public R2 URL.
 *
 * Usage:
 *   npx tsx scripts/upload-public-images.ts
 *   npx tsx scripts/upload-public-images.ts --dry-run
 */

import * as fs from "fs";
import * as path from "path";
import { AwsClient } from "aws4fetch";

const config = {
  endpoint:
    process.env.STORAGE_ENDPOINT ||
    "https://45a8243cc61a1d87d62200124ab0c311.r2.cloudflarestorage.com",
  accessKey: process.env.STORAGE_ACCESS_KEY || "42c3f0cf309b3322b6ca0d970ea47f5e",
  secretKey:
    process.env.STORAGE_SECRET_KEY ||
    "9e994bbf8ef05ab3ac1fddd4892ef6a970ac7912796d709c153c524aeb7baf8f",
  bucket: process.env.STORAGE_BUCKET || "animal-generator",
  domain:
    process.env.STORAGE_DOMAIN || "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev",
  region: "auto",
};

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const dryRun = process.argv.includes("--dry-run");

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".avif",
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
]);

const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  "public",
  "tasks",
  "test-results",
  "playwright-report",
  "blob-report",
  "dist",
  "build",
]);

interface UploadResult {
  localPath: string;
  key: string;
  r2Url: string;
  size: number;
}

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function walkDir(dir: string, files: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function walkRepo(dir: string, files: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRepo(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadFile(filePath: string, key: string) {
  const body = fs.readFileSync(filePath);
  const url = `${config.endpoint}/${config.bucket}/${key}`;

  const client = new AwsClient({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    region: config.region,
    service: "s3",
  });

  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
  };

  const headers: Record<string, string> = {
    "Content-Type": contentTypeMap[ext] || "application/octet-stream",
    "Content-Disposition": "inline",
    "Content-Length": body.length.toString(),
  };

  const request = new Request(url, {
    method: "PUT",
    headers,
    body,
  });

  const response = await client.fetch(request);
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

function replaceInContent(content: string, localPath: string, r2Url: string) {
  const replacements: Array<[string, string]> = [
    [`\"${localPath}\"`, `\"${r2Url}\"`],
    [`'${localPath}'`, `'${r2Url}'`],
    [`(${localPath})`, `(${r2Url})`],
    [`url(${localPath})`, `url(${r2Url})`],
    [`url(\"${localPath}\")`, `url(\"${r2Url}\")`],
    [`url('${localPath}')`, `url('${r2Url}')`],
  ];

  let updated = content;
  for (const [from, to] of replacements) {
    if (updated.includes(from)) {
      updated = updated.split(from).join(to);
    }
  }
  return updated;
}

async function main() {
  console.log("Upload public images to Cloudflare R2\n");
  if (dryRun) {
    console.log("DRY RUN MODE - No files will be uploaded\n");
  }

  const publicFiles = walkDir(publicDir);
  const imageFiles = publicFiles.filter((file) =>
    imageExtensions.has(path.extname(file).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images in public/\n`);

  if (imageFiles.length === 0) {
    console.log("No images to upload.");
    return;
  }

  const uploads: UploadResult[] = [];
  const errors: { file: string; error: string }[] = [];
  const domain = config.domain.replace(/\/$/, "");

  for (const file of imageFiles) {
    const stats = fs.statSync(file);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const relative = toPosixPath(path.relative(publicDir, file));
    const key = relative;
    const r2Url = `${domain}/${key}`;

    console.log(`Uploading ${relative} (${sizeMB} MB)`);

    if (dryRun) {
      uploads.push({ localPath: file, key, r2Url, size: stats.size });
      console.log(`   -> Would upload to: ${r2Url}`);
      continue;
    }

    try {
      await uploadFile(file, key);
      uploads.push({ localPath: file, key, r2Url, size: stats.size });
      console.log(`   OK: ${r2Url}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ file: relative, error: errorMsg });
      console.log(`   Failed: ${errorMsg}`);
    }
  }

  console.log("\nUpdating references across the repo...\n");

  const repoFiles = walkRepo(projectRoot).filter((file) =>
    textExtensions.has(path.extname(file))
  );

  let updatedFiles = 0;
  for (const file of repoFiles) {
    let content = fs.readFileSync(file, "utf-8");
    let updated = content;

    for (const upload of uploads) {
      const localPath = `/${upload.key}`;
      if (!updated.includes(localPath)) {
        continue;
      }
      updated = replaceInContent(updated, localPath, upload.r2Url);
    }

    if (updated !== content) {
      updatedFiles++;
      if (!dryRun) {
        fs.writeFileSync(file, updated, "utf-8");
      }
      console.log(`   Updated: ${path.relative(projectRoot, file)}`);
    }
  }

  console.log("\nSummary:");
  console.log(`   Uploaded: ${uploads.length - errors.length}`);
  console.log(`   Failed: ${errors.length}`);
  const totalSize = uploads.reduce((sum, r) => sum + r.size, 0);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Files updated: ${updatedFiles}`);

  if (dryRun) {
    console.log("\nDry run complete. No files were uploaded or modified.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
