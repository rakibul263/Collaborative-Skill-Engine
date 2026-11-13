import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { createMonacoYjsBinding } from "@/lib/monacoYjs";
import {
  Play,
  Code2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Terminal,
  Columns2,
  Maximize2,
  Users,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Clock,
  ChevronDown,
  Send,
  X,
  Trash2,
  Loader2,
  Layout,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";

const resolveIceServers = () => {
  const defaultServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
  ];

  if (import.meta.env.VITE_ICE_SERVERS) {
    try {
      const parsed = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }

  if (import.meta.env.VITE_TURN_URL) {
    defaultServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_PASSWORD || "",
    });
  }

  return defaultServers;
};

const RTC_CONFIG = {
  iceServers: resolveIceServers(),
  iceCandidatePoolSize: 10,
};

const USER_COLORS = [
  { name: "indigo", hex: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-400" },
  { name: "emerald", hex: "#10b981", bg: "bg-emerald-500", text: "text-emerald-400" },
  { name: "amber", hex: "#f59e0b", bg: "bg-amber-500", text: "text-amber-400" },
  { name: "pink", hex: "#ec4899", bg: "bg-pink-500", text: "text-pink-400" },
  { name: "cyan", hex: "#06b6d4", bg: "bg-cyan-500", text: "text-cyan-400" },
  { name: "purple", hex: "#a855f7", bg: "bg-purple-500", text: "text-purple-400" },
];

const LANGUAGE_TEMPLATES = {
  javascript: `// 🚀 Collaborative Live Pair Programming Session
// Real-time co-coding with Monaco Editor + Yjs CRDTs

function findTwoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const numbers = [2, 7, 11, 15];
const target = 9;
console.log("Input array:", numbers);
console.log("Target sum:", target);
console.log("Matching pair indices:", findTwoSum(numbers, target));
`,
  typescript: `// 🚀 TypeScript Pair Programming Session

interface SolutionResult {
  status: string;
  total: number;
  squared: number[];
}

function processData(items: number[]): SolutionResult {
  console.log("Input items:", items);
  const total = items.reduce((acc, curr) => acc + curr, 0);
  return {
    status: "completed",
    total,
    squared: items.map((x) => x * x),
  };
}

console.log(processData([1, 2, 3, 4, 5]));
`,
  python: `# 🚀 Python Collaborative Pair Programming
# Real-time multi-cursor Python workspace

def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [1, 3, 5, 7, 9, 11, 13, 15]
key = 9
print(f"Sorted array: {numbers}")
print(f"Searching for target {key}...")
print(f"Found index: {binary_search(numbers, key)}")
`,
  cpp: `// 🚀 C++ Live Code Session
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {10, 20, 30, 40, 50};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "C++ Vector Sum: " << sum << std::endl;
    return 0;
}
`,
  java: `// 🚀 Java Live Code Session
public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello from collaborative Java pair programming room!");
    }
}
`,
  go: `// 🚀 Go Live Code Session
package main

import "fmt"

func main() {
    fmt.Println("Collaborative Go Live Pairing Workspace")
}
`,
  rust: `// 🚀 Rust Live Code Session
fn main() {
    let msg = "Hello from WebRTC Live Code Pairing!";
    println!("{}", msg);
}
`,
  html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 20px; }
    h1 { color: #6366f1; }
  </style>
</head>
<body>
  <h1>Collaborative HTML Live Sandbox</h1>
  <p>Student and Mentor pair programming workspace.</p>
</body>
</html>
`,
};

/**
 * WebRTC Live Code & Video Pairing Room
 *
 * Full-screen in-browser pair programming & live video room.
 * Integrates Monaco Editor (VS Code core) + Yjs CRDTs for real-time
 * co-coding (multi-cursor synchronization), code execution terminal,
 * WebRTC P2P/Mesh video/audio streams, screen sharing, and quick chat.
 */
const VideoCallOverlay = ({
  schedule,
  currentUserEmail,
  peerEmail,
  socket,
  serverOffset = 0,
  onClose,
}) => {
  // ─── Workspace View Mode ───
  // "split": Monaco Editor (65%) + Video gallery (35%)
  // "editor": Full 100% editor with small PiP video
  // "video": Full 100% video grid
  const [viewMode, setViewMode] = useState("split");

  // ─── Code Editor & CRDT State ───
  const [language, setLanguage] = useState("javascript");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [output, setOutput] = useState("");
  const [outputError, setOutputError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [activePeers, setActivePeers] = useState([]);

  // ─── In-Room Quick Chat ───
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // ─── WebRTC Media State ───
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

  // Monaco & Yjs references
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const decorationsRef = useRef([]);
  const currentLanguageRef = useRef(language);

  // Deterministic user color based on email hash
  const userColor = useMemo(() => {
    let hash = 0;
    const str = currentUserEmail || "user";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }, [currentUserEmail]);

  const currentUserName = useMemo(() => {
    return (currentUserEmail || "User").split("@")[0];
  }, [currentUserEmail]);

  // Unique room ID for the collaborative session
  const roomId = useMemo(() => {
    if (!schedule) return "room-live";
    return String(schedule._id || schedule.conversationId || "room-live");
  }, [schedule]);

  const isCaller = currentUserEmail < (peerEmail || "");

  // Keep ref up to date
  useEffect(() => {
    currentLanguageRef.current = language;
  }, [language]);

  // ─── WebRTC Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    document.body.classList.remove("video-call-active");

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (socket) {
      socket.emit("code:leave-room", {
        roomId,
        user: { email: currentUserEmail, name: currentUserName },
      });
      socket.off("rtc:answer");
      socket.off("rtc:offer");
      socket.off("rtc:ice-candidate");
      socket.off("rtc:ended");
      socket.off("code:yjs-update");
      socket.off("code:cursor");
      socket.off("code:language-change");
      socket.off("code:sync-state");
      socket.off("code:execution-output");
      socket.off("code:peer-joined");
      socket.off("code:peer-left");
      socket.off("code:quick-chat");
    }

    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, [socket, roomId, currentUserEmail, currentUserName]);

  // ─── WebRTC Signaling & Media Acquisition ──────────────────────────────────
  useEffect(() => {
    hasCleanedUpRef.current = false;
    let connectionTimeoutId = null;

    const setupCall = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        setErrorMsg("Camera/microphone access denied. Entering pairing room in audio-only mode.");
        setTimeout(() => setErrorMsg(null), 3000);
      }

      if (stream) {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // If direct P2P call with known peer
      if (peerEmail && peerEmail !== "group") {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        pc.onicecandidate = (e) => {
          if (e.candidate && socket) {
            socket.emit("rtc:ice-candidate", {
              to: peerEmail,
              candidate: e.candidate,
            });
          }
        };

        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

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
                if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                  setErrorMsg("Video connection dropped. Code pairing session remains active.");
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

        if (socket) {
          socket.on("rtc:ice-candidate", ({ candidate }) => {
            if (pcRef.current && candidate) {
              pcRef.current.addIceCandidate(candidate).catch(() => {});
            }
          });

          socket.on("rtc:ended", () => {
            setCallEndedToast(true);
            cleanup();
            setTimeout(() => onClose(), 2000);
          });

          if (isCaller) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("rtc:offer", {
                to: peerEmail,
                offer,
                scheduleId: schedule?._id,
              });
            } catch (err) {
              console.warn("Failed to create RTC offer:", err);
            }

            socket.on("rtc:answer", ({ answer }) => {
              if (pcRef.current && answer) {
                pcRef.current.setRemoteDescription(answer).catch(() => {});
              }
            });

            connectionTimeoutId = setTimeout(() => {
              if (pcRef.current && pcRef.current.connectionState !== "connected") {
                // Keep pairing workspace active even if peer camera delayed
              }
            }, 25_000);
          } else {
            socket.on("rtc:offer", async ({ offer }) => {
              if (!pcRef.current) return;
              try {
                await pcRef.current.setRemoteDescription(offer);
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                socket.emit("rtc:answer", {
                  to: peerEmail,
                  answer,
                  scheduleId: schedule?._id,
                });
              } catch (err) {
                console.warn("Failed to handle offer:", err);
              }
            });
          }
        }
      }
    };

    setupCall();
    document.body.classList.add("video-call-active");

    return () => {
      if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
      cleanup();
    };
  }, [peerEmail, isCaller, socket, schedule?._id, cleanup, onClose]);

  // ─── Real-Time Collaborative CRDT & Socket Setup ─────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    // Join collaborative code pairing room
    socket.emit("code:join-room", {
      roomId,
      user: {
        email: currentUserEmail,
        name: currentUserName,
        color: userColor,
      },
    });

    // Peer joined notification
    socket.on("code:peer-joined", ({ socketId, user }) => {
      toast.info(`${user?.name || "Peer"} joined the live pairing room!`);
      setActivePeers((prev) => {
        if (prev.some((p) => p.email === user?.email)) return prev;
        return [...prev, user];
      });

      // Send current full document state to new joiner
      if (ydocRef.current) {
        const fullState = Array.from(Y.encodeStateAsUpdate(ydocRef.current));
        socket.emit("code:sync-state", {
          roomId,
          targetSocketId: socketId,
          docState: fullState,
          language: currentLanguageRef.current,
        });
      }
    });

    // Peer left notification
    socket.on("code:peer-left", ({ user }) => {
      setActivePeers((prev) => prev.filter((p) => p.email !== user?.email));
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[user?.email];
        return next;
      });
    });

    // Receive Yjs CRDT delta updates
    socket.on("code:yjs-update", ({ update }) => {
      if (ydocRef.current && update) {
        try {
          Y.applyUpdate(ydocRef.current, new Uint8Array(update), "remote");
        } catch (err) {
          console.warn("[Yjs applyUpdate]", err);
        }
      }
    });

    // Initial sync state from existing room participant
    socket.on("code:sync-state", ({ docState, language: syncLang }) => {
      if (ydocRef.current && docState) {
        try {
          Y.applyUpdate(ydocRef.current, new Uint8Array(docState), "remote");
          if (syncLang && syncLang !== currentLanguageRef.current) {
            setLanguage(syncLang);
          }
        } catch (err) {
          console.warn("[Yjs sync-state]", err);
        }
      }
    });

    // Receive live cursor movements
    socket.on("code:cursor", ({ cursor, user }) => {
      if (!user?.email || user.email === currentUserEmail) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [user.email]: { cursor, user, timestamp: Date.now() },
      }));
    });

    // Synchronize language changes
    socket.on("code:language-change", ({ language: newLang, user }) => {
      if (newLang && newLang !== currentLanguageRef.current) {
        setLanguage(newLang);
        toast.info(`${user?.name || "Peer"} switched language to ${newLang.toUpperCase()}`);
      }
    });

    // Synchronize code execution output
    socket.on("code:execution-output", ({ output: runOut, error: runErr, language: l, user, durationMs }) => {
      setIsTerminalOpen(true);
      setOutput(runOut || "");
      setOutputError(runErr || null);
      toast.success(`${user?.name || "Peer"} executed ${l} code (${durationMs}ms)`);
    });

    // In-room quick chat
    socket.on("code:quick-chat", ({ message }) => {
      setChatMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit("code:leave-room", {
        roomId,
        user: { email: currentUserEmail, name: currentUserName },
      });
      socket.off("code:peer-joined");
      socket.off("code:peer-left");
      socket.off("code:yjs-update");
      socket.off("code:sync-state");
      socket.off("code:cursor");
      socket.off("code:language-change");
      socket.off("code:execution-output");
      socket.off("code:quick-chat");
    };
  }, [socket, roomId, currentUserEmail, currentUserName, userColor]);

  // ─── Monaco Editor Mount & Yjs Binding ─────────────────────────────────────
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Create fresh Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText("monaco");

    // Initialize with starter template
    const initialTemplate = LANGUAGE_TEMPLATES[language] || LANGUAGE_TEMPLATES.javascript;
    if (ytext.toString().length === 0) {
      ytext.insert(0, initialTemplate);
    }

    // Bind Monaco editor model with Yjs CRDT Text
    const binding = createMonacoYjsBinding(
      ytext,
      editor,
      monaco
    );
    bindingRef.current = binding;

    // Broadcast local changes to room
    ydoc.on("update", (update, origin) => {
      if (origin !== "remote" && socket) {
        socket.emit("code:yjs-update", {
          roomId,
          update: Array.from(update),
          user: {
            email: currentUserEmail,
            name: currentUserName,
            color: userColor,
          },
        });
      }
    });

    // Broadcast live cursor position
    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        socket.emit("code:cursor", {
          roomId,
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
          },
          user: {
            email: currentUserEmail,
            name: currentUserName,
            color: userColor,
          },
        });
      }
    });
  };

  // ─── Remote Cursor Decorations in Monaco ──────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const decorations = Object.values(remoteCursors).map(({ cursor, user }) => {
      const line = Math.max(1, cursor.lineNumber || 1);
      const col = Math.max(1, cursor.column || 1);
      return {
        range: new monaco.Range(line, col, line, col),
        options: {
          className: "monaco-remote-cursor",
          hoverMessage: { value: `**${user?.name || "Participant"}** is coding here` },
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [remoteCursors]);

  // ─── Change Language ───────────────────────────────────────────────────────
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (socket) {
      socket.emit("code:language-change", {
        roomId,
        language: newLang,
        user: { name: currentUserName, email: currentUserEmail },
      });
    }

    // If editor is empty or user wants template
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText("monaco");
      if (ytext.toString().trim().length === 0) {
        const tmpl = LANGUAGE_TEMPLATES[newLang] || "";
        ytext.insert(0, tmpl);
      }
    }
  };

  // ─── Reset Template ────────────────────────────────────────────────────────
  const handleResetTemplate = () => {
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText("monaco");
      ytext.delete(0, ytext.length);
      ytext.insert(0, LANGUAGE_TEMPLATES[language] || "");
      toast.info("Editor reset to starter template");
    }
  };

  // ─── Run Code in Sandbox ───────────────────────────────────────────────────
  const handleRunCode = async () => {
    try {
      setExecuting(true);
      setIsTerminalOpen(true);
      setOutput("Executing code in secure sandbox...\n");
      setOutputError(null);

      const codeString = ydocRef.current
        ? ydocRef.current.getText("monaco").toString()
        : editorRef.current?.getValue() || "";

      const res = await apiClient.post("/api/code/run", {
        language,
        code: codeString,
      });

      const runOut = res.data.output || "Program finished with no output.";
      const runErr = res.data.error || null;
      const durationMs = res.data.durationMs || 0;

      setOutput(runOut);
      setOutputError(runErr);

      if (socket) {
        socket.emit("code:execution-output", {
          roomId,
          output: runOut,
          error: runErr,
          language,
          durationMs,
          user: { name: currentUserName, email: currentUserEmail },
        });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to execute code";
      setOutputError(msg);
    } finally {
      setExecuting(false);
    }
  };

  // ─── Copy Code ─────────────────────────────────────────────────────────────
  const handleCopyCode = () => {
    const code = ydocRef.current
      ? ydocRef.current.getText("monaco").toString()
      : editorRef.current?.getValue() || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  // ─── Send Quick Chat Message ───────────────────────────────────────────────
  const handleSendQuickChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      id: Date.now(),
      sender: currentUserName,
      senderEmail: currentUserEmail,
      color: userColor,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, msg]);
    socket?.emit("code:quick-chat", { roomId, message: msg });
    setChatInput("");
  };

  // ─── Expiry Countdown for Scheduled Sessions ───────────────────────────────
  useEffect(() => {
    if (!schedule?.startTime || schedule.isInstantCall) return;

    const intervalId = setInterval(() => {
      const now = Date.now() + serverOffset;
      const startTime = new Date(schedule.startTime).getTime();
      const expiryTime = startTime + (schedule.durationMinutes || 60) * 60_000;
      const secsLeft = Math.floor((expiryTime - now) / 1000);

      if (secsLeft <= 0) {
        clearInterval(intervalId);
        cleanup();
        onClose();
      } else {
        setRemainingSecs(secsLeft);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [schedule, serverOffset, cleanup, onClose]);

  // ─── Media Controls ────────────────────────────────────────────────────────
  const handleToggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted((prev) => !prev);
  };

  const handleToggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff;
      });
    }
    setIsCameraOff((prev) => !prev);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (pcRef.current && streamRef.current) {
        const cameraTrack = streamRef.current.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current && streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([screenTrack]);
        }

        screenTrack.onended = () => handleToggleScreenShare();
        setIsScreenSharing(true);
      } catch {
        // cancelled
      }
    }
  };

  const handleEndCall = () => {
    if (socket && peerEmail && peerEmail !== "group") {
      socket.emit("rtc:end", { to: peerEmail, scheduleId: schedule?._id });
    }
    cleanup();
    onClose();
  };

  const formatCountdown = (totalSeconds) => {
    const secs = Math.max(0, totalSeconds);
    return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  };

  const showWarning = remainingSecs !== null && remainingSecs <= 60 && remainingSecs > 0;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans select-none">
      {/* ── Dynamic Remote Cursor Style ── */}
      <style>{`
        .monaco-remote-cursor {
          position: absolute;
          border-left: 2px solid #ec4899;
          animation: blink-cursor 1s infinite;
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* ── TOP ROOM HEADER BAR ── */}
      <header className="h-14 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        {/* Left: Room Badge & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Code2 size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-2">
                <span>{schedule?.title || "WebRTC Live Code & Video Pairing Room"}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                  CRDT Live
                </span>
              </h2>
            </div>
          </div>

          {/* Connected Participants Avatars */}
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 bg-indigo-500/10 border-indigo-500/30 text-indigo-300`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUserName} (You)</span>
            </div>

            {Object.values(remoteCursors).map(({ user }) => (
              <div
                key={user?.email}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 bg-pink-500/10 border-pink-500/30 text-pink-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span>{user?.name || user?.email?.split("@")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Language & Run Actions (When in Editor or Split mode) */}
        {viewMode !== "video" && (
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML/CSS</option>
            </select>

            {/* Run Code Button */}
            <button
              onClick={handleRunCode}
              disabled={executing}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {executing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} className="fill-white" />
              )}
              <span>Run Code</span>
            </button>

            {/* Copy & Reset */}
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Copy Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleResetTemplate}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Reset Starter Template"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {/* Right: Layout Switcher & Timer */}
        <div className="flex items-center gap-2">
          {/* Expiry Timer (if scheduled) */}
          {remainingSecs !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-slate-300">
              <Clock size={12} className="text-indigo-400" />
              <span>{formatCountdown(remainingSecs)}</span>
            </div>
          )}

          {/* View Mode Toggle Segment */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === "split"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Split View (Pair Programming)"
            >
              <Columns2 size={14} />
              <span className="hidden md:inline text-[11px]">Split</span>
            </button>

            <button
              onClick={() => setViewMode("editor")}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === "editor"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Full Code Editor Mode"
            >
              <Code2 size={14} />
              <span className="hidden md:inline text-[11px]">Editor</span>
            </button>

            <button
              onClick={() => setViewMode("video")}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === "video"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Full Video Meeting Mode"
            >
              <Video size={14} />
              <span className="hidden md:inline text-[11px]">Video</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 60-SECOND EXPIRY WARNING ── */}
      {showWarning && (
        <div className="bg-amber-500 text-slate-950 text-xs text-center py-1.5 font-extrabold flex items-center justify-center gap-2">
          <span>⚠️ Scheduled session will end in {remainingSecs} seconds. Please save your notes.</span>
        </div>
      )}

      {/* ── RECONNECTING NOTIFICATION ── */}
      {reconnecting && (
        <div className="bg-amber-600 text-white text-xs text-center py-1 font-bold">
          Connection drop detected — attempting to reconnect video stream ({reconnectSecsLeft}s)...
        </div>
      )}

      {/* ── MAIN WORKSPACE BODY ── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* ── LEFT: MONACO COLLABORATIVE CODE EDITOR & CONSOLE ── */}
        {(viewMode === "split" || viewMode === "editor") && (
          <div
            className={`flex flex-col min-h-0 border-r border-slate-800 transition-all ${
              viewMode === "editor" ? "w-full" : "w-full lg:w-[65%]"
            }`}
          >
            {/* Editor Canvas */}
            <div className="flex-1 min-h-0 relative bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={language}
                theme={editorTheme}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 14,
                  minimap: { enabled: viewMode === "editor" },
                  automaticLayout: true,
                  fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                  fontLigatures: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  wordWrap: "on",
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>

            {/* Collapsible Console / Execution Terminal */}
            {isTerminalOpen && (
              <div className="h-44 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
                <div className="h-8 px-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Terminal size={13} className="text-emerald-400" />
                    <span className="text-[11px] uppercase tracking-wider">Output Terminal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setOutput("");
                        setOutputError(null);
                      }}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition"
                      title="Clear Terminal"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={() => setIsTerminalOpen(false)}
                      className="text-slate-400 hover:text-white"
                      title="Collapse Terminal"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar select-text">
                  {executing ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin text-emerald-400" />
                      <span>Running code in isolated sandbox...</span>
                    </div>
                  ) : outputError ? (
                    <div className="text-rose-400 whitespace-pre-wrap font-semibold">
                      {outputError}
                    </div>
                  ) : output ? (
                    <div className="text-emerald-300 whitespace-pre-wrap">{output}</div>
                  ) : (
                    <span className="text-slate-500 italic">
                      Click "Run Code" above to execute your solution and view the output here.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RIGHT: WEBRTC VIDEO STREAMS & MEDIA GALLERY ── */}
        {(viewMode === "split" || viewMode === "video") && (
          <div
            className={`flex flex-col min-h-0 bg-slate-950 relative transition-all ${
              viewMode === "video" ? "w-full" : "w-full lg:w-[35%]"
            }`}
          >
            {/* Video Mesh Area */}
            <div className="flex-1 p-4 grid grid-cols-1 gap-4 overflow-y-auto">
              {/* Primary Peer Video Stream */}
              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[200px] shadow-xl">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Peer Overlay Card if camera off or waiting */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-slate-950/60 p-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-600/30 mb-2">
                    {((peerEmail || "Peer")[0] || "P").toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {peerEmail === "group" ? "Project Squad Channel" : peerEmail || "Remote Partner"}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    ● Live P2P WebRTC Connected
                  </span>
                </div>
              </div>

              {/* Local Participant Preview */}
              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center h-44 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isCameraOff ? "hidden" : "block"}`}
                />

                {isCameraOff && (
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <VideoOff size={24} />
                    <span className="text-xs font-semibold">Camera is Turned Off</span>
                  </div>
                )}

                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-bold text-slate-200">
                  {currentUserName} (You) {isMuted && "• Muted"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DRAGGABLE / PINNED PIP VIDEO IN FULL EDITOR MODE ── */}
        {viewMode === "editor" && (
          <div className="absolute bottom-20 right-6 w-52 h-40 rounded-2xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl overflow-hidden z-20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isCameraOff ? "hidden" : "block"}`}
            />
            {isCameraOff && (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
                Camera Off
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-bold text-white">
              {currentUserName}
            </div>
          </div>
        )}

        {/* ── IN-ROOM QUICK CHAT DRAWER ── */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute top-0 right-0 bottom-16 w-80 bg-slate-900/95 border-l border-slate-800 z-30 flex flex-col shadow-2xl backdrop-blur-xl"
            >
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-indigo-400" />
                  <span>Session Quick Chat</span>
                </span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-xs text-slate-500">
                    No messages yet. Send quick code snippets or questions here!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl text-xs ${
                        msg.senderEmail === currentUserEmail
                          ? "bg-indigo-600/30 border border-indigo-500/30 text-white ml-6"
                          : "bg-slate-800/80 border border-slate-700 text-slate-200 mr-6"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="leading-relaxed break-words">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendQuickChat} className="p-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0"
                >
                  <Send size={13} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM MEDIA & ROOM CONTROLS BAR ── */}
      <footer className="h-16 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 z-20">
        {/* Left: Terminal Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTerminalOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isTerminalOpen
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <Terminal size={14} />
            <span className="hidden sm:inline">Terminal</span>
          </button>
        </div>

        {/* Center: WebRTC Controls (Mic, Camera, Screen Share, End Call) */}
        <div className="flex items-center gap-3">
          {/* Mute Microphone */}
          <button
            onClick={handleToggleMute}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-rose-600/30 border border-rose-500 text-rose-300"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Camera On / Off */}
          <button
            onClick={handleToggleCamera}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isCameraOff
                ? "bg-rose-600/30 border border-rose-500 text-rose-300"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
            title={isScreenSharing ? "Stop Screen Sharing" : "Share Screen"}
          >
            <Monitor size={18} />
          </button>

          {/* Leave / End Call */}
          <button
            onClick={handleEndCall}
            className="w-12 h-11 rounded-2xl flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all font-bold text-xs gap-1 cursor-pointer"
            title="Leave Pairing Room"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        {/* Right: Quick Chat Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isChatOpen
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
            title="Toggle Quick Chat"
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VideoCallOverlay;
