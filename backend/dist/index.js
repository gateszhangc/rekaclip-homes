import express from "express";
import cors from "cors";
import "./load-env.js";
import deployRouter from "./routes/deploy.js";
import healthRouter from "./routes/health.js";
import adminAccountsRouter from "./routes/admin-accounts.js";
import runtimeConfigRouter from "./routes/runtime-config.js";
import { startOpenClawRuntimeBackgroundTasks } from "./services/runtime.js";
import { logger, requestLogger } from "./utils/logger.js";
import { getDbWriteFreezePayload, isDbWriteFreezeEnabled, isWriteMethod, } from "./utils/db-write-freeze.js";
const app = express();
app.use(cors());
// Codex auth.json can be large (JWTs). Keep this comfortably above typical sizes.
app.use(express.json({ limit: "5mb" }));
// 请求日志中间件
app.use(requestLogger);
app.use((req, res, next) => {
    if (!isDbWriteFreezeEnabled() || !isWriteMethod(req.method) || req.path === "/health") {
        return next();
    }
    logger.warn({ path: req.path, method: req.method }, "Rejected write request while DB_WRITE_FREEZE is enabled");
    return res.status(503).json(getDbWriteFreezePayload());
});
app.use("/health", healthRouter);
app.use("/api/deploy", deployRouter);
app.use("/api/admin/accounts", adminAccountsRouter);
app.use("/api/runtime", runtimeConfigRouter);
// Ensure errors are consistently returned as JSON (important for the admin import UI).
app.use((err, req, res, _next) => {
    if (err?.type === "entity.too.large") {
        logger.warn({ path: req.path }, "Request body too large");
        return res.status(413).json({ error: "Request body too large" });
    }
    if (err instanceof SyntaxError) {
        logger.warn({ path: req.path }, "Invalid JSON");
        return res.status(400).json({ error: "Invalid JSON" });
    }
    logger.error({ error: err, path: req.path }, "Unhandled error");
    return res.status(500).json({ error: "Internal server error" });
});
const port = Number(process.env.PORT || 5000);
app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Backend started");
    startOpenClawRuntimeBackgroundTasks();
});
