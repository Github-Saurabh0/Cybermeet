import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext.jsx";

const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VideoRoom = ({ roomId, userName }) => {
  const { socket } = useSocket();
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // peers ko ref me rakhenge (no re-render)
  const peersRef = useRef({});
  const joinedRef = useRef(false);

  // 1) Camera/Mic access
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Media error:", err);
      }
    };
    startMedia();
  }, []);

  // 2) WebRTC + Socket signalling
  useEffect(() => {
    if (!socket || !localStream) return;

    // ensure join-room only once per socket
    if (!joinedRef.current) {
      socket.emit("join-room", { roomId, userName });
      joinedRef.current = true;
    }

    const createPeer = (remoteSocketId, isInitiator) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);

      // add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            to: remoteSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Remote track
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteSocketId]: remoteStream,
        }));
      };

      // Only initiator creates offer
      if (isInitiator) {
        const makeOffer = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-offer", {
              roomId,
              to: remoteSocketId,
              offer,
            });
          } catch (err) {
            console.error("Offer error:", err);
          }
        };
        // negotiationneeded multiple times aa sakta, but safe hai
        pc.onnegotiationneeded = makeOffer;
      }

      return pc;
    };

    const handleUserJoined = ({ socketId }) => {
      // existing clients initiator banenge
      if (peersRef.current[socketId]) return;
      const peer = createPeer(socketId, true);
      peersRef.current[socketId] = peer;
    };

    const handleOffer = async ({ from, offer }) => {
      let peer = peersRef.current[from];
      if (!peer) {
        peer = createPeer(from, false);
        peersRef.current[from] = peer;
      }
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc-answer", { to: from, answer });
      } catch (err) {
        console.error("Handle offer error:", err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const peer = peersRef.current[from];
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Handle answer error:", err);
      }
    };

    const handleCandidate = async ({ from, candidate }) => {
      const peer = peersRef.current[from];
      if (!peer) return;
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE error:", err);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      const peer = peersRef.current[socketId];
      if (peer) {
        peer.close();
        delete peersRef.current[socketId];
      }
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

  // 3) Screen share logic same, bas peersRef use karo
  const handleScreenShareToggle = async () => {
    if (!localStream) return;
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => stopScreenShare();
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen share error:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (!localStream) return;
    const camTrack = localStream.getVideoTracks()[0];

    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(camTrack);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    setIsScreenSharing(false);
  };

  return (
    <div className="video-room">
      <div className="video-header">
        <h3>Meeting: {roomId}</h3>
        <button onClick={handleScreenShareToggle}>
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>
      </div>
      <div className="video-grid">
        <div className="video-tile">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", background: "#000" }}
          />
          <p>You ({userName})</p>
        </div>
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <RemoteVideo key={id} stream={stream} socketId={id} />
        ))}
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, socketId }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      <video
        ref={ref}
        autoPlay
        playsInline
        style={{ width: "100%", background: "#000" }}
      />
      <p>{socketId}</p>
    </div>
  );
};

export default VideoRoom;
