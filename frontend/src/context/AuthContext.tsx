import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

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
    const url = `${process.env.REACT_APP_API_URL}/auth/login`;
    console.log("Login request URL:", url); // URL'yi konsola yazdır

    try {
      const response = await axios.post(url, {
        email,
        password,
      });

      const newToken = response.data.token;
      localStorage.setItem("token", newToken);
      setToken(newToken);
    } catch (error) {
      console.error("Login error:", error); // Hata durumunda loglama
    }
  };

  const signup = async (email: string, password: string) => {
    const url = `${process.env.REACT_APP_API_URL}/auth/register`;
    console.log("Signup request URL:", url); // URL'yi konsola yazdır

    try {
      const response = await axios.post(url, {
        email,
        password,
        role: "user",
      });

      const newToken = response.data.token;
      localStorage.setItem("token", newToken);
      setToken(newToken);
    } catch (error) {
      console.error("Signup error:", error); // Hata durumunda loglama
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  useEffect(() => {
    console.log("Current API URL:", process.env.REACT_APP_API_URL); // .env.production'dan API URL'sini kontrol et
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
