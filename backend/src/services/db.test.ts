import test from "node:test";
import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import { buildPgPoolConfig, createDbApi } from "../db/index.js";

type FakeDbClient = {
  query: (sql: string) => Promise<unknown>;
  release: () => void;
};

const createFakeDbClient = ({
  calls,
  rollbackError,
}: {
  calls: string[];
  rollbackError?: Error;
}): FakeDbClient =>
  ({
    async query(sql: string) {
      calls.push(sql);
      if (sql === "ROLLBACK" && rollbackError) {
        throw rollbackError;
      }
      return {};
    },
    release() {
      calls.push("RELEASE");
    },
  });

test("buildPgPoolConfig uses the shared hardened connection settings", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://example:test@example.com:5432/easyclaw";

  try {
    const config = buildPgPoolConfig();

    assert.equal(config.connectionString, process.env.DATABASE_URL);
    assert.equal(config.keepAlive, true);
    assert.equal(config.keepAliveInitialDelayMillis, 10_000);
    assert.equal(config.connectionTimeoutMillis, 10_000);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test("createDbApi.withClient commits successful transactions", async () => {
  const calls: string[] = [];
  const client = createFakeDbClient({ calls });
  const dbApi = createDbApi({
    query: async () => {
      throw new Error("query should not be called in this test");
    },
    connect: async () => {
      calls.push("CONNECT");
      return client as unknown as PoolClient;
    },
  });

  const result = await dbApi.withClient(async (connectedClient) => {
    calls.push("FN");
    assert.equal(connectedClient, client);
    return "ok";
  });

  assert.equal(result, "ok");
  assert.deepEqual(calls, ["CONNECT", "BEGIN", "FN", "COMMIT", "RELEASE"]);
});

test("createDbApi.withClient rethrows the original error after a successful rollback", async () => {
  const calls: string[] = [];
  const client = createFakeDbClient({ calls });
  const originalError = new Error("boom");
  const dbApi = createDbApi({
    query: async () => {
      throw new Error("query should not be called in this test");
    },
    connect: async () => {
      calls.push("CONNECT");
      return client as unknown as PoolClient;
    },
  });

  await assert.rejects(
    () =>
      dbApi.withClient(async () => {
        calls.push("FN");
        throw originalError;
      }),
    (error) => {
      assert.equal(error, originalError);
      return true;
    }
  );

  assert.deepEqual(calls, ["CONNECT", "BEGIN", "FN", "ROLLBACK", "RELEASE"]);
});

test("createDbApi.withClient preserves the original error when rollback also fails", async () => {
  const calls: string[] = [];
  const client = createFakeDbClient({
    calls,
    rollbackError: new Error("rollback failed"),
  });
  const originalError = new Error("boom");
  const dbApi = createDbApi({
    query: async () => {
      throw new Error("query should not be called in this test");
    },
    connect: async () => {
      calls.push("CONNECT");
      return client as unknown as PoolClient;
    },
  });

  await assert.rejects(
    () =>
      dbApi.withClient(async () => {
        calls.push("FN");
        throw originalError;
      }),
    (error) => {
      assert.equal(error, originalError);
      return true;
    }
  );

  assert.deepEqual(calls, ["CONNECT", "BEGIN", "FN", "ROLLBACK", "RELEASE"]);
});
