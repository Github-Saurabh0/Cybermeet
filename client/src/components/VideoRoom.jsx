import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext.jsx";

const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VideoRoom = ({ roomId, userName }) => {
  const { socket } = useSocket();
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const peersRef = useRef({});
  const joinedRef = useRef(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Force mobile playback unlock
  useEffect(() => {
    const unlock = () => {
      document.querySelectorAll("video").forEach(v => {
        v.muted = false;
        v.play().catch(() => {});
      });
      document.body.removeEventListener("touchstart", unlock);
    };
    document.body.addEventListener("touchstart", unlock, { once: true });
  }, []);

  // Get camera + mic
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.log("media error", err);
      }
    };
    startMedia();
  }, []);

  // Signaling and WebRTC
  useEffect(() => {
    if (!socket || !localStream) return;

    if (!joinedRef.current) {
      socket.emit("join-room", { roomId, userName });
      joinedRef.current = true;
    }

    const createPeer = (remoteId, initiator) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("webrtc-ice-candidate", {
            to: remoteId,
            candidate,
          });
        }
      };

      pc.ontrack = ({ streams }) => {
        const stream = streams[0];
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteId]: stream,
        }));
      };

      if (initiator) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("webrtc-offer", {
            roomId,
            to: remoteId,
            offer,
          });
        };
      }

      return pc;
    };

    socket.on("user-joined", ({ socketId }) => {
      const pc = createPeer(socketId, true);
      peersRef.current[socketId] = pc;
    });

    socket.on("webrtc-offer", async ({ from, offer }) => {
      const pc = createPeer(from, false);
      peersRef.current[from] = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, answer });
    });

    socket.on("webrtc-answer", async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc-ice-candidate", ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ socketId }) => {
      const pc = peersRef.current[socketId];
      if (pc) pc.close();
      delete peersRef.current[socketId];
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
    });
  }, [socket, localStream, roomId, userName]);

  const toggleScreen = async () => {
    if (!isScreenSharing) {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert("Screen Share not supported on this device!");
        return;
      }
      const sstream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const track = sstream.getVideoTracks()[0];

      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender && sender.replaceTrack(track);
      });

      localVideoRef.current.srcObject = sstream;

      track.onended = () => stopScreen();
      setIsScreenSharing(true);
    } else stopScreen();
  };

  const stopScreen = () => {
    const camTrack = localStream?.getVideoTracks()[0];
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender && sender.replaceTrack(camTrack);
    });
    localVideoRef.current.srcObject = localStream;
    setIsScreenSharing(false);
  };

  return (
    <div className="video-room">
      <div className="video-header">
        <button onClick={toggleScreen}>
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>
      </div>

      <div className="video-grid">
        {/* Local */}
        <div className="video-tile">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", background: "#000" }}
          />
          <p>You</p>
        </div>

        {/* Remote */}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <RemoteVideo key={id} id={id} stream={stream} />
        ))}
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, id }) => {
  const ref = useRef(null);
  useEffect(() => {
    ref.current && (ref.current.srcObject = stream);
  }, [stream]);
  return (
    <div className="video-tile">
      <video
        ref={ref}
        autoPlay
        playsInline
        // don't mute remote
        muted={false}
        style={{ width: "100%", background: "#000" }}
      />
      <p>{id}</p>
    </div>
  );
};

export default VideoRoom;
