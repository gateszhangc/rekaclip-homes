export const DB_WRITE_FREEZE_ERROR_CODE = "DB_WRITE_FREEZE";
export const DB_WRITE_FREEZE_MESSAGE =
  "Database writes are temporarily paused for maintenance. Please retry in a few minutes.";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isDbWriteFreezeEnabled() {
  return (process.env.DB_WRITE_FREEZE || "").trim().toLowerCase() === "true";
}

export function isWriteMethod(method?: string | null) {
  return WRITE_METHODS.has((method || "").toUpperCase());
}

export function getDbWriteFreezePayload() {
  return {
    error: DB_WRITE_FREEZE_MESSAGE,
    message: DB_WRITE_FREEZE_MESSAGE,
    error_code: DB_WRITE_FREEZE_ERROR_CODE,
    errorCode: DB_WRITE_FREEZE_ERROR_CODE,
  };
}
