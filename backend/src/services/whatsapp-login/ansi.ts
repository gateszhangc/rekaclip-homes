const ANSI_ESCAPE_PATTERN =
  // Matches CSI, OSC, and single-character C1 escape sequences.
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export const toPlainTerminalOutput = (rawOutput: string): string =>
  rawOutput
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(ANSI_ESCAPE_PATTERN, "");
