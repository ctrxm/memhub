import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const env = {
    database: !!(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL),
    huggingface: !!process.env.HUGGINGFACE_TOKEN,
    nodeEnv: process.env.NODE_ENV || "development",
  };
  res.json({ status: "ok", env });
});

export default router;
