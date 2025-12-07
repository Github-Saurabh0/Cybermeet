import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext.jsx";

const ChatRoom = ({ roomId, userName }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-room", { roomId, userName });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-typing", ({ userName, isTyping }) => {
      setTypingUser(isTyping ? userName : null);
    });

    return () => {
      socket.off("receive-message");
      socket.off("user-typing");
    };
  }, [socket, roomId, userName]);

  const handleSend = () => {
    if (!input.trim()) return;
    socket.emit("send-message", { roomId, message: input });
    setInput("");
    socket.emit("typing", { roomId, isTyping: false });
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (socket) {
      socket.emit("typing", { roomId, isTyping: e.target.value.length > 0 });
    }
  };

  return (
    <div className="chat-container">
      <h3>Chat</h3>
      <div className="chat-messages">
        {messages.map((m, idx) => (
          <div key={idx} className="chat-message">
            <strong>{m.userName}:</strong> {m.message}
          </div>
        ))}
      </div>
      {typingUser && (
        <div className="typing-indicator">{typingUser} is typing...</div>
      )}
      <div className="chat-input">
        <input
          value={input}
          onChange={handleTyping}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatRoom;
