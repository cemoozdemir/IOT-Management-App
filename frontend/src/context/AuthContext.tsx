import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api/config";

interface AuthContextType {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const login = async (email: string, password: string) => {
    const url = `${API_BASE_URL}/auth/login`;

    try {
      const response = await axios.post(url, {
        email,
        password,
      });

      const newToken = response.data.token;

      if (typeof newToken !== "string" || newToken.length === 0) {
        throw new Error("Authentication response did not include a token");
      }

      localStorage.setItem("token", newToken);
      setToken(newToken);
    } catch (error) {
      localStorage.removeItem("token");
      setToken(null);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    const url = `${API_BASE_URL}/auth/register`;

    try {
      const response = await axios.post(url, {
        email,
        password,
      });

      const newToken = response.data.token;

      if (typeof newToken !== "string" || newToken.length === 0) {
        throw new Error("Authentication response did not include a token");
      }

      localStorage.setItem("token", newToken);
      setToken(newToken);
    } catch (error) {
      localStorage.removeItem("token");
      setToken(null);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  useEffect(() => {
    axios.defaults.headers.common["Authorization"] = token
      ? `Bearer ${token}`
      : "";
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
