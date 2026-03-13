import { readFile } from "fs/promises";

function getConfig() {
  return {
    token: process.env.HUGGINGFACE_TOKEN || "",
    repo: process.env.HUGGINGFACE_REPO || "",
  };
}

/**
 * Upload a file to Hugging Face Datasets using the Commit API (base64 content).
 * POST https://huggingface.co/api/datasets/{repo}/commit/{branch}
 * with JSON body containing the file as base64.
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

  // Commit API — directly embed file as base64 in the commit body
  const commitUrl = `https://huggingface.co/api/datasets/${repo}/commit/main`;
  const commitBody = {
    summary: `Upload meme: ${filename}`,
    files: [
      {
        path: filename,
        content: fileBuffer.toString("base64"),
        encoding: "base64",
      },
    ],
  };

  const commitRes = await fetch(commitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commitBody),
  });

  if (!commitRes.ok) {
    const errText = await commitRes.text();
    console.error(`[HuggingFace] Commit failed (${commitRes.status}):`, errText.substring(0, 400));
    throw new Error(`HuggingFace commit failed (${commitRes.status}): ${errText.substring(0, 200)}`);
  }

  const commitResult = await commitRes.json() as any;
  console.log(`[HuggingFace] Commit success. oid: ${commitResult?.commitOid}`);

  // Public CDN URL — use ?download=true to force direct download/serve
  const cdnUrl = `https://huggingface.co/datasets/${repo}/resolve/main/${filename}`;
  console.log(`[HuggingFace] File URL: ${cdnUrl}`);
  return cdnUrl;
}

/**
 * Get the public CDN URL for a file in the HF dataset repo.
 */
export function getHuggingFaceFileUrl(filename: string): string {
  const { repo } = getConfig();
  if (!repo) return `/api/uploads/${filename}`;
  return `https://huggingface.co/datasets/${repo}/resolve/main/${filename}`;
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
    const res = await fetch(`https://huggingface.co/api/datasets/${repo}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return { configured: false, repo, error: `Repo check failed (${res.status}): ${text.substring(0, 200)}` };
    }

    return { configured: true, repo };
  } catch (err: any) {
    return { configured: false, repo, error: err.message };
  }
}
