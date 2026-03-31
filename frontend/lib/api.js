import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach user-id header to every request if available
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("user_id");
  if (userId) {
    config.headers["user-id"] = userId;
  }
  return config;
});

// Upload invoice file
export async function uploadInvoice(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percent);
      }
    },
  });
  return response.data;
}

// Get all documents for current user
export async function getDocuments() {
  const response = await api.get("/api/documents");
  return response.data;
}

// Get single document by ID
export async function getDocument(id) {
  const response = await api.get(`/api/documents/${id}`);
  return response.data;
}

// Get audit stats
export async function getAuditStats() {
  const response = await api.get("/api/audit/stats");
  return response.data;
}