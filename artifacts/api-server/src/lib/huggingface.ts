import { readFile } from "fs/promises";
import { uploadFiles, whoAmI } from "@huggingface/hub";

function getConfig() {
  return {
    token: process.env.HUGGINGFACE_TOKEN || "",
    repo: process.env.HUGGINGFACE_REPO || "",
  };
}

/**
 * Upload a file to Hugging Face Datasets using @huggingface/hub.
 * This handles XET storage automatically.
 */
export async function uploadToHuggingFace(
  filePath: string,
  filename: string,
  mimeType: string
): Promise<string> {
  const { token, repo } = getConfig();

  if (!token || !repo) {
    console.warn("[HuggingFace] Token or repo not configured, using local fallback.");
    return `/api/uploads/${filename}`;
  }

  const fileBuffer = await readFile(filePath);
  if (fileBuffer.byteLength === 0) {
    throw new Error("File is empty, cannot upload.");
  }

  console.log(`[HuggingFace] Uploading ${filename} (${fileBuffer.byteLength} bytes) to ${repo}...`);

  const credentials = { accessToken: token };

  await uploadFiles({
    repo: { type: "dataset", name: repo },
    credentials,
    commitTitle: `Upload meme: ${filename}`,
    files: [
      {
        path: filename,
        content: new Blob([fileBuffer], { type: mimeType }),
      },
    ],
  });

  // Return a proxy URL so the browser doesn't need to authenticate with HuggingFace directly
  const proxyUrl = `/api/hf-proxy/${filename}`;
  console.log(`[HuggingFace] Upload success! Proxy URL: ${proxyUrl}`);
  return proxyUrl;
}

/**
 * Get the proxy URL for a file in the HF dataset repo.
 * Uses the server-side proxy so browsers don't need to authenticate with HF directly.
 */
export function getHuggingFaceFileUrl(filename: string): string {
  const { repo } = getConfig();
  if (!repo) return `/api/uploads/${filename}`;
  return `/api/hf-proxy/${filename}`;
}

/**
 * Check if HuggingFace is configured and reachable.
 */
export async function checkHuggingFaceConfig(): Promise<{
  configured: boolean;
  repo: string;
  error?: string;
}> {
  const { token, repo } = getConfig();

  if (!token || !repo) {
    return { configured: false, repo: repo || "", error: "HUGGINGFACE_TOKEN or HUGGINGFACE_REPO not set" };
  }

  try {
    await whoAmI({ credentials: { accessToken: token } });
    return { configured: true, repo };
  } catch (err: any) {
    return { configured: false, repo, error: err.message };
  }
}
