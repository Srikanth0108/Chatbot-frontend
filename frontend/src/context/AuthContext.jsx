// client/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { saveToLocalStorage, getFromLocalStorage } from "../utils/localStorage";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  useEffect(() => {
  // Check if user is already logged in
  const storedUser = getFromLocalStorage("user");
  if (storedUser) {
    setCurrentUser(storedUser);
    setIsAuthenticated(true);

    // Set authorization header for future API calls
    api.interceptors.request.use(
      (config) => {
        // Add auth token to headers if it exists
        if (storedUser.token) {
          config.headers.Authorization = `Bearer ${storedUser.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }
  setIsInitializing(false); // Add this line to mark initialization complete
}, []);


const login = async (email, password) => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await api.post("/login", { email, password });
    const userData = response.data.user;

    // Store user data in context and localStorage
    setCurrentUser(userData);
    setIsAuthenticated(true);
    saveToLocalStorage("user", userData);

    setIsLoading(false);
    return true;
  } catch (error) {
    setIsLoading(false);
    // Get the error message from the response
    const errorMessage =
      error.response?.data?.error || "Login failed. Please try again.";
    console.log("Login error caught:", errorMessage);
    setError(errorMessage);
    return false;
  }
};

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/register", userData);
      const newUser = response.data.user;

      // Store user data in context and localStorage
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      saveToLocalStorage("user", newUser);

      // Set authorization header for future API calls
      if (newUser.token) {
        api.interceptors.request.use(
          (config) => {
            config.headers.Authorization = `Bearer ${newUser.token}`;
            return config;
          },
          (error) => {
            return Promise.reject(error);
          }
        );
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error.response?.data?.error || "Registration failed. Please try again.";
      setError(errorMessage);
      return false;
    }
  };

  const logout = () => {
    // Clear user data from context and localStorage
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("chatHistory");

    // Remove authorization header
    api.interceptors.request.use(
      (config) => {
        if (config.headers.Authorization) {
          delete config.headers.Authorization;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  };

  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.put(`/users/${currentUser.id}`, profileData);
      const updatedUser = response.data.user;

      // Update user data in context and localStorage
      setCurrentUser(updatedUser);
      saveToLocalStorage("user", updatedUser);

      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        "Profile update failed. Please try again.";
      setError(errorMessage);
      return false;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/users/${currentUser.id}/password`, {
        currentPassword,
        newPassword,
      });

      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        "Password change failed. Please try again.";
      setError(errorMessage);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        isInitializing,
        error,
        login,
        logout,
        register,
        updateProfile,
        changePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
