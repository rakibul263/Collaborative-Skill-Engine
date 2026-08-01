import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
  FiMonitor,
} from "react-icons/fi";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * VideoCallOverlay
 *
 * Full-screen WebRTC video call overlay. Manages media acquisition,
 * RTCPeerConnection lifecycle, signaling via socket, expiry countdown,
 * and cleanup.
 *
 * Props:
 *   schedule          – the active accepted schedule object
 *   currentUserEmail  – the current user's email
 *   peerEmail         – the other participant's email
 *   socket            – Socket.IO socket instance
 *   serverOffset      – ms clock offset between server and local clock (default 0)
 *   onClose()         – called to close the overlay
 */
const VideoCallOverlay = ({
  schedule,
  currentUserEmail,
  peerEmail,
  socket,
  serverOffset = 0,
  onClose,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [callEndedToast, setCallEndedToast] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectSecsLeft, setReconnectSecsLeft] = useState(15);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const hasCleanedUpRef = useRef(false);

  const isCaller = currentUserEmail < peerEmail;

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop screen share tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore navbar
    document.body.classList.remove("video-call-active");

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Remove socket listeners added by this component
    if (socket) {
      socket.off("rtc:answer");
      socket.off("rtc:offer");
      socket.off("rtc:ice-candidate");
      socket.off("rtc:ended");
    }

    // Clear any reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, [socket]);

  // ─── Media Acquisition & WebRTC Setup ────────────────────────────────────
  useEffect(() => {
    hasCleanedUpRef.current = false;
    let connectionTimeoutId = null;

    const setupCall = async () => {
      // 1. Acquire media
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        setErrorMsg("Camera/microphone access denied. Cannot start call.");
        setTimeout(() => {
          onClose();
        }, 3000);
        return;
      }

      streamRef.current = stream;

      // Attach local stream to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit("rtc:ice-candidate", {
            to: peerEmail,
            candidate: e.candidate,
          });
        }
      };

      // Handle incoming remote track
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      // Handle connection state changes (network drop / reconnection)
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "disconnected" || state === "failed") {
          setReconnecting(true);
          setReconnectSecsLeft(15);

          let secsLeft = 15;
          const countdown = setInterval(() => {
            secsLeft -= 1;
            setReconnectSecsLeft(secsLeft);
            if (secsLeft <= 0) {
              clearInterval(countdown);
              // Still not connected after 15 s → give up
              if (
                pc.connectionState === "disconnected" ||
                pc.connectionState === "failed"
              ) {
                setErrorMsg("Connection lost.");
                cleanup();
                setTimeout(() => {
                  onClose();
                }, 2000);
              } else {
                setReconnecting(false);
              }
            }
          }, 1000);
          reconnectTimerRef.current = countdown;
        } else if (state === "connected") {
          setReconnecting(false);
          if (reconnectTimerRef.current) {
            clearInterval(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        }
      };

      // 3. Socket signaling
      if (socket) {
        // Both caller and callee handle incoming ICE candidates
        socket.on("rtc:ice-candidate", ({ candidate }) => {
          if (pcRef.current && candidate) {
            pcRef.current.addIceCandidate(candidate).catch(() => {});
          }
        });

        // Handle remote ending the call
        socket.on("rtc:ended", () => {
          setCallEndedToast(true);
          cleanup();
          setTimeout(() => {
            onClose();
          }, 2000);
        });

        if (isCaller) {
          // ─── Caller flow ───────────────────────────────────────────────
          // Create offer and send it
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("rtc:offer", {
              to: peerEmail,
              offer,
              scheduleId: schedule._id,
            });
          } catch {
            setErrorMsg("Failed to create call offer. Please try again.");
            cleanup();
            setTimeout(() => onClose(), 3000);
            return;
          }

          // Listen for answer from callee
          socket.on("rtc:answer", ({ answer }) => {
            if (pcRef.current) {
              pcRef.current.setRemoteDescription(answer).catch(() => {});
            }
          });

          // 30-second connection timeout
          connectionTimeoutId = setTimeout(() => {
            if (
              pcRef.current &&
              pcRef.current.connectionState !== "connected"
            ) {
              setErrorMsg(
                "Could not establish connection. Please check your network and try again."
              );
              cleanup();
              setTimeout(() => onClose(), 3000);
            }
          }, 30_000);
        } else {
          // ─── Callee flow ───────────────────────────────────────────────
          socket.on("rtc:offer", async ({ offer }) => {
            if (!pcRef.current) return;
            try {
              await pcRef.current.setRemoteDescription(offer);
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              socket.emit("rtc:answer", {
                to: peerEmail,
                answer,
                scheduleId: schedule._id,
              });
            } catch {
              setErrorMsg("Failed to answer the call. Please try again.");
              cleanup();
              setTimeout(() => onClose(), 3000);
            }
          });
        }
      }
    };

    setupCall();

    // Hide navbar while in call
    document.body.classList.add("video-call-active");

    return () => {
      if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Expiry Countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!schedule) return;

    const expiryTime =
      new Date(schedule.startTime).getTime() +
      schedule.durationMinutes * 60_000;

    const intervalId = setInterval(() => {
      const secs = Math.max(
        0,
        Math.floor((expiryTime - (Date.now() + serverOffset)) / 1000)
      );
      setRemainingSecs(secs);

      if (secs <= 0) {
        clearInterval(intervalId);
        cleanup();
        onClose();
      }
    }, 1000);

    // Initial calculation
    const initialSecs = Math.max(
      0,
      Math.floor((expiryTime - (Date.now() + serverOffset)) / 1000)
    );
    setRemainingSecs(initialSecs);

    return () => clearInterval(intervalId);
  }, [schedule, serverOffset, cleanup, onClose]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleToggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // flip: if currently muted, re-enable
      });
    }
    setIsMuted((prev) => !prev);
  };

  const handleToggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff; // flip: if currently off, re-enable
      });
    }
    setIsCameraOff((prev) => !prev);
  };

  const handleEndCall = () => {
    if (socket) {
      socket.emit("rtc:end", { to: peerEmail, scheduleId: schedule._id });
    }
    cleanup();
    onClose();
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share — restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Replace screen track with camera track in peer connection
      if (pcRef.current && streamRef.current) {
        const cameraTrack = streamRef.current.getVideoTracks()[0];
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      }
      // Restore local video preview to camera
      if (localVideoRef.current && streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        if (pcRef.current) {
          const sender = pcRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        // Show screen in local preview
        if (localVideoRef.current) {
          const previewStream = new MediaStream([screenTrack]);
          localVideoRef.current.srcObject = previewStream;
        }

        // Auto-stop when user clicks browser's "Stop sharing" button
        screenTrack.onended = () => {
          handleToggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch {
        // User cancelled or permission denied — do nothing
      }
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatCountdown = (totalSeconds) => {
    const secs = Math.max(0, totalSeconds);
    return (
      String(Math.floor(secs / 60)).padStart(2, "0") +
      ":" +
      String(secs % 60).padStart(2, "0")
    );
  };

  const showWarning = remainingSecs !== null && remainingSecs <= 60 && remainingSecs > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Error message */}
      {errorMsg && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="bg-slate-800 text-white text-center rounded-2xl px-8 py-6 shadow-xl max-w-sm">
            <p className="text-lg font-semibold">{errorMsg}</p>
            <p className="text-sm text-slate-400 mt-2">Closing…</p>
          </div>
        </div>
      )}

      {/* Call ended toast */}
      {callEndedToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 bg-slate-800 text-white text-sm rounded-xl px-5 py-3 shadow-lg">
          Call ended by the other participant
        </div>
      )}

      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 bg-amber-600 text-white text-sm rounded-xl px-5 py-3 shadow-lg">
          Connection lost — reconnecting… ({reconnectSecsLeft}s)
        </div>
      )}

      {/* 60-second warning banner */}
      {showWarning && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-500 text-white text-sm text-center py-2 font-medium">
          ⚠️ Call will end in 60 seconds
        </div>
      )}

      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local video (picture-in-picture top-right) */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="absolute top-4 right-4 w-36 h-28 rounded-xl object-cover border-2 border-white shadow-lg"
      />

      {/* Expiry timer */}
      {remainingSecs !== null && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium pointer-events-none">
          Call ends in {formatCountdown(remainingSecs)}
        </div>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        {/* Mute / Unmute */}
        <button
          onClick={handleToggleMute}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          {isMuted ? <FiMicOff size={22} /> : <FiMic size={22} />}
        </button>

        {/* Camera on / off */}
        <button
          onClick={handleToggleCamera}
          aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          {isCameraOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
        </button>

        {/* Screen Share */}
        <button
          onClick={handleToggleScreenShare}
          aria-label={isScreenSharing ? "Stop screen share" : "Share screen"}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
            isScreenSharing
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          <FiMonitor size={22} />
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          aria-label="End call"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          <FiPhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
