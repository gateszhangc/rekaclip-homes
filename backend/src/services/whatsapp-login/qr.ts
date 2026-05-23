import { WHATSAPP_QR_ANCHOR } from "./config.js";

const QR_LINE_PATTERN = /^[ \u2580\u2584\u2588]+$/u;
const QR_BLOCK_CHARACTER = /[\u2580\u2584\u2588]/u;
const MIN_QR_LINES = 8;

export type QrMatch = {
  anchorIndex: number;
  ascii: string;
};

export const extractLatestQrAscii = (plainOutput: string): QrMatch | null => {
  const normalized = plainOutput.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const anchorIndexes: number[] = [];
  let searchFrom = 0;

  while (searchFrom < normalized.length) {
    const foundAt = normalized.indexOf(WHATSAPP_QR_ANCHOR, searchFrom);
    if (foundAt === -1) {
      break;
    }
    anchorIndexes.push(foundAt);
    searchFrom = foundAt + WHATSAPP_QR_ANCHOR.length;
  }

  for (let index = anchorIndexes.length - 1; index >= 0; index -= 1) {
    const anchorIndex = anchorIndexes[index];
    const afterAnchor = normalized.slice(anchorIndex + WHATSAPP_QR_ANCHOR.length);
    const lines = afterAnchor.split("\n");
    const qrLines: string[] = [];
    let started = false;

    for (const line of lines) {
      if (!started && line.trim().length === 0) {
        continue;
      }

      if (line.trim().length === 0) {
        if (started) {
          break;
        }
        continue;
      }

      if (!QR_LINE_PATTERN.test(line) || !QR_BLOCK_CHARACTER.test(line)) {
        if (started) {
          break;
        }
        continue;
      }

      started = true;
      qrLines.push(line);
    }

    if (qrLines.length >= MIN_QR_LINES) {
      return {
        anchorIndex,
        ascii: qrLines.join("\n"),
      };
    }
  }

  return null;
};

const qrCharacterToCells = (character: string): [number, number] => {
  if (character === "█") {
    return [1, 1];
  }

  if (character === "▀") {
    return [1, 0];
  }

  if (character === "▄") {
    return [0, 1];
  }

  return [0, 0];
};

export const qrAsciiToSvgDataUrl = (qrAscii: string): string | null => {
  const lines = qrAscii.split("\n");
  if (lines.length === 0) {
    return null;
  }

  const width = Math.max(...lines.map((line) => line.length));
  if (width === 0) {
    return null;
  }

  const quietZone = 2;
  const height = lines.length * 2;
  const totalWidth = width + quietZone * 2;
  const totalHeight = height + quietZone * 2;
  const rects: string[] = [];

  lines.forEach((line, rowIndex) => {
    for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
      const [topCell, bottomCell] = qrCharacterToCells(line[columnIndex] ?? " ");
      const x = quietZone + columnIndex;
      const y = quietZone + rowIndex * 2;

      if (topCell === 1) {
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1" />`);
      }

      if (bottomCell === 1) {
        rects.push(`<rect x="${x}" y="${y + 1}" width="1" height="1" />`);
      }
    }
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" shape-rendering="crispEdges">`,
    `<rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />`,
    '<g fill="#000000">',
    ...rects,
    "</g>",
    "</svg>",
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
