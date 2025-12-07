import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, {
      email,
      password
    });
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/register`, {
      name,
      email,
      password
    });
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const logout = () => {
    setUser(null);
    setToken("");
  };

  const value = { user, token, login, register, logout, API_BASE };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
