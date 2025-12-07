import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const RoomJoin = ({ onRoomSelected }) => {
  const { token, API_BASE } = useAuth();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const axiosAuth = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  });

  const createRoom = async () => {
    try {
      setError("");
      const res = await axiosAuth.post("/api/rooms", { name });
      onRoomSelected(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const joinRoom = async () => {
    try {
      setError("");
      const res = await axiosAuth.get(`/api/rooms/by-code/${joinCode}`);
      onRoomSelected(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
    }
  };

  return (
    <div className="room-join">
      <div className="room-card">
        <h2>Create a new meeting</h2>
        <input
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={createRoom}>Create & Join</button>
      </div>

      <div className="room-card">
        <h2>Join with code</h2>
        <input
          placeholder="Enter room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        />
        <button onClick={joinRoom}>Join</button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default RoomJoin;
