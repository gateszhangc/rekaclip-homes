import test from "node:test";
import assert from "node:assert/strict";
import {
  DB_WRITE_FREEZE_ERROR_CODE,
  DB_WRITE_FREEZE_MESSAGE,
  getDbWriteFreezePayload,
  isDbWriteFreezeEnabled,
  isWriteMethod,
} from "./db-write-freeze.js";

const ORIGINAL_DB_WRITE_FREEZE = process.env.DB_WRITE_FREEZE;

test.afterEach(() => {
  if (ORIGINAL_DB_WRITE_FREEZE === undefined) {
    delete process.env.DB_WRITE_FREEZE;
    return;
  }

  process.env.DB_WRITE_FREEZE = ORIGINAL_DB_WRITE_FREEZE;
});

test("isWriteMethod only accepts mutating methods", () => {
  assert.equal(isWriteMethod("POST"), true);
  assert.equal(isWriteMethod("delete"), true);
  assert.equal(isWriteMethod("GET"), false);
});

test("isDbWriteFreezeEnabled reads DB_WRITE_FREEZE", () => {
  process.env.DB_WRITE_FREEZE = "true";
  assert.equal(isDbWriteFreezeEnabled(), true);

  process.env.DB_WRITE_FREEZE = "false";
  assert.equal(isDbWriteFreezeEnabled(), false);
});

test("getDbWriteFreezePayload returns a stable response body", () => {
  assert.deepEqual(getDbWriteFreezePayload(), {
    error: DB_WRITE_FREEZE_MESSAGE,
    message: DB_WRITE_FREEZE_MESSAGE,
    error_code: DB_WRITE_FREEZE_ERROR_CODE,
    errorCode: DB_WRITE_FREEZE_ERROR_CODE,
  });
});
