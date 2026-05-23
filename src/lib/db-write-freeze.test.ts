import { afterEach, describe, expect, it } from "vitest";
import {
  assertDbWriteAllowed,
  DB_WRITE_FREEZE_ERROR_CODE,
  DB_WRITE_FREEZE_MESSAGE,
  getDbWriteFreezePayload,
  isDbWriteFreezeEnabled,
  isWriteMethod,
} from "./db-write-freeze";

const ORIGINAL_DB_WRITE_FREEZE = process.env.DB_WRITE_FREEZE;

afterEach(() => {
  if (ORIGINAL_DB_WRITE_FREEZE === undefined) {
    delete process.env.DB_WRITE_FREEZE;
    return;
  }

  process.env.DB_WRITE_FREEZE = ORIGINAL_DB_WRITE_FREEZE;
});

describe("db write freeze", () => {
  it("detects mutating HTTP methods", () => {
    expect(isWriteMethod("POST")).toBe(true);
    expect(isWriteMethod("patch")).toBe(true);
    expect(isWriteMethod("GET")).toBe(false);
  });

  it("reads DB_WRITE_FREEZE from the environment", () => {
    process.env.DB_WRITE_FREEZE = "true";
    expect(isDbWriteFreezeEnabled()).toBe(true);

    process.env.DB_WRITE_FREEZE = "false";
    expect(isDbWriteFreezeEnabled()).toBe(false);
  });

  it("returns a stable payload", () => {
    expect(getDbWriteFreezePayload()).toMatchObject({
      code: -1,
      message: DB_WRITE_FREEZE_MESSAGE,
      error: DB_WRITE_FREEZE_MESSAGE,
      error_code: DB_WRITE_FREEZE_ERROR_CODE,
      errorCode: DB_WRITE_FREEZE_ERROR_CODE,
    });
  });

  it("throws when writes are frozen", () => {
    process.env.DB_WRITE_FREEZE = "true";

    expect(() => assertDbWriteAllowed("orders.insert")).toThrow(
      DB_WRITE_FREEZE_MESSAGE
    );
  });
});
