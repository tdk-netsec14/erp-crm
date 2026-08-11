import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { api, setAccessToken } from "../../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on page load using stored refresh token
  useEffect(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/v1";
    axios
      .post(`${baseUrl}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      })
      .catch(() => {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api.auth.login({ email, password });
    setAccessToken(data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await api.auth.logout(refreshToken);
      } catch {
        // ignore errors, we're logging out anyway
      }
    }
    setAccessToken(null);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
