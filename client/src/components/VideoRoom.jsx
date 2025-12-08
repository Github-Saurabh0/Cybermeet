import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext.jsx";

const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VideoRoom = ({ roomId, userName, onLeave, onToggleChat, isChatOpen }) => {
  const { socket } = useSocket();
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const peersRef = useRef({});
  const joinedRef = useRef(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null); // "local" or socketId

  // 🔓 Mobile: unlock audio on first touch
  useEffect(() => {
    const unlock = () => {
      document.querySelectorAll("video").forEach((v) => {
        v.muted = v.dataset.islocal === "true"; // sirf local mute
        v.play().catch(() => {});
      });
      document.body.removeEventListener("touchstart", unlock);
    };
    document.body.addEventListener("touchstart", unlock, { once: true });
  }, []);

  // 🎥 Mic + Camera
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
        setActiveSpeakerId("local");
      } catch (err) {
        console.log("media error", err);
      }
    };
    startMedia();
  }, []);

  // 🔊 Active speaker detection (local only, lightweight)
  useEffect(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    let audioContext;
    let analyser;
    let source;
    let rafId;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);
      analyser.fftSize = 512;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length || 0;
        if (avg > 20) {
          setActiveSpeakerId("local");
        }
        rafId = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.log("AudioContext error:", e);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [localStream]);

  // 🔔 Remote speaker callback from RemoteVideo
  const handleRemoteSpeaking = useCallback((id, isSpeaking) => {
    if (isSpeaking) {
      setActiveSpeakerId(id);
    }
  }, []);

  // 🔁 WebRTC Signaling
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

    const handleUserJoined = ({ socketId }) => {
      if (peersRef.current[socketId]) return;
      const pc = createPeer(socketId, true);
      peersRef.current[socketId] = pc;
    };

    const handleOffer = async ({ from, offer }) => {
      const pc = createPeer(from, false);
      peersRef.current[from] = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleCandidate = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleUserLeft = ({ socketId }) => {
      const pc = peersRef.current[socketId];
      if (pc) pc.close();
      delete peersRef.current[socketId];
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleCandidate);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleCandidate);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, localStream, roomId, userName]);

  // 🎤 Mic toggle
  const toggleMic = () => {
    if (!localStream) return;
    const enabled = !isMicOn;
    localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setIsMicOn(enabled);
  };

  // 🎥 Camera toggle
  const toggleCamera = () => {
    if (!localStream) return;
    const enabled = !isCamOn;
    localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setIsCamOn(enabled);
  };

  // 🖥 Screen share
  const toggleScreen = async () => {
    if (!localStream) return;

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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = sstream;
        localVideoRef.current.dataset.islocal = "true";
      }

      track.onended = () => stopScreen();
      setIsScreenSharing(true);
    } else {
      stopScreen();
    }
  };

  const stopScreen = () => {
    const camTrack = localStream?.getVideoTracks()[0];
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender && sender.replaceTrack(camTrack);
    });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.dataset.islocal = "true";
    }
    setIsScreenSharing(false);
  };

  // 🚪 Leave meeting
  const handleLeave = () => {
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    onLeave && onLeave();
  };

  return (
    <div className="video-room">
      <div className="video-grid">
        <div
          className={
            "video-tile " + (activeSpeakerId === "local" ? "active-speaker" : "")
          }
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            data-islocal="true"
            style={{ width: "100%", background: "#000" }}
          />
          <div className="video-label">You ({userName})</div>
        </div>

        {Object.entries(remoteStreams).map(([id, stream]) => (
          <RemoteVideo
            key={id}
            id={id}
            stream={stream}
            isActive={activeSpeakerId === id}
            onSpeaking={handleRemoteSpeaking}
          />
        ))}
      </div>

      {/* Controls bar - Google Meet style */}
      <div className="controls-bar">
        <div className="controls-left">
          <span className="room-pill">Room: {roomId}</span>
        </div>
        <div className="controls-center">
          <button
            className={"control-btn " + (!isMicOn ? "control-btn-off" : "")}
            onClick={toggleMic}
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? "🎤" : "🔇"}
          </button>
          <button
            className={"control-btn " + (!isCamOn ? "control-btn-off" : "")}
            onClick={toggleCamera}
            title={isCamOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCamOn ? "🎥" : "📷"}
          </button>
          <button
            className={"control-btn " + (isScreenSharing ? "control-btn-on" : "")}
            onClick={toggleScreen}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            🖥
          </button>
          <button
            className={
              "control-btn " + (isChatOpen ? "control-btn-on" : "")
            }
            onClick={onToggleChat}
            title={isChatOpen ? "Hide chat" : "Open chat"}
          >
            💬
          </button>
          <button
            className="control-btn leave-btn"
            onClick={handleLeave}
            title="Leave meeting"
          >
            🚪
          </button>
        </div>
        <div className="controls-right" />
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, id, isActive, onSpeaking }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  // Basic speaking detection per remote stream
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;

    let audioContext;
    let analyser;
    let source;
    let rafId;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 512;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((a, b) => a + b, 0) / dataArray.length || 0;
        const speaking = avg > 20;
        onSpeaking && onSpeaking(id, speaking);
        rafId = requestAnimationFrame(check);
      };
      check();
    } catch (e) {
      console.log("remote audio ctx error:", e);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [stream, id, onSpeaking]);

  return (
    <div className={"video-tile " + (isActive ? "active-speaker" : "")}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={false}
        style={{ width: "100%", background: "#000" }}
      />
      <div className="video-label">{id}</div>
    </div>
  );
};

export default VideoRoom;
