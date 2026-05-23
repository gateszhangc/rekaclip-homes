export const DB_WRITE_FREEZE_ERROR_CODE = "DB_WRITE_FREEZE";
export const DB_WRITE_FREEZE_MESSAGE =
  "Database writes are temporarily paused for maintenance. Please retry in a few minutes.";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class DbWriteFreezeError extends Error {
  code = DB_WRITE_FREEZE_ERROR_CODE;
  statusCode = 503;
  scope?: string;

  constructor(scope?: string) {
    super(DB_WRITE_FREEZE_MESSAGE);
    this.name = "DbWriteFreezeError";
    this.scope = scope;
  }
}

export function isDbWriteFreezeEnabled() {
  return (process.env.DB_WRITE_FREEZE || "").trim().toLowerCase() === "true";
}

export function isWriteMethod(method?: string | null) {
  return WRITE_METHODS.has((method || "").toUpperCase());
}

export function getDbWriteFreezePayload() {
  return {
    code: -1,
    message: DB_WRITE_FREEZE_MESSAGE,
    error: DB_WRITE_FREEZE_MESSAGE,
    error_code: DB_WRITE_FREEZE_ERROR_CODE,
    errorCode: DB_WRITE_FREEZE_ERROR_CODE,
  };
}

export function createDbWriteFreezeResponse() {
  return Response.json(getDbWriteFreezePayload(), { status: 503 });
}

export function assertDbWriteAllowed(scope?: string) {
  if (isDbWriteFreezeEnabled()) {
    throw new DbWriteFreezeError(scope);
  }
}

export function isDbWriteFreezeError(error: unknown): error is DbWriteFreezeError {
  return error instanceof DbWriteFreezeError;
}
