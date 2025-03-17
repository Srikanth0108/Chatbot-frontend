// client/src/services/api.js
import axios from "axios";
import { getFromLocalStorage } from "../utils/localStorage";

const API_URL = import.meta.env.VITE_API_URL + "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get user from localStorage
    const user = getFromLocalStorage("user");

    // If user exists and has a token, add it to the request headers
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/')) {
        // Clear user data from localStorage
        localStorage.removeItem("user");
        localStorage.removeItem("chatHistory");
        
        // Redirect to login page
        window.location.href = "/";
      }
    }

    // Global error handling
    console.error("API Error:", error.response?.data || error);
    return Promise.reject(error);
  }
);

export default api;
