// Intercept all global fetch calls to:
// 1. Inject Authorization header from localStorage token
// 2. Prefix relative /api/ calls with VITE_API_URL when set (needed for Cloudflare Pages + external backend)
const originalFetch = window.fetch;

const EXTERNAL_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('ovrhub_token') || localStorage.getItem('memehub_token');

  // Prefix relative /api/ and /uploads/ paths with external API URL if set
  if (EXTERNAL_API && typeof resource === "string" && (resource.startsWith("/api/") || resource.startsWith("/uploads/"))) {
    resource = `${EXTERNAL_API}${resource}`;
  }

  if (token) {
    const existingHeaders = new Headers(config?.headers);
    existingHeaders.set('Authorization', `Bearer ${token}`);
    config = {
      ...(config || {}),
      headers: existingHeaders,
    };
  }

  return originalFetch(resource, config);
};

export {};
