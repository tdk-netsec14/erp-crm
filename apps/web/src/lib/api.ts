import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Access token lives in memory so it's not accessible to JS on the page (XSS protection)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On 401, try one silent refresh before giving up
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        setAccessToken(null);
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        setAccessToken(null);
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// API methods used across the app
export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      apiClient.post("/auth/login", data).then((r) => r.data),
    logout: (refreshToken: string) =>
      apiClient.post("/auth/logout", { refreshToken }).then((r) => r.data),
  },

  dashboard: {
    getMetrics: () => apiClient.get("/dashboard").then((r) => r.data),
  },

  customers: {
    list: (params?: Record<string, string>) =>
      apiClient.get("/customers", { params }).then((r) => r.data),
    get: (id: string) => apiClient.get(`/customers/${id}`).then((r) => r.data),
    create: (data: unknown) => apiClient.post("/customers", data).then((r) => r.data),
    update: (id: string, data: unknown) => apiClient.put(`/customers/${id}`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/customers/${id}`).then((r) => r.data),
    listFollowUps: (id: string) =>
      apiClient.get(`/customers/${id}/follow-ups`).then((r) => r.data),
    addFollowUp: (id: string, data: { note: string }) =>
      apiClient.post(`/customers/${id}/follow-ups`, data).then((r) => r.data),
  },

  products: {
    list: (params?: Record<string, string>) =>
      apiClient.get("/products", { params }).then((r) => r.data),
    get: (id: string) => apiClient.get(`/products/${id}`).then((r) => r.data),
    create: (data: unknown) => apiClient.post("/products", data).then((r) => r.data),
    update: (id: string, data: unknown) => apiClient.put(`/products/${id}`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/products/${id}`).then((r) => r.data),
    listStockMovements: (id: string) =>
      apiClient.get(`/products/${id}/stock-movements`).then((r) => r.data),
    addStockMovement: (id: string, data: unknown) =>
      apiClient.post(`/products/${id}/stock-movements`, data).then((r) => r.data),
  },

  challans: {
    list: (params?: Record<string, string>) =>
      apiClient.get("/challans", { params }).then((r) => r.data),
    get: (id: string) => apiClient.get(`/challans/${id}`).then((r) => r.data),
    create: (data: unknown) => apiClient.post("/challans", data).then((r) => r.data),
    update: (id: string, data: unknown) => apiClient.put(`/challans/${id}`, data).then((r) => r.data),
    confirm: (id: string) => apiClient.post(`/challans/${id}/confirm`).then((r) => r.data),
    cancel: (id: string) => apiClient.post(`/challans/${id}/cancel`).then((r) => r.data),
  },
};
