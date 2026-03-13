import { createReadStream } from "fs";
import path from "path";

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || "";
const HF_REPO = process.env.HUGGINGFACE_REPO || "";

export async function uploadToHuggingFace(
  filePath: string,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!HF_TOKEN || !HF_REPO) {
    // Fallback: return a placeholder URL if HF not configured
    // In dev mode, serve files locally
    return `/uploads/${filename}`;
  }

  const fileBuffer = await import("fs/promises").then(fs => fs.readFile(filePath));
  
  const uploadUrl = `https://huggingface.co/api/datasets/${HF_REPO}/upload/main`;
  
  const response = await fetch(`https://huggingface.co/api/datasets/${HF_REPO}/upload/main`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": mimeType,
      "X-Filename": filename,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace upload failed: ${error}`);
  }

  const result = await response.json() as { url: string };
  // Return the raw CDN URL
  return `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${filename}`;
}

export function getHuggingFaceFileUrl(filename: string): string {
  if (!HF_REPO) return `/uploads/${filename}`;
  return `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${filename}`;
}
