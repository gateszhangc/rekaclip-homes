import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  // Keep both fields for backward compatibility across existing scripts/docs.
  res.json({ status: "ok", ok: true });
});

export default router;
