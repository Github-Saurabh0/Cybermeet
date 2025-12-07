import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { API_BASE, token } = useAuth() || {};
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!API_BASE) return;
    const s = io(API_BASE, {
      transports: ["websocket", "polling"],
      auth: { token }
    });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [API_BASE, token]);

  const value = useMemo(() => ({ socket }), [socket]);
  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
