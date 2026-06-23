import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 90000,
});

export const generateReport = async (payload, requestId) => {
  const response = await api.post("/reports", payload, {
    headers: requestId ? { "X-Request-Id": requestId } : undefined,
  });
  return response.data;
};

export const calculateSystem = async (payload) => {
  const response = await api.post("/calculations", payload);
  return response.data;
};

export const getApiHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const getAiProgress = async (requestId, signal) => {
  const response = await api.get(`/ai-progress/${requestId}`, { signal });
  return response.data;
};

export const searchLocations = async (query, signal) => {
  const response = await api.get("/locations", {
    params: { q: query },
    signal,
  });
  return response.data.results;
};

export default api;
