import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(API_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
};
