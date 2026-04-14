import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// API client with auth interceptor
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },
  register: async (payload: {
    username: string;
    password: string;
    display_name?: string;
  }) => {
    const response = await api.post("/auth/register", payload);
    return response.data;
  },
  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

// Sessions API
export const sessionsApi = {
  create: async () => {
    const response = await api.post("/sessions");
    return response.data;
  },
  list: async (page = 1, pageSize = 20) => {
    const response = await api.get("/sessions", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },
  get: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },
  getMessages: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/messages`);
    return response.data;
  },
  chat: async (sessionId: string, content: string) => {
    const response = await api.post(`/sessions/${sessionId}/chat`, { content });
    return response.data;
  },
  complete: async (sessionId: string) => {
    const response = await api.post(`/sessions/${sessionId}/complete`);
    return response.data;
  },
};

// Stages API
export const stagesApi = {
  get: async () => {
    const response = await api.get("/stages");
    return response.data;
  },
};

// Admin API
export const adminApi = {
  listStudents: async () => {
    const response = await api.get("/admin/students");
    return response.data;
  },
  listSessions: async (page = 1, pageSize = 50) => {
    const response = await api.get("/admin/sessions", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },
  getSessionMessages: async (sessionId: string) => {
    const response = await api.get(`/admin/sessions/${sessionId}/messages`);
    return response.data;
  },
  getSession: async (sessionId: string) => {
    const response = await api.get(`/admin/sessions/${sessionId}`);
    return response.data;
  },
};

// Health API
export const healthApi = {
  check: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};

export default api;
