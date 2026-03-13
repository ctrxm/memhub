import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync, existsSync } from "fs";
import { authenticate } from "../lib/auth.js";
import { uploadToHuggingFace } from "../lib/huggingface.js";

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
      cb(new Error("File type not allowed"));
    }
  },
});

router.post("/image", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Bad Request", message: "No file uploaded" });
      return;
    }

    const filename = req.file.filename;
    let url: string;

    try {
      url = await uploadToHuggingFace(req.file.path, filename, req.file.mimetype);
    } catch (hfErr) {
      console.error("HF upload failed, using local fallback:", hfErr);
      url = `/api/uploads/${filename}`;
    }

    res.json({ url, filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Upload failed" });
  }
});

export default router;
