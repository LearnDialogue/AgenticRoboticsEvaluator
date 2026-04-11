"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "./api";

// User type
interface User {
  id: number;
  username: string;
  role: "student" | "admin";
  display_name: string | null;
  pronouns: string | null;
  tone_pref: string | null;
}

interface RawUser {
  id: number;
  username: string;
  role: string;
  display_name: string | null;
  pronouns: string | null;
  tone_pref: string | null;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    display_name?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(rawUser: RawUser): User {
  return {
    ...rawUser,
    role: rawUser.role.toLowerCase() === "admin" ? "admin" : "student",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for existing auth on mount (client-side only)
  useEffect(() => {
    if (!mounted) return;
    
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(normalizeUser(JSON.parse(storedUser) as RawUser));
      }
    } catch (error) {
      console.error("Error loading auth from storage:", error);
    }

    setIsLoading(false);
  }, [mounted]);

  // Login function
  const login = async (username: string, password: string) => {
    const { access_token } = await authApi.login(username, password);
    
    // Store token
    localStorage.setItem("token", access_token);
    setToken(access_token);

    // Fetch user info
    const userData = normalizeUser(await authApi.me());
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (payload: {
    username: string;
    password: string;
    display_name?: string;
  }) => {
    await authApi.register(payload);
    await login(payload.username, payload.password);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
