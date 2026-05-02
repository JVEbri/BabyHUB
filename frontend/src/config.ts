// Use current host for API calls when accessed from external devices
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:3000';
  // In production, use the same host but with port 3000
  return `${window.location.protocol}//${window.location.hostname}:3000`;
};

export const API_URL = getApiUrl();
