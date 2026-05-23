import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type ImageSpec = {
  baseName: string;
  width: number;
  height: number;
  svg: string;
};

function svgWrap(opts: {
  width: number;
  height: number;
  accent: string;
  content: string;
}) {
  const { width, height, accent, content } = opts;

  // Keep everything self-contained: no external fonts/images.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EasyClaw illustration">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#13132a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.15" cy="0.1" r="0.75">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="0.4" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.06"/>
    </pattern>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101022"/>
      <stop offset="1" stop-color="#0d0d18"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#dots)"/>

  ${content}
</svg>`;
}

function makeBriefingsSvg(width: number, height: number) {
  const accent = "#f59e0b"; // amber

  const content = `
  <g filter="url(#softShadow)">
    <rect x="72" y="70" width="${width - 144}" height="${height - 140}" rx="34" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <g opacity="0.9">
    <rect x="96" y="96" width="${width - 192}" height="12" rx="6" fill="url(#accentBar)"/>
    <circle cx="110" cy="136" r="6" fill="#ff6b6b" opacity="0.8"/>
    <circle cx="130" cy="136" r="6" fill="#fbbf24" opacity="0.8"/>
    <circle cx="150" cy="136" r="6" fill="#34d399" opacity="0.8"/>
  </g>

  <!-- Message stream -->
  <g>
    <rect x="108" y="168" width="330" height="80" rx="18" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="128" y="190" width="170" height="10" rx="5" fill="#ffffff" opacity="0.18"/>
    <rect x="128" y="212" width="240" height="10" rx="5" fill="#ffffff" opacity="0.10"/>
    <circle cx="410" cy="208" r="14" fill="${accent}" opacity="0.9"/>
    <path d="M404 208h12" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
    <path d="M410 202v12" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>

    <rect x="108" y="266" width="330" height="80" rx="18" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="128" y="288" width="140" height="10" rx="5" fill="#ffffff" opacity="0.18"/>
    <rect x="128" y="310" width="260" height="10" rx="5" fill="#ffffff" opacity="0.10"/>
    <circle cx="410" cy="306" r="14" fill="${accent}" opacity="0.9"/>
    <path d="M404 306h12" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>

    <rect x="108" y="364" width="330" height="80" rx="18" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="128" y="386" width="160" height="10" rx="5" fill="#ffffff" opacity="0.18"/>
    <rect x="128" y="408" width="230" height="10" rx="5" fill="#ffffff" opacity="0.10"/>
    <circle cx="410" cy="404" r="14" fill="${accent}" opacity="0.9"/>
    <path d="M404 404h12" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  </g>

  <!-- Dashboard chart -->
  <g>
    <rect x="466" y="168" width="226" height="276" rx="22" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="492" y="194" width="140" height="12" rx="6" fill="#ffffff" opacity="0.16"/>
    <rect x="492" y="220" width="110" height="8" rx="4" fill="#ffffff" opacity="0.10"/>

    <g transform="translate(492 250)">
      <rect x="0" y="140" width="20" height="56" rx="6" fill="${accent}" opacity="0.85"/>
      <rect x="30" y="110" width="20" height="86" rx="6" fill="${accent}" opacity="0.70"/>
      <rect x="60" y="80" width="20" height="116" rx="6" fill="${accent}" opacity="0.55"/>
      <rect x="90" y="40" width="20" height="156" rx="6" fill="${accent}" opacity="0.85"/>
      <rect x="120" y="95" width="20" height="101" rx="6" fill="${accent}" opacity="0.60"/>
      <rect x="150" y="65" width="20" height="131" rx="6" fill="${accent}" opacity="0.75"/>

      <path d="M0 180 C35 120, 65 145, 95 70 S155 120, 170 90" fill="none" stroke="#34d399" stroke-width="3" opacity="0.9"/>
      <circle cx="170" cy="90" r="5" fill="#34d399"/>
    </g>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

function makeSupportSvg(width: number, height: number) {
  const accent = "#60a5fa"; // blue

  const content = `
  <g filter="url(#softShadow)">
    <rect x="72" y="70" width="${width - 144}" height="${height - 140}" rx="34" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <rect x="96" y="96" width="${width - 192}" height="12" rx="6" fill="url(#accentBar)"/>
  <circle cx="${width - 140}" cy="132" r="18" fill="${accent}" opacity="0.95"/>
  <path d="M${width - 148} 128 h16 M${width - 148} 136 h10" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>

  <!-- Chat window -->
  <g>
    <rect x="108" y="160" width="${width - 216}" height="${height - 250}" rx="26" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>

    <!-- Robot avatar -->
    <g transform="translate(136 190)">
      <circle cx="28" cy="28" r="28" fill="#101827" stroke="${accent}" stroke-opacity="0.6" stroke-width="2"/>
      <rect x="14" y="16" width="28" height="26" rx="8" fill="${accent}" opacity="0.9"/>
      <circle cx="24" cy="28" r="3" fill="#0a0a0a" opacity="0.9"/>
      <circle cx="32" cy="28" r="3" fill="#0a0a0a" opacity="0.9"/>
      <path d="M22 36h12" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
      <path d="M28 10v-8" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
      <circle cx="28" cy="2" r="3" fill="${accent}" opacity="0.9"/>
    </g>

    <!-- Customer messages (left) -->
    <g>
      <rect x="206" y="190" width="300" height="58" rx="16" fill="#121a2a" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
      <rect x="226" y="212" width="210" height="8" rx="4" fill="#ffffff" opacity="0.14"/>
      <rect x="226" y="230" width="160" height="8" rx="4" fill="#ffffff" opacity="0.09"/>

      <rect x="206" y="266" width="270" height="58" rx="16" fill="#121a2a" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
      <rect x="226" y="288" width="180" height="8" rx="4" fill="#ffffff" opacity="0.14"/>
      <rect x="226" y="306" width="120" height="8" rx="4" fill="#ffffff" opacity="0.09"/>
    </g>

    <!-- AI replies (right) -->
    <g>
      <rect x="${width - 430}" y="352" width="300" height="64" rx="16" fill="#0f172a" stroke="${accent}" stroke-opacity="0.25" stroke-width="1.5"/>
      <rect x="${width - 410}" y="376" width="220" height="8" rx="4" fill="${accent}" opacity="0.22"/>
      <rect x="${width - 410}" y="394" width="170" height="8" rx="4" fill="#ffffff" opacity="0.08"/>

      <rect x="${width - 458}" y="434" width="328" height="64" rx="16" fill="#0f172a" stroke="${accent}" stroke-opacity="0.25" stroke-width="1.5"/>
      <rect x="${width - 438}" y="458" width="240" height="8" rx="4" fill="${accent}" opacity="0.22"/>
      <rect x="${width - 438}" y="476" width="190" height="8" rx="4" fill="#ffffff" opacity="0.08"/>
    </g>

    <!-- Typing indicator -->
    <g transform="translate(${width - 260} ${height - 140})">
      <rect x="0" y="0" width="120" height="32" rx="16" fill="${accent}" opacity="0.14"/>
      <circle cx="40" cy="16" r="4" fill="${accent}" opacity="0.9"/>
      <circle cx="60" cy="16" r="4" fill="${accent}" opacity="0.7"/>
      <circle cx="80" cy="16" r="4" fill="${accent}" opacity="0.5"/>
    </g>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

function makeAutomationSvg(width: number, height: number) {
  const accent = "#a78bfa"; // purple

  const content = `
  <g filter="url(#softShadow)">
    <rect x="72" y="70" width="${width - 144}" height="${height - 140}" rx="34" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <rect x="96" y="96" width="${width - 192}" height="12" rx="6" fill="url(#accentBar)"/>

  <!-- Workflow canvas -->
  <g>
    <rect x="108" y="160" width="${width - 216}" height="${height - 250}" rx="26" fill="#0b0b14" stroke="url(#stroke)" stroke-width="1.5" filter="url(#cardShadow)"/>

    <!-- Connections -->
    <path d="M220 260 C320 220, 360 220, 430 250" fill="none" stroke="${accent}" stroke-opacity="0.7" stroke-width="4" stroke-linecap="round"/>
    <path d="M430 250 C520 300, 560 340, 620 360" fill="none" stroke="#22d3ee" stroke-opacity="0.65" stroke-width="4" stroke-linecap="round"/>
    <path d="M430 250 C520 210, 560 190, 620 190" fill="none" stroke="#34d399" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>

    <!-- Nodes -->
    <g filter="url(#cardShadow)">
      <circle cx="220" cy="260" r="46" fill="#111827" stroke="${accent}" stroke-opacity="0.55" stroke-width="2"/>
      <path d="M200 260h40" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
      <path d="M220 240v40" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>

      <circle cx="430" cy="250" r="56" fill="#111827" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
      <path d="M410 250h40" stroke="#ffffff" stroke-opacity="0.18" stroke-width="4" stroke-linecap="round"/>
      <path d="M430 232v36" stroke="#ffffff" stroke-opacity="0.12" stroke-width="4" stroke-linecap="round"/>

      <circle cx="620" cy="190" r="44" fill="#0f172a" stroke="#34d399" stroke-opacity="0.55" stroke-width="2"/>
      <path d="M605 190l10 10 20-22" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>

      <circle cx="620" cy="360" r="44" fill="#0f172a" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="2"/>
      <path d="M608 362c8 10 26 10 34 0" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
      <path d="M612 350h16" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
    </g>

    <!-- Notification cards -->
    <g>
      <rect x="168" y="410" width="240" height="56" rx="16" fill="#101022" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5"/>
      <rect x="190" y="430" width="150" height="8" rx="4" fill="#ffffff" opacity="0.14"/>
      <rect x="190" y="446" width="120" height="8" rx="4" fill="#ffffff" opacity="0.08"/>

      <rect x="438" y="410" width="254" height="56" rx="16" fill="#101022" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5"/>
      <rect x="460" y="430" width="170" height="8" rx="4" fill="#ffffff" opacity="0.14"/>
      <rect x="460" y="446" width="140" height="8" rx="4" fill="#ffffff" opacity="0.08"/>
    </g>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

function makeModelsSvg(width: number, height: number) {
  const accent = "#a78bfa"; // purple

  const content = `
  <g filter="url(#softShadow)">
    <rect x="52" y="50" width="${width - 104}" height="${height - 100}" rx="30" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <rect x="72" y="72" width="${width - 144}" height="10" rx="5" fill="url(#accentBar)"/>

  <!-- Model cards -->
  <g>
    <rect x="86" y="120" width="140" height="190" rx="24" fill="#0b0b14" stroke="${accent}" stroke-opacity="0.55" stroke-width="2" filter="url(#cardShadow)"/>
    <circle cx="156" cy="172" r="26" fill="${accent}" opacity="0.9"/>
    <path d="M146 172l8 8 16-18" stroke="#0a0a0a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    <rect x="112" y="214" width="88" height="10" rx="5" fill="#ffffff" opacity="0.15"/>
    <rect x="108" y="236" width="96" height="8" rx="4" fill="#ffffff" opacity="0.08"/>

    <rect x="230" y="120" width="140" height="190" rx="24" fill="#0b0b14" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" filter="url(#cardShadow)"/>
    <circle cx="300" cy="172" r="26" fill="#4ade80" opacity="0.9"/>
    <path d="M290 172h20" stroke="#0a0a0a" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
    <rect x="256" y="214" width="88" height="10" rx="5" fill="#ffffff" opacity="0.15"/>
    <rect x="252" y="236" width="96" height="8" rx="4" fill="#ffffff" opacity="0.08"/>

    <rect x="374" y="120" width="140" height="190" rx="24" fill="#0b0b14" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" filter="url(#cardShadow)"/>
    <circle cx="444" cy="172" r="26" fill="#60a5fa" opacity="0.9"/>
    <path d="M434 172h20" stroke="#0a0a0a" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
    <path d="M444 162v20" stroke="#0a0a0a" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <rect x="400" y="214" width="88" height="10" rx="5" fill="#ffffff" opacity="0.15"/>
    <rect x="396" y="236" width="96" height="8" rx="4" fill="#ffffff" opacity="0.08"/>
  </g>

  <!-- Hint UI -->
  <g opacity="0.95">
    <rect x="86" y="330" width="${width - 172}" height="52" rx="18" fill="#0b0b14" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5"/>
    <rect x="110" y="350" width="220" height="8" rx="4" fill="#ffffff" opacity="0.12"/>
    <rect x="110" y="366" width="170" height="8" rx="4" fill="#ffffff" opacity="0.07"/>
    <rect x="${width - 190}" y="346" width="84" height="20" rx="10" fill="${accent}" opacity="0.22"/>
    <rect x="${width - 182}" y="352" width="46" height="8" rx="4" fill="${accent}" opacity="0.75"/>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

function makeChannelsSvg(width: number, height: number) {
  const accent = "#22d3ee"; // cyan

  const content = `
  <g filter="url(#softShadow)">
    <rect x="52" y="50" width="${width - 104}" height="${height - 100}" rx="30" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <rect x="72" y="72" width="${width - 144}" height="10" rx="5" fill="url(#accentBar)"/>

  <!-- Connection lines -->
  <g>
    <path d="M300 230 L160 150" stroke="#2AABEE" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>
    <path d="M300 230 L430 150" stroke="#5865F2" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>
    <path d="M300 230 L300 340" stroke="#25D366" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- Nodes -->
  <g filter="url(#cardShadow)">
    <circle cx="300" cy="230" r="54" fill="#0b0b14" stroke="${accent}" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="300" cy="230" r="10" fill="${accent}" opacity="0.9"/>
    <circle cx="280" cy="230" r="6" fill="${accent}" opacity="0.55"/>
    <circle cx="320" cy="230" r="6" fill="${accent}" opacity="0.55"/>

    <circle cx="160" cy="150" r="44" fill="#0b0b14" stroke="#2AABEE" stroke-opacity="0.65" stroke-width="2"/>
    <text x="160" y="158" text-anchor="middle" font-size="22" fill="#2AABEE" font-family="ui-sans-serif, system-ui, -apple-system">T</text>

    <circle cx="430" cy="150" r="44" fill="#0b0b14" stroke="#5865F2" stroke-opacity="0.65" stroke-width="2"/>
    <text x="430" y="158" text-anchor="middle" font-size="22" fill="#5865F2" font-family="ui-sans-serif, system-ui, -apple-system">D</text>

    <circle cx="300" cy="340" r="44" fill="#0b0b14" stroke="#25D366" stroke-opacity="0.65" stroke-width="2"/>
    <text x="300" y="348" text-anchor="middle" font-size="22" fill="#25D366" font-family="ui-sans-serif, system-ui, -apple-system">W</text>
  </g>

  <!-- Footer bar -->
  <g opacity="0.95">
    <rect x="86" y="330" width="${width - 172}" height="52" rx="18" fill="#0b0b14" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5"/>
    <rect x="110" y="350" width="240" height="8" rx="4" fill="#ffffff" opacity="0.12"/>
    <rect x="110" y="366" width="160" height="8" rx="4" fill="#ffffff" opacity="0.07"/>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

function makeDeploySvg(width: number, height: number) {
  const accent = "#34d399"; // green

  const content = `
  <g filter="url(#softShadow)">
    <rect x="52" y="50" width="${width - 104}" height="${height - 100}" rx="30" fill="url(#card)" stroke="url(#stroke)" stroke-width="2"/>
  </g>

  <rect x="72" y="72" width="${width - 144}" height="10" rx="5" fill="url(#accentBar)"/>

  <!-- Status panel -->
  <g>
    <rect x="86" y="120" width="${width - 172}" height="110" rx="26" fill="#0b0b14" stroke="${accent}" stroke-opacity="0.35" stroke-width="2" filter="url(#cardShadow)"/>
    <circle cx="140" cy="175" r="26" fill="${accent}" opacity="0.92"/>
    <path d="M128 176l8 8 20-24" stroke="#0a0a0a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <rect x="190" y="156" width="200" height="10" rx="5" fill="#ffffff" opacity="0.16"/>
    <rect x="190" y="178" width="250" height="8" rx="4" fill="#ffffff" opacity="0.09"/>
    <rect x="190" y="196" width="180" height="8" rx="4" fill="#ffffff" opacity="0.06"/>
  </g>

  <!-- Services list -->
  <g>
    <rect x="86" y="250" width="${width - 172}" height="132" rx="24" fill="#0b0b14" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5" filter="url(#cardShadow)"/>

    <circle cx="120" cy="284" r="6" fill="${accent}" opacity="0.9"/>
    <rect x="138" y="278" width="160" height="10" rx="5" fill="#ffffff" opacity="0.14"/>
    <rect x="${width - 210}" y="276" width="84" height="18" rx="9" fill="${accent}" opacity="0.18"/>
    <rect x="${width - 198}" y="282" width="44" height="6" rx="3" fill="${accent}" opacity="0.7"/>

    <circle cx="120" cy="322" r="6" fill="${accent}" opacity="0.8"/>
    <rect x="138" y="316" width="190" height="10" rx="5" fill="#ffffff" opacity="0.13"/>
    <rect x="${width - 210}" y="314" width="84" height="18" rx="9" fill="${accent}" opacity="0.16"/>
    <rect x="${width - 198}" y="320" width="44" height="6" rx="3" fill="${accent}" opacity="0.65"/>

    <circle cx="120" cy="360" r="6" fill="${accent}" opacity="0.7"/>
    <rect x="138" y="354" width="140" height="10" rx="5" fill="#ffffff" opacity="0.12"/>
    <rect x="${width - 210}" y="352" width="84" height="18" rx="9" fill="${accent}" opacity="0.14"/>
    <rect x="${width - 198}" y="358" width="44" height="6" rx="3" fill="${accent}" opacity="0.6"/>
  </g>`;

  return svgWrap({ width, height, accent, content });
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeImages(outDir: string, specs: ImageSpec[]) {
  await ensureDir(outDir);

  for (const spec of specs) {
    const svgBuffer = Buffer.from(spec.svg);
    const pngPath = path.join(outDir, `${spec.baseName}.png`);
    const webpPath = path.join(outDir, `${spec.baseName}.webp`);

    await sharp(svgBuffer)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(pngPath);

    await sharp(svgBuffer)
      .webp({ quality: 82, effort: 6 })
      .toFile(webpPath);

    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath),
    ]);

    // eslint-disable-next-line no-console
    console.log(
      `${spec.baseName}: png=${Math.round(pngStat.size / 1024)}KB webp=${Math.round(
        webpStat.size / 1024
      )}KB`
    );
  }
}

async function main() {
  const outDir = path.join(process.cwd(), "public/images/easyclaw");

  const specs: ImageSpec[] = [
    {
      baseName: "use-case-1-briefings",
      width: 800,
      height: 600,
      svg: makeBriefingsSvg(800, 600),
    },
    {
      baseName: "use-case-2-support",
      width: 800,
      height: 600,
      svg: makeSupportSvg(800, 600),
    },
    {
      baseName: "use-case-3-automation",
      width: 800,
      height: 600,
      svg: makeAutomationSvg(800, 600),
    },
    {
      baseName: "step-1-models",
      width: 600,
      height: 400,
      svg: makeModelsSvg(600, 400),
    },
    {
      baseName: "step-2-channels",
      width: 600,
      height: 400,
      svg: makeChannelsSvg(600, 400),
    },
    {
      baseName: "step-3-deploy",
      width: 600,
      height: 400,
      svg: makeDeploySvg(600, 400),
    },
  ];

  await writeImages(outDir, specs);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

