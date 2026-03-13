// Intercept all global fetch calls to inject the Authorization header
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem('ovrhub_token') || localStorage.getItem('memehub_token');

  if (token) {
    const existingHeaders = new Headers(config?.headers);
    existingHeaders.set('Authorization', `Bearer ${token}`);

    args[1] = {
      ...(config || {}),
      headers: existingHeaders,
    };
  }

  return originalFetch(...args);
};

export {};
