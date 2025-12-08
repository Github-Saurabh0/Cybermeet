import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import RoomJoin from "./RoomJoin.jsx";
import VideoRoom from "./VideoRoom.jsx";
import ChatRoom from "./ChatRoom.jsx";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [room, setRoom] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleLeaveRoom = () => {
    setRoom(null);
    setIsChatOpen(false);
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  return (
    <div className="app-layout">
      <header className="topbar">
        <div>
          <strong>CyberMeet</strong>
        </div>
        <div className="topbar-right">
          <span>Hi, {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {!room ? (
        <RoomJoin onRoomSelected={setRoom} />
      ) : (
        <div className="app-body">
          <div className="left-pane full-pane">
            <VideoRoom
              roomId={room.code}
              userName={user.name}
              onLeave={handleLeaveRoom}
              onToggleChat={handleToggleChat}
              isChatOpen={isChatOpen}
            />

            {isChatOpen && (
              <div className="chat-overlay">
                <div className="chat-overlay-header">
                  <span>Chat</span>
                  <button onClick={handleToggleChat}>✕</button>
                </div>
                <div className="chat-overlay-body">
                  <ChatRoom roomId={room.code} userName={user.name} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
