import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 90000,
});

function buildAiHeaders(requestId, aiSettings) {
  const headers = {};
  if (requestId) {
    headers["X-Request-Id"] = requestId;
  }

  if (aiSettings?.enabled) {
    headers["X-AI-Mode"] = "custom";
    headers["X-AI-Base-Url"] = aiSettings.baseUrl?.trim();
    headers["X-AI-Api-Key"] = aiSettings.apiKey?.trim();
    headers["X-AI-Model"] = aiSettings.model?.trim();
  }

  return Object.keys(headers).length ? headers : undefined;
}

export const generateReport = async (payload, requestId, aiSettings) => {
  const response = await api.post("/reports", payload, {
    headers: buildAiHeaders(requestId, aiSettings),
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
