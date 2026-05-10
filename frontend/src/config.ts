// Use current host for API calls when accessed from external devices
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:3000';
  // Use Tailscale IP so it works from inside and outside the house
  return 'http://100.108.219.83:3001';
};

export const API_URL = getApiUrl();
