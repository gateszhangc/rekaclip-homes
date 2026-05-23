import { Router } from "express";
import { z } from "zod";
import { getOpenClawHomepageProviderModeOverride, resolveOpenClawHomepageProviderMode, setOpenClawHomepageProviderModeOverride, } from "../services/docker.js";
import { logger } from "../utils/logger.js";
const router = Router();
const homepageModeInputSchema = z.union([
    z.object({ clear: z.literal(true) }),
    z.object({
        mode: z.enum(["openrouter", "mixed", "kie"]),
    }),
]);
function allowRuntimeModeMutation(req) {
    const token = process.env.BACKEND_RUNTIME_ADMIN_TOKEN?.trim();
    if (!token) {
        if (process.env.NODE_ENV === "production") {
            return false;
        }
        logger.warn({ path: req.path }, "BACKEND_RUNTIME_ADMIN_TOKEN unset: allowing homepage provider mode mutation (non-production only)");
        return true;
    }
    const auth = req.headers.authorization?.trim();
    return auth === `Bearer ${token}`;
}
router.get("/homepage-provider-mode", (_req, res) => {
    const mode = resolveOpenClawHomepageProviderMode();
    const override = getOpenClawHomepageProviderModeOverride();
    res.json({
        mode,
        source: override !== null ? "memory" : "env",
        env: process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE ?? null,
    });
});
router.put("/homepage-provider-mode", (req, res) => {
    if (!allowRuntimeModeMutation(req)) {
        return res.status(401).json({
            error: "Unauthorized. Set BACKEND_RUNTIME_ADMIN_TOKEN and send Authorization: Bearer <token>, or run outside production with the token unset.",
        });
    }
    const parsed = homepageModeInputSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid body",
            details: parsed.error.flatten(),
        });
    }
    const body = parsed.data;
    if ("clear" in body) {
        setOpenClawHomepageProviderModeOverride(null);
        logger.info("OPENCLAW homepage provider mode override cleared");
        return res.json({
            ok: true,
            mode: resolveOpenClawHomepageProviderMode(),
            source: "env",
        });
    }
    const normalized = body.mode === "openrouter" ? "openrouter" : "mixed";
    setOpenClawHomepageProviderModeOverride(normalized);
    logger.info({ mode: normalized }, "OPENCLAW homepage provider mode override set");
    return res.json({
        ok: true,
        mode: normalized,
        source: "memory",
    });
});
export default router;
