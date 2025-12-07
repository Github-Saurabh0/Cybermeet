import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import RoomJoin from "./RoomJoin.jsx";
import VideoRoom from "./VideoRoom.jsx";
import ChatRoom from "./ChatRoom.jsx";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [room, setRoom] = useState(null);

  return (
    <div className="app-layout">
      <header className="topbar">
        <div>
          <strong>Meet & Chat</strong>
        </div>
        <div>
          <span>Hi, {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {!room ? (
        <RoomJoin onRoomSelected={setRoom} />
      ) : (
        <div className="app-body">
          <div className="left-pane">
            <VideoRoom roomId={room.code} userName={user.name} />
          </div>
          <div className="right-pane">
            <ChatRoom roomId={room.code} userName={user.name} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
