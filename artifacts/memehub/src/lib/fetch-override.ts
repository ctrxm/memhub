// Intercept all global fetch calls to inject the Authorization header
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem('memehub_token');
  
  if (token) {
    if (config) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
    } else {
      args[1] = { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      };
    }
  }
  
  return originalFetch(...args);
};

export {};
