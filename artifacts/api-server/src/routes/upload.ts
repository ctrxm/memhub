import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync, existsSync, unlink } from "fs";
import { authenticate } from "../lib/auth.js";
import { uploadToHuggingFace, checkHuggingFaceConfig } from "../lib/huggingface.js";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Supported: JPG, PNG, GIF, WEBP, MP4"));
    }
  },
});

// POST /upload/image — upload to HuggingFace Datasets
router.post("/image", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Bad Request", message: "No file uploaded" });
      return;
    }

    const filename = req.file.filename;
    const localPath = req.file.path;
    let url: string;
    let storage: "huggingface" | "local" = "local";

    try {
      url = await uploadToHuggingFace(localPath, filename, req.file.mimetype);
      storage = "huggingface";

      // Delete local temp file after successful HF upload
      unlink(localPath, (err) => {
        if (err) console.warn("[Upload] Could not delete local temp file:", err.message);
      });
    } catch (hfErr) {
      console.error("[Upload] HF upload failed, keeping local file as fallback:", hfErr);
      url = `/api/uploads/${filename}`;
    }

    res.json({ url, filename, storage });
  } catch (err) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Upload failed" });
  }
});

// GET /upload/status — check HuggingFace configuration status
router.get("/status", authenticate, async (_req, res) => {
  try {
    const status = await checkHuggingFaceConfig();
    res.json({
      huggingface: status,
      localFallback: true,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
