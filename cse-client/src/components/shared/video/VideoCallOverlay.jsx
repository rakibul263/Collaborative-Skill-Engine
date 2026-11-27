import { toast } from "@/components/ui/toast-system";
import useAuth from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { createMonacoYjsBinding } from "@/lib/monacoYjs";
import { playNotificationSound } from "@/lib/notificationSound";
import Editor from "@monaco-editor/react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
    Check,
    ChevronDown,
    ChevronUp,
    Clock,
    Code2,
    Copy,
    Loader2,
    Maximize2,
    MessageSquare,
    Mic,
    MicOff,
    Minimize2,
    Monitor,
    MonitorOff,
    Move,
    PenTool,
    PhoneOff,
    Play,
    RotateCcw,
    Send,
    Terminal,
    Trash2,
    Users,
    Video,
    VideoOff,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import WhiteboardCanvas from "./WhiteboardCanvas";

const resolveIceServers = () => {
  const defaultServers = [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  if (import.meta.env.VITE_ICE_SERVERS) {
    try {
      const parsed = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore invalid VITE_ICE_SERVERS JSON
    }
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

let cachedDynamicIceServers = null;
let cachedIceExpiresAt = 0;
let inFlightIceFetch = null;

const fetchRuntimeIceServers = () => {
  if (cachedDynamicIceServers && Date.now() < cachedIceExpiresAt) {
    return Promise.resolve(cachedDynamicIceServers);
  }
  if (inFlightIceFetch) return inFlightIceFetch;
  inFlightIceFetch = apiClient
    .get("/rtc/ice-servers", { timeout: 2500 })
    .then((r) => {
      const servers =
        Array.isArray(r?.data?.iceServers) && r.data.iceServers.length > 0
          ? r.data.iceServers
          : null;
      if (servers) {
        cachedDynamicIceServers = servers;
        cachedIceExpiresAt = Date.now() + 5 * 60 * 1000;
      }
      return servers;
    })
    .catch(() => null)
    .finally(() => {
      inFlightIceFetch = null;
    });
  return inFlightIceFetch;
};

// Warm ICE cache immediately when module loads so first call has zero fetch delay
if (typeof window !== "undefined") {
  void fetchRuntimeIceServers();
}

const RTC_CONFIG = {
  iceServers: resolveIceServers(),
  iceCandidatePoolSize: 1,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const LOW_LATENCY_VIDEO_CONSTRAINTS = {
  width: { ideal: 640, max: 854 },
  height: { ideal: 360, max: 480 },
  frameRate: { ideal: 30, max: 30 },
};

const LOW_LATENCY_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const applyLowLatencyReceiver = (receiver) => {
  if (!receiver) return;
  try {
    if ("playoutDelayHint" in receiver) {
      receiver.playoutDelayHint = 0;
    }
    if ("jitterBufferTarget" in receiver) {
      receiver.jitterBufferTarget = 0;
    }
  } catch {
    // Browser may not support mutable receiver playout hints
  }
};

const tuneSenderLowLatency = async (sender, mode = "camera") => {
  if (!sender || typeof sender.getParameters !== "function") return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    if (mode === "audio") {
      params.encodings[0].maxBitrate = 40_000;
      params.encodings[0].priority = "high";
      params.encodings[0].networkPriority = "high";
    } else if (mode === "screen") {
      params.degradationPreference = "maintain-resolution";
      params.encodings[0].maxBitrate = 1_200_000;
      params.encodings[0].maxFramerate = 15;
      params.encodings[0].priority = "medium";
      params.encodings[0].networkPriority = "medium";
    } else {
      params.degradationPreference = "maintain-framerate";
      params.encodings[0].maxBitrate = 450_000;
      params.encodings[0].maxFramerate = 30;
      params.encodings[0].priority = "high";
      params.encodings[0].networkPriority = "high";
    }
    await sender.setParameters(params);
  } catch {
    // Some browsers reject specific optional encoding parameters
  }
};

const preferLowLatencyVideoCodecs = (pc) => {
  if (!pc || typeof RTCRtpReceiver?.getCapabilities !== "function") return;
  try {
    const caps = RTCRtpReceiver.getCapabilities("video");
    if (!caps?.codecs?.length) return;
    // Keep browser-native VP8/H264 priority & matching RTX retransmission codecs together
    // so cross-platform negotiation (iPad Safari <-> Desktop Chrome) never breaks profile matching.
    const isFastOrRtx = (mime = "") => {
      const m = mime.toLowerCase();
      return m === "video/vp8" || m === "video/h264" || m === "video/rtx";
    };
    const fastCodecs = caps.codecs.filter((c) => isFastOrRtx(c.mimeType));
    if (fastCodecs.length === 0) return;
    const otherCodecs = caps.codecs.filter((c) => !isFastOrRtx(c.mimeType));
    const ordered = [...fastCodecs, ...otherCodecs];

    pc.getTransceivers().forEach((transceiver) => {
      const isVideoTransceiver =
        transceiver.receiver?.track?.kind === "video" ||
        transceiver.sender?.track?.kind === "video";
      if (isVideoTransceiver && typeof transceiver.setCodecPreferences === "function") {
        try {
          transceiver.setCodecPreferences(ordered);
        } catch {
          // Ignore unsupported codec preference sets
        }
      }
    });
  } catch {
    // Ignore capability query failures
  }
};

const USER_COLORS = [
  { name: "indigo", hex: "#6366f1" },
  { name: "emerald", hex: "#10b981" },
  { name: "amber", hex: "#f59e0b" },
  { name: "pink", hex: "#ec4899" },
  { name: "cyan", hex: "#06b6d4" },
  { name: "purple", hex: "#a855f7" },
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
 * WebRTC Zoom-Style Video Meeting + Collaborative Code & Whiteboard Room
 *
 * - Opens in a Zoom-like 2-participant video layout by default.
 * - Uses dual video transceivers (separate Camera + Screen Share tracks) so
 *   both participants' faces remain visible even during screen sharing.
 * - Allows pinning / expanding any video tile or shared screen to Full Screen.
 * - Bottom control bar toggles Code Editor & Whiteboard synced in real time.
 */
const VideoCallOverlay = ({
  schedule,
  currentUserEmail,
  peerEmail,
  peerProfile = null,
  socket,
  serverOffset = 0,
  initialOffer = null,
  onClose,
}) => {
  const { user: authUser } = useAuth() || {};
  // ─── Workspace View Mode ───
  // "video" (default Zoom view) | "code" | "whiteboard"
  const [viewMode, setViewMode] = useState("video");
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  // Fullscreen / Spotlight tile: null | "remote" | "local" | "remote-screen" | "local-screen"
  const [spotlightTile, setSpotlightTile] = useState(null);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isViewportFullscreen, setIsViewportFullscreen] = useState(false);
  const [isPipCollapsed, setIsPipCollapsed] = useState(false);
  const [pipOffset, setPipOffset] = useState({ x: 0, y: 0 });

  // ─── Code Editor & CRDT State ───
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [outputError, setOutputError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [activePeers, setActivePeers] = useState([]);

  // ─── Whiteboard State (room-level so strokes never get missed) ───
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);

  // ─── In-Room Quick Chat ───
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [fetchedRemoteProfile, setFetchedRemoteProfile] = useState(null);
  const chatEndRef = useRef(null);
  const seenChatIdsRef = useRef(new Set());

  // ─── WebRTC Media State ───
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteScreen, setHasRemoteScreen] = useState(false);
  const [rtcConnected, setRtcConnected] = useState(false);
  const [peerMediaState, setPeerMediaState] = useState({
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    cameraStreamId: null,
    screenStreamId: null,
  });
  const [remainingSecs, setRemainingSecs] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [callEndedToast, setCallEndedToast] = useState(false);
  const [peerCallState, setPeerCallState] = useState("waiting"); // "waiting" | "joined" | "left"
  const [leftPeerName, setLeftPeerName] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectSecsLeft, setReconnectSecsLeft] = useState(15);

  const rootOverlayRef = useRef(null);
  const localVideoRef = useRef(null);
  const localScreenRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteScreenRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenSenderRef = useRef(null);
  const remoteCameraStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const remoteAudioStreamRef = useRef(null);
  const pcRef = useRef(null);
  const pendingIceRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const pendingReadyRef = useRef(null);
  const pipDragRef = useRef(null);
  const localIceCandidatesRef = useRef([]);
  const resolvedPeerEmailRef = useRef(peerEmail && peerEmail !== "group" ? peerEmail : "");
  const reconnectTimerRef = useRef(null);
  const manualReconnectRef = useRef(null);
  const resetPeerConnectionRef = useRef(null);
  const onPartnerJoinedSignalRef = useRef(null);
  const peerCallStateRef = useRef("waiting");
  const hasCleanedUpRef = useRef(false);

  // Stable refs to prevent WebRTC teardown on parent re-renders
  const onCloseRef = useRef(onClose);
  const initialOfferRef = useRef(initialOffer);
  const isChatOpenRef = useRef(isChatOpen);
  const initialOfferProcessedRef = useRef(false);
  const peerMediaStateRef = useRef(peerMediaState);
  const mediaStateRef = useRef({
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    cameraStreamId: null,
    screenStreamId: null,
  });

  // Monaco & Yjs references
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const decorationsRef = useRef([]);
  const currentLanguageRef = useRef(language);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initialOfferRef.current = initialOffer;
  }, [initialOffer]);

  useEffect(() => {
    peerMediaStateRef.current = peerMediaState;
  }, [peerMediaState]);

  const userColor = useMemo(() => {
    let hash = 0;
    const str = currentUserEmail || "user";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }, [currentUserEmail]);

  const currentUserName = useMemo(() => {
    return (
      authUser?.fullName ||
      authUser?.displayName ||
      authUser?.name ||
      (currentUserEmail || "User").split("@")[0]
    );
  }, [authUser, currentUserEmail]);

  const currentUserImage = useMemo(() => {
    return authUser?.profileImage || authUser?.photoURL || "";
  }, [authUser]);

  const activeRemotePeer = useMemo(() => {
    return activePeers.find(
      (p) => p?.email && p.email.toLowerCase() !== (currentUserEmail || "").toLowerCase()
    );
  }, [activePeers, currentUserEmail]);

  const remoteLookupEmail = useMemo(() => {
    if (peerEmail && peerEmail !== "group") return peerEmail;
    return activeRemotePeer?.email || "";
  }, [peerEmail, activeRemotePeer]);

  useEffect(() => {
    if (!remoteLookupEmail || remoteLookupEmail.toLowerCase() === (currentUserEmail || "").toLowerCase()) {
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/users?email=${encodeURIComponent(remoteLookupEmail)}`)
      .then((res) => {
        if (cancelled || !res?.data) return;
        setFetchedRemoteProfile(res.data);
      })
      .catch(() => {
        // Keep available socket/prop display fallback if lookup fails
      });
    return () => {
      cancelled = true;
    };
  }, [remoteLookupEmail, currentUserEmail]);

  const peerDisplayName = useMemo(() => {
    const matchedFetched =
      fetchedRemoteProfile &&
      (!remoteLookupEmail ||
        (fetchedRemoteProfile.email || "").toLowerCase() === remoteLookupEmail.toLowerCase())
        ? fetchedRemoteProfile
        : null;
    const rawName =
      matchedFetched?.fullName ||
      matchedFetched?.displayName ||
      matchedFetched?.name ||
      peerProfile?.fullName ||
      peerProfile?.displayName ||
      peerProfile?.name ||
      activeRemotePeer?.name;
    if (rawName && String(rawName).trim()) return String(rawName).trim();
    if (!remoteLookupEmail) return "Project Squad";
    return remoteLookupEmail.split("@")[0];
  }, [fetchedRemoteProfile, peerProfile, activeRemotePeer, remoteLookupEmail]);

  const peerAvatarImage = useMemo(() => {
    const matchedFetched =
      fetchedRemoteProfile &&
      (!remoteLookupEmail ||
        (fetchedRemoteProfile.email || "").toLowerCase() === remoteLookupEmail.toLowerCase())
        ? fetchedRemoteProfile
        : null;
    return (
      matchedFetched?.profileImage ||
      matchedFetched?.photoURL ||
      peerProfile?.profileImage ||
      peerProfile?.photoURL ||
      activeRemotePeer?.profileImage ||
      ""
    );
  }, [fetchedRemoteProfile, peerProfile, activeRemotePeer, remoteLookupEmail]);

  const currentUserNameRef = useRef(currentUserName);
  const currentUserImageRef = useRef(currentUserImage);
  const peerDisplayNameRef = useRef(peerDisplayName);
  const callMetaRef = useRef({
    peerEmail,
    scheduleId: schedule?._id || null,
    scheduleTitle: schedule?.title || "Live Video Meeting",
  });

  useEffect(() => {
    currentUserNameRef.current = currentUserName;
    currentUserImageRef.current = currentUserImage;
    peerDisplayNameRef.current = peerDisplayName;
    callMetaRef.current = {
      peerEmail,
      scheduleId: schedule?._id || null,
      scheduleTitle: schedule?.title || "Live Video Meeting",
    };
  }, [currentUserName, currentUserImage, peerDisplayName, peerEmail, schedule?._id, schedule?.title]);

  const roomId = useMemo(() => {
    if (!schedule) return "room-live";
    return String(schedule._id || schedule.conversationId || "room-live");
  }, [schedule]);

  const isCaller = useMemo(() => {
    if (!peerEmail || peerEmail === "group") return true;
    return (currentUserEmail || "").toLowerCase() < peerEmail.toLowerCase();
  }, [currentUserEmail, peerEmail]);

  useEffect(() => {
    currentLanguageRef.current = language;
  }, [language]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadChatCount(0);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 40);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpenRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    mediaStateRef.current = {
      isMuted,
      isCameraOff,
      isScreenSharing,
      cameraStreamId: streamRef.current?.id || null,
      screenStreamId: screenStreamRef.current?.id || null,
    };
  }, [isMuted, isCameraOff, isScreenSharing]);

  // Track desktop breakpoint so only ONE set of <video> elements mounts at a time
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Listen to browser native fullscreen changes (standard + webkit for Safari)
  useEffect(() => {
    const onFsChange = () => {
      const fsActive = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      setIsBrowserFullscreen(fsActive);
      if (!fsActive) {
        setIsViewportFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // Callback refs that immediately bind srcObject + call .play() on mount
  const attachLocalVideo = useCallback((el) => {
    localVideoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const attachLocalScreen = useCallback((el) => {
    localScreenRef.current = el;
    if (el && screenStreamRef.current && el.srcObject !== screenStreamRef.current) {
      el.srcObject = screenStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const attachRemoteVideo = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteCameraStreamRef.current && el.srcObject !== remoteCameraStreamRef.current) {
      el.srcObject = remoteCameraStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const attachRemoteScreen = useCallback((el) => {
    remoteScreenRef.current = el;
    if (el && remoteScreenStreamRef.current && el.srcObject !== remoteScreenStreamRef.current) {
      el.srcObject = remoteScreenStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  const attachRemoteAudio = useCallback((el) => {
    remoteAudioRef.current = el;
    if (el && remoteAudioStreamRef.current && el.srcObject !== remoteAudioStreamRef.current) {
      el.srcObject = remoteAudioStreamRef.current;
      el.play?.().catch(() => {});
    }
  }, []);

  // ─── Re-attach video & audio streams whenever layout / spotlight / screen-share changes ───
  useEffect(() => {
    if (localVideoRef.current && streamRef.current && localVideoRef.current.srcObject !== streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.play?.().catch(() => {});
    }
    if (localScreenRef.current && screenStreamRef.current && localScreenRef.current.srcObject !== screenStreamRef.current) {
      localScreenRef.current.srcObject = screenStreamRef.current;
      localScreenRef.current.play?.().catch(() => {});
    }
    if (remoteVideoRef.current && remoteCameraStreamRef.current && remoteVideoRef.current.srcObject !== remoteCameraStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
      remoteVideoRef.current.play?.().catch(() => {});
    }
    if (remoteScreenRef.current && remoteScreenStreamRef.current && remoteScreenRef.current.srcObject !== remoteScreenStreamRef.current) {
      remoteScreenRef.current.srcObject = remoteScreenStreamRef.current;
      remoteScreenRef.current.play?.().catch(() => {});
    }
    if (remoteAudioRef.current && remoteAudioStreamRef.current && remoteAudioRef.current.srcObject !== remoteAudioStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
      remoteAudioRef.current.play?.().catch(() => {});
    }
  }, [
    viewMode,
    isWorkspaceExpanded,
    isBrowserFullscreen,
    isViewportFullscreen,
    isPipCollapsed,
    isDesktop,
    spotlightTile,
    isScreenSharing,
    hasLocalVideo,
    hasRemoteVideo,
    hasRemoteScreen,
    peerMediaState.isScreenSharing,
  ]);

  const getTargetPeer = useCallback(() => {
    if (resolvedPeerEmailRef.current) return resolvedPeerEmailRef.current;
    if (peerEmail && peerEmail !== "group") return peerEmail;
    return "group";
  }, [peerEmail]);

  const emitMediaState = useCallback(
    (overrides = {}) => {
      if (!socket) return;
      const next = {
        ...mediaStateRef.current,
        cameraStreamId: streamRef.current?.id || null,
        screenStreamId: screenStreamRef.current?.id || null,
        ...overrides,
      };
      socket.emit("rtc:media-state", {
        to: getTargetPeer(),
        roomId,
        ...next,
      });
    },
    [socket, getTargetPeer, roomId]
  );

  const clearRemoteStreams = useCallback(() => {
    if (remoteCameraStreamRef.current) {
      remoteCameraStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.onunmute = null;
      });
      remoteCameraStreamRef.current = null;
    }
    if (remoteScreenStreamRef.current) {
      remoteScreenStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
      });
      remoteScreenStreamRef.current = null;
    }
    if (remoteAudioStreamRef.current) {
      remoteAudioStreamRef.current.getTracks().forEach((t) => {
        t.onunmute = null;
      });
      remoteAudioStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setHasRemoteVideo(false);
    setHasRemoteScreen(false);
    setRtcConnected(false);
    setReconnecting(false);
    setSpotlightTile((prev) =>
      prev === "remote" || prev === "remote-screen" ? null : prev
    );
    setPeerMediaState({
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      cameraStreamId: null,
      screenStreamId: null,
    });
  }, []);

  const setPeerCallStatus = useCallback((nextStatus) => {
    peerCallStateRef.current = nextStatus;
    setPeerCallState(nextStatus);
  }, []);

  const markRemotePeerJoined = useCallback(
    (joinedUser) => {
      const joinedEmail = String(joinedUser?.email || "").trim().toLowerCase();
      const selfEmail = String(currentUserEmail || "").trim().toLowerCase();
      if (joinedEmail && selfEmail && joinedEmail === selfEmail) return false;

      if (joinedUser?.email && !resolvedPeerEmailRef.current) {
        resolvedPeerEmailRef.current = joinedUser.email;
      }
      setCallEndedToast(false);
      setLeftPeerName("");
      setReconnecting(false);
      setErrorMsg(null);
      const wasJoined = peerCallStateRef.current === "joined";
      setPeerCallStatus("joined");

      if (joinedUser?.email) {
        setActivePeers((prev) => {
          const exists = prev.some(
            (p) => String(p?.email || "").trim().toLowerCase() === joinedEmail
          );
          if (exists) {
            return prev.map((p) =>
              String(p?.email || "").trim().toLowerCase() === joinedEmail
                ? { ...p, ...joinedUser }
                : p
            );
          }
          return [...prev, joinedUser];
        });
      }
      return !wasJoined;
    },
    [currentUserEmail, setPeerCallStatus]
  );

  const handleRemotePeerLeft = useCallback(
    (leavingUser) => {
      const leavingEmail = String(leavingUser?.email || "").trim().toLowerCase();
      const selfEmail = String(currentUserEmail || "").trim().toLowerCase();
      if (leavingEmail && selfEmail && leavingEmail === selfEmail) return;

      setActivePeers((prev) =>
        leavingEmail
          ? prev.filter(
              (p) => String(p?.email || "").trim().toLowerCase() !== leavingEmail
            )
          : []
      );
      if (leavingEmail) {
        setRemoteCursors((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k.toLowerCase() === leavingEmail) delete next[k];
          });
          return next;
        });
      }

      clearRemoteStreams();
      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      localIceCandidatesRef.current = [];
      resetPeerConnectionRef.current?.();

      const alreadyLeft = peerCallStateRef.current === "left";
      const hadJoinedBefore = peerCallStateRef.current === "joined";
      if (!alreadyLeft && (hadJoinedBefore || Boolean(leavingEmail))) {
        const name = leavingUser?.name || peerDisplayNameRef.current || "Partner";
        setLeftPeerName(name);
        setPeerCallStatus("left");
        setCallEndedToast(true);
        toast.error(`${name} left the call`);
      }
    },
    [currentUserEmail, clearRemoteStreams, setPeerCallStatus]
  );

  // ─── WebRTC Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;
    resetPeerConnectionRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    screenSenderRef.current = null;
    remoteCameraStreamRef.current = null;
    remoteScreenStreamRef.current = null;
    remoteAudioStreamRef.current = null;
    document.body.classList.remove("video-call-active");

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitFullscreenElement) {
      try {
        document.webkitExitFullscreen?.();
      } catch {
        // ignore safari exit error
      }
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.ontrack = null;
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

    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ─── WebRTC Signaling & Media Acquisition (STABLE dependencies!) ─────────────
  useEffect(() => {
    hasCleanedUpRef.current = false;
    initialOfferProcessedRef.current = false;
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    pendingReadyRef.current = null;
    localIceCandidatesRef.current = [];
    resolvedPeerEmailRef.current = peerEmail && peerEmail !== "group" ? peerEmail : "";
    let isMounted = true;
    let readyRetryInterval = null;
    let disconnectIceRestartTimeout = null;
    let lastIceRestartAt = 0;
    let lastOfferSentAt = 0;
    let hasConnectedOnce = false;

    if (socket && !socket.connected) {
      socket.connect();
    }

    const getEffectiveIsCaller = () => {
      const target = resolvedPeerEmailRef.current;
      if (!target || !currentUserEmail) return isCaller;
      return currentUserEmail.toLowerCase() < target.toLowerCase();
    };

    const flushPendingIce = async (pc) => {
      while (pendingIceRef.current.length > 0 && pc.remoteDescription) {
        const cand = pendingIceRef.current.shift();
        try {
          await pc.addIceCandidate(cand);
        } catch {
          // ignore stale candidate
        }
      }
    };

    const sendOffer = async (pc, { iceRestart = false } = {}) => {
      const target = getTargetPeer();
      if (!pc || !socket || (!target && !roomId)) return;
      try {
        if (iceRestart && typeof pc.restartIce === "function") {
          pc.restartIce();
        }
        const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
        await pc.setLocalDescription(offer);
        lastOfferSentAt = Date.now();
        socket.emit("rtc:offer", {
          to: target,
          roomId,
          from: currentUserEmail,
          offer: pc.localDescription,
          scheduleId: schedule?._id,
        });
      } catch (err) {
        console.warn("Failed to create RTC offer:", err);
      }
    };

    const requestIceRecovery = (forceNow = false) => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState === "closed") return;
      const now = Date.now();
      if (!forceNow && now - lastIceRestartAt < 3500) return;
      lastIceRestartAt = now;

      if (getEffectiveIsCaller()) {
        localIceCandidatesRef.current = [];
        if (
          pc.signalingState === "stable" ||
          (forceNow && pc.signalingState === "have-local-offer")
        ) {
          void sendOffer(pc, { iceRestart: true });
        }
      } else {
        socket?.emit("rtc:ready", {
          to: getTargetPeer(),
          roomId,
          from: currentUserEmail,
          scheduleId: schedule?._id,
          forceOffer: true,
        });
      }
    };

    manualReconnectRef.current = () => {
      setErrorMsg(null);
      setReconnecting(true);
      setReconnectSecsLeft(20);
      if (socket && !socket.connected) socket.connect();
      requestIceRecovery(true);
    };

    const handleIncomingOffer = async (offer, from) => {
      if (from && from.toLowerCase() !== (currentUserEmail || "").toLowerCase() && !resolvedPeerEmailRef.current) {
        resolvedPeerEmailRef.current = from;
      }
      const pc = pcRef.current;
      if (!pc) {
        pendingOfferRef.current = { offer, from };
        return;
      }
      if (!offer) return;
      try {
        if (
          pc.remoteDescription?.type === "offer" &&
          pc.remoteDescription?.sdp === offer.sdp &&
          pc.signalingState === "have-remote-offer"
        ) {
          return;
        }
        const offerCollision = pc.signalingState !== "stable";
        if (offerCollision) {
          if (getEffectiveIsCaller()) {
            // Impolite peer ignores colliding offer
            return;
          }
          // Polite peer rolls back local offer before accepting remote offer
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch {
            // continue to setRemoteDescription
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit("rtc:answer", {
          to: resolvedPeerEmailRef.current || from || getTargetPeer(),
          roomId,
          from: currentUserEmail,
          answer: pc.localDescription,
          scheduleId: schedule?._id,
        });
      } catch (err) {
        console.warn("Failed to handle RTC offer:", err);
      }
    };

    const onRtcOffer = ({ offer, from }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      if (from) {
        markRemotePeerJoined({ email: from });
      }
      handleIncomingOffer(offer, from);
    };

    const onRtcAnswer = async ({ answer, from }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      const pc = pcRef.current;
      if (!pc || !answer) return;
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingIce(pc);
        }
      } catch (err) {
        console.warn("Failed to set remote answer:", err);
      }
    };

    const onRtcIceCandidate = async ({ candidate, from }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      if (!candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      } else {
        pendingIceRef.current.push(new RTCIceCandidate(candidate));
      }
    };

    const onRtcReady = ({ from, forceOffer }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      if (from) {
        markRemotePeerJoined({ email: from });
      }
      const pc = pcRef.current;
      if (!pc) {
        pendingReadyRef.current = { from, forceOffer };
        return;
      }
      emitMediaState();

      const target = resolvedPeerEmailRef.current || from || getTargetPeer();
      if (getEffectiveIsCaller()) {
        if (forceOffer && pc.signalingState === "stable") {
          localIceCandidatesRef.current = [];
          void sendOffer(pc, { iceRestart: true });
        } else if (pc.localDescription && !pc.remoteDescription) {
          if (Date.now() - lastOfferSentAt >= 1200) {
            lastOfferSentAt = Date.now();
            socket?.emit("rtc:offer", {
              to: target,
              roomId,
              from: currentUserEmail,
              offer: pc.localDescription,
              scheduleId: schedule?._id,
            });
            localIceCandidatesRef.current.forEach((cand) => {
              socket?.emit("rtc:ice-candidate", {
                to: target,
                roomId,
                from: currentUserEmail,
                candidate: cand,
              });
            });
          }
        } else if (!pc.remoteDescription && pc.signalingState === "stable") {
          void sendOffer(pc);
        }
      }
    };

    const onRtcMediaState = ({
      from,
      isMuted: pm,
      isCameraOff: pcam,
      isScreenSharing: pss,
      cameraStreamId,
      screenStreamId,
    }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      if (from && !resolvedPeerEmailRef.current) {
        resolvedPeerEmailRef.current = from;
      }
      if (from && peerCallStateRef.current !== "left") {
        markRemotePeerJoined({ email: from });
      }
      setPeerMediaState({
        isMuted: Boolean(pm),
        isCameraOff: Boolean(pcam),
        isScreenSharing: Boolean(pss),
        cameraStreamId: cameraStreamId || null,
        screenStreamId: screenStreamId || null,
      });

      if (!pss) {
        remoteScreenStreamRef.current = null;
        setHasRemoteScreen(false);
        setSpotlightTile((prev) => (prev === "remote-screen" ? null : prev));
      }
    };

    const onRtcEnded = ({ from }) => {
      if (from && currentUserEmail && from.toLowerCase() === currentUserEmail.toLowerCase()) return;
      handleRemotePeerLeft(from ? { email: from } : {});
    };

    const onSocketReconnect = () => {
      if (!isMounted || !socket) return;
      if (currentUserEmail) {
        socket.emit("presence:join", { email: currentUserEmail });
      }
      socket.emit("code:join-room", {
        roomId,
        user: {
          email: currentUserEmail,
          name: currentUserNameRef.current,
          profileImage: currentUserImageRef.current,
          color: userColor,
        },
      });
      socket.emit("rtc:ready", {
        to: getTargetPeer(),
        roomId,
        from: currentUserEmail,
        scheduleId: schedule?._id,
      });
      emitMediaState();
      if (
        pcRef.current &&
        (pcRef.current.connectionState === "disconnected" ||
          pcRef.current.connectionState === "failed")
      ) {
        requestIceRecovery(false);
      }
    };

    // Register all RTC socket listeners SYNCHRONOUSLY BEFORE awaiting getUserMedia!
    if (socket) {
      socket.on("rtc:offer", onRtcOffer);
      socket.on("rtc:answer", onRtcAnswer);
      socket.on("rtc:ice-candidate", onRtcIceCandidate);
      socket.on("rtc:ready", onRtcReady);
      socket.on("rtc:media-state", onRtcMediaState);
      socket.on("rtc:ended", onRtcEnded);
      socket.on("connect", onSocketReconnect);
    }

    let activeRtcConfig = cachedDynamicIceServers
      ? { ...RTC_CONFIG, iceServers: cachedDynamicIceServers }
      : RTC_CONFIG;

    const buildPeerConnection = (rtcConfig = activeRtcConfig) => {
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.ontrack = null;
        try {
          pcRef.current.close();
        } catch {
          // ignore
        }
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      const localStream = streamRef.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStream);
          tuneSenderLowLatency(sender, track.kind === "audio" ? "audio" : "camera");
        });
      }

      const localScreen = screenStreamRef.current;
      if (localScreen) {
        const screenTrack = localScreen.getVideoTracks()[0];
        if (screenTrack && screenTrack.readyState === "live") {
          screenSenderRef.current = pc.addTrack(screenTrack, localScreen);
          tuneSenderLowLatency(screenSenderRef.current, "screen");
        }
      }

      if (!localStream || localStream.getVideoTracks().length === 0) {
        try {
          pc.addTransceiver("video", { direction: "recvonly" });
        } catch {
          // ignore
        }
      }
      if (!localStream || localStream.getAudioTracks().length === 0) {
        try {
          pc.addTransceiver("audio", { direction: "recvonly" });
        } catch {
          // ignore
        }
      }

      preferLowLatencyVideoCodecs(pc);

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          localIceCandidatesRef.current.push(e.candidate);
          socket.emit("rtc:ice-candidate", {
            to: getTargetPeer(),
            roomId,
            from: currentUserEmail,
            candidate: e.candidate,
          });
        }
      };

      const markConnectionHealthy = () => {
        hasConnectedOnce = true;
        setRtcConnected(true);
        setReconnecting(false);
        setErrorMsg(null);
        if (peerCallStateRef.current !== "joined") {
          setPeerCallStatus("joined");
          setCallEndedToast(false);
        }
        if (disconnectIceRestartTimeout) {
          clearTimeout(disconnectIceRestartTimeout);
          disconnectIceRestartTimeout = null;
        }
        if (readyRetryInterval) {
          clearInterval(readyRetryInterval);
          readyRetryInterval = null;
        }
        if (reconnectTimerRef.current) {
          clearInterval(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      const handleConnectionDrop = (state) => {
        setRtcConnected(false);
        if (peerCallStateRef.current === "left") {
          return;
        }

        // Before initial connection succeeds or partner joins, avoid flashing "Connection drop detected"
        if (!hasConnectedOnce || peerCallStateRef.current !== "joined") {
          if (state === "failed" && peerCallStateRef.current === "joined") {
            if (!disconnectIceRestartTimeout) {
              disconnectIceRestartTimeout = setTimeout(() => {
                disconnectIceRestartTimeout = null;
                if (
                  pcRef.current &&
                  (pcRef.current.connectionState === "failed" ||
                    pcRef.current.iceConnectionState === "failed")
                ) {
                  requestIceRecovery(false);
                }
              }, 1200);
            }
          }
          return;
        }

        const scheduleRecovery = (delayMs) => {
          if (disconnectIceRestartTimeout) return;
          disconnectIceRestartTimeout = setTimeout(() => {
            disconnectIceRestartTimeout = null;
            const curPc = pcRef.current;
            if (!curPc || peerCallStateRef.current === "left") return;
            const curConn = curPc.connectionState;
            const curIce = curPc.iceConnectionState;
            if (curConn === "connected" || curIce === "connected" || curIce === "completed") {
              markConnectionHealthy();
              return;
            }
            if (
              curConn === "disconnected" ||
              curConn === "failed" ||
              curIce === "disconnected" ||
              curIce === "failed"
            ) {
              setReconnecting(true);
              requestIceRecovery(false);
            }
          }, delayMs);
        };

        if (state === "failed") {
          setReconnecting(true);
          scheduleRecovery(500);
        } else {
          // Wait 3s on brief packet loss so normal WiFi/cellular jitter heals cleanly without flashing banner
          scheduleRecovery(3000);
        }

        if (!reconnectTimerRef.current && state === "failed") {
          const totalGraceSecs = 20;
          setReconnectSecsLeft(totalGraceSecs);
          let secsLeft = totalGraceSecs;
          reconnectTimerRef.current = setInterval(() => {
            secsLeft -= 1;
            setReconnectSecsLeft(secsLeft);
            if (secsLeft === 10 || secsLeft === 5) {
              if (
                pcRef.current &&
                (pcRef.current.connectionState === "disconnected" ||
                  pcRef.current.connectionState === "failed")
              ) {
                requestIceRecovery(false);
              }
            }
            if (secsLeft <= 0) {
              clearInterval(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
              if (
                pcRef.current &&
                (pcRef.current.connectionState === "disconnected" ||
                  pcRef.current.connectionState === "failed")
              ) {
                setErrorMsg("Video connection dropped. Collaboration tools remain active.");
                setReconnecting(false);
              }
            }
          }, 1000);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        if (iceState === "connected" || iceState === "completed") {
          markConnectionHealthy();
        } else if (iceState === "failed" || iceState === "disconnected") {
          handleConnectionDrop(iceState);
        }
      };

      pc.ontrack = (e) => {
        const track = e.track;
        applyLowLatencyReceiver(e.receiver, track.kind);
        const incomingStream = e.streams?.[0] || new MediaStream([track]);
        const streamId = incomingStream.id;

        if (peerCallStateRef.current !== "joined") {
          setPeerCallStatus("joined");
          setCallEndedToast(false);
          setLeftPeerName("");
        }

        if (track.kind === "audio") {
          if (!remoteAudioStreamRef.current) {
            remoteAudioStreamRef.current = new MediaStream([track]);
          } else if (!remoteAudioStreamRef.current.getAudioTracks().some((t) => t.id === track.id)) {
            remoteAudioStreamRef.current.addTrack(track);
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
            remoteAudioRef.current.play?.().catch(() => {});
          }
          track.onunmute = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play?.().catch(() => {});
            }
          };
          return;
        }

        const peerState = peerMediaStateRef.current;
        const existingCamTrack = remoteCameraStreamRef.current?.getVideoTracks()?.[0];
        const isExplicitScreenStream =
          Boolean(peerState.screenStreamId && streamId === peerState.screenStreamId);
        const isSecondVideoWhileSharing =
          Boolean(
            peerState.isScreenSharing &&
              existingCamTrack &&
              existingCamTrack.readyState === "live" &&
              existingCamTrack.id !== track.id
          );

        if (isExplicitScreenStream || isSecondVideoWhileSharing) {
          remoteScreenStreamRef.current = incomingStream;
          setHasRemoteScreen(true);
          setSpotlightTile("remote-screen");
          if (remoteScreenRef.current) {
            remoteScreenRef.current.srcObject = incomingStream;
            remoteScreenRef.current.play?.().catch(() => {});
          }
          track.onended = () => {
            remoteScreenStreamRef.current = null;
            setHasRemoteScreen(false);
            setSpotlightTile((prev) => (prev === "remote-screen" ? null : prev));
          };
        } else {
          remoteCameraStreamRef.current = incomingStream;
          setHasRemoteVideo(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream;
            remoteVideoRef.current.play?.().catch(() => {});
          }
          track.onunmute = () => {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== incomingStream) {
              remoteVideoRef.current.srcObject = incomingStream;
            }
            remoteVideoRef.current?.play?.().catch(() => {});
          };
          track.onended = () => {
            if (remoteCameraStreamRef.current === incomingStream) {
              setHasRemoteVideo(false);
            }
          };
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          markConnectionHealthy();
        } else if (state === "disconnected" || state === "failed") {
          handleConnectionDrop(state);
        }
      };

      return pc;
    };

    resetPeerConnectionRef.current = () => {
      if (!isMounted) return;
      hasConnectedOnce = false;
      buildPeerConnection(activeRtcConfig);
    };

    onPartnerJoinedSignalRef.current = () => {
      if (!isMounted) return;
      const pc = pcRef.current;
      if (!pc || pc.signalingState === "closed") return;
      if (getEffectiveIsCaller() && !pc.remoteDescription && pc.signalingState === "stable") {
        if (!pc.localDescription) {
          void sendOffer(pc);
        } else if (Date.now() - lastOfferSentAt > 2500) {
          localIceCandidatesRef.current = [];
          void sendOffer(pc, { iceRestart: true });
        }
      }
    };

    const setupCall = async () => {
      // Wait at most 400ms concurrently with getUserMedia so any dynamic server TURN config
      // is baked into RTCPeerConnection BEFORE creating Offer/Answer (no mid-flight setConfiguration).
      const runtimeIcePromise = Promise.race([
        fetchRuntimeIceServers(),
        new Promise((resolve) => setTimeout(() => resolve(null), 400)),
      ]);

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: LOW_LATENCY_VIDEO_CONSTRAINTS,
          audio: LOW_LATENCY_AUDIO_CONSTRAINTS,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: LOW_LATENCY_AUDIO_CONSTRAINTS,
          });
          if (isMounted) {
            setIsCameraOff(true);
            setErrorMsg("Camera unavailable — joined with audio only.");
            setTimeout(() => setErrorMsg(null), 3500);
          }
        } catch {
          if (isMounted) {
            setIsCameraOff(true);
            setIsMuted(true);
            setErrorMsg("Camera/microphone access denied — joined in view-only mode.");
            setTimeout(() => setErrorMsg(null), 4000);
          }
        }
      }

      const dynamicIceServers = await runtimeIcePromise;
      if (Array.isArray(dynamicIceServers) && dynamicIceServers.length > 0) {
        activeRtcConfig = { ...RTC_CONFIG, iceServers: dynamicIceServers };
      }

      if (!isMounted) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        streamRef.current = stream;
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        videoTracks.forEach((t) => {
          if ("contentHint" in t) t.contentHint = "motion";
        });
        audioTracks.forEach((t) => {
          if ("contentHint" in t) t.contentHint = "speech";
        });
        setHasLocalVideo(videoTracks.length > 0);
        if (videoTracks.length === 0) setIsCameraOff(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play?.().catch(() => {});
        }
      }

      const pc = buildPeerConnection(activeRtcConfig);

      if (socket) {
        socket.emit("rtc:ready", {
          to: getTargetPeer(),
          roomId,
          from: currentUserEmail,
          scheduleId: schedule?._id,
        });
        emitMediaState();

        const queuedReady = pendingReadyRef.current;
        pendingReadyRef.current = null;

        if (pendingOfferRef.current?.offer) {
          const { offer, from } = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await handleIncomingOffer(offer, from);
        } else if (initialOfferRef.current?.offer && !initialOfferProcessedRef.current) {
          initialOfferProcessedRef.current = true;
          if (initialOfferRef.current.from) {
            markRemotePeerJoined({ email: initialOfferRef.current.from });
          }
          await handleIncomingOffer(initialOfferRef.current.offer, initialOfferRef.current.from);
        } else if (queuedReady) {
          onRtcReady(queuedReady);
        } else if (getEffectiveIsCaller()) {
          await sendOffer(pc);
        } else {
          let retries = 0;
          readyRetryInterval = setInterval(() => {
            retries += 1;
            if (!pcRef.current || pcRef.current.remoteDescription || retries >= 15) {
              clearInterval(readyRetryInterval);
              readyRetryInterval = null;
              return;
            }
            socket.emit("rtc:ready", {
              to: getTargetPeer(),
              roomId,
              from: currentUserEmail,
              scheduleId: schedule?._id,
            });
          }, 450);
        }
      }
    };

    setupCall();
    document.body.classList.add("video-call-active");

    return () => {
      isMounted = false;
      if (readyRetryInterval) clearInterval(readyRetryInterval);
      if (disconnectIceRestartTimeout) clearTimeout(disconnectIceRestartTimeout);
      if (socket) {
        socket.off("rtc:offer", onRtcOffer);
        socket.off("rtc:answer", onRtcAnswer);
        socket.off("rtc:ice-candidate", onRtcIceCandidate);
        socket.off("rtc:ready", onRtcReady);
        socket.off("rtc:media-state", onRtcMediaState);
        socket.off("rtc:ended", onRtcEnded);
        socket.off("connect", onSocketReconnect);
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerEmail, isCaller, socket, roomId, schedule?._id, currentUserEmail]);

  // ─── Real-Time Collaborative CRDT, Whiteboard & Mode Sync Setup ──────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const onYdocUpdate = (update, origin) => {
      if (origin !== "remote" && origin !== "room-init" && socket) {
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
    };
    ydoc.on("update", onYdocUpdate);

    const joinRoom = () => {
      socket.emit("code:join-room", {
        roomId,
        user: {
          email: currentUserEmail,
          name: currentUserNameRef.current,
          profileImage: currentUserImageRef.current,
          color: userColor,
        },
      });
    };

    joinRoom();

    // Notify the scheduled partner / group members that we joined the call
    socket.emit("rtc:join-call", {
      to: callMetaRef.current.peerEmail,
      roomId,
      scheduleId: callMetaRef.current.scheduleId,
      scheduleTitle: callMetaRef.current.scheduleTitle,
      user: {
        email: currentUserEmail,
        name: currentUserNameRef.current,
        profileImage: currentUserImageRef.current,
      },
    });

    const onRoomInit = ({
      mode,
      language: initLang,
      yjsUpdates,
      whiteboardStrokes: initStrokes,
      chatMessages: initChatMessages,
      participants: initParticipants,
    }) => {
      if (Array.isArray(initParticipants)) {
        const selfEmail = String(currentUserEmail || "").trim().toLowerCase();
        const remotePeers = initParticipants.filter((p) => {
          const em = String(p?.email || "").trim().toLowerCase();
          return em && em !== selfEmail;
        });
        setActivePeers(remotePeers);
        if (remotePeers.length > 0) {
          setCallEndedToast(false);
          setLeftPeerName("");
          setPeerCallStatus("joined");
          if (remotePeers[0]?.email && !resolvedPeerEmailRef.current) {
            resolvedPeerEmailRef.current = remotePeers[0].email;
          }
        } else if (peerCallStateRef.current !== "left") {
          setPeerCallStatus("waiting");
        }
      }

      if (Array.isArray(yjsUpdates) && yjsUpdates.length > 0 && ydocRef.current) {
        yjsUpdates.forEach((upd) => {
          try {
            Y.applyUpdate(ydocRef.current, new Uint8Array(upd), "room-init");
          } catch {
            // ignore corrupted delta
          }
        });
      }

      if (initLang && initLang !== currentLanguageRef.current) {
        setLanguage(initLang);
      }

      if (Array.isArray(initStrokes)) {
        setWhiteboardStrokes(initStrokes);
      }

      if (Array.isArray(initChatMessages) && initChatMessages.length > 0) {
        initChatMessages.forEach((m) => {
          const key =
            m?.id != null
              ? String(m.id)
              : `${m?.senderEmail || ""}:${m?.time || ""}:${m?.text || ""}`;
          seenChatIdsRef.current.add(key);
        });
        setChatMessages((prev) => {
          const merged = [...initChatMessages, ...prev];
          const seen = new Set();
          return merged.filter((m) => {
            const key =
              m?.id != null
                ? String(m.id)
                : `${m?.senderEmail || ""}:${m?.time || ""}:${m?.text || ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      }

      if (mode && (mode === "code" || mode === "whiteboard")) {
        setViewMode(mode);
      }
    };

    const onPeerJoined = ({ socketId, user }) => {
      const joinedEmail = String(user?.email || "").trim().toLowerCase();
      const selfEmail = String(currentUserEmail || "").trim().toLowerCase();
      if (joinedEmail && selfEmail && joinedEmail === selfEmail) return;

      const isNewlyJoined = markRemotePeerJoined(user);
      if (isNewlyJoined) {
        playNotificationSound("chime");
        toast.success(`${user?.name || peerDisplayNameRef.current || "Partner"} joined the meeting!`);
        onPartnerJoinedSignalRef.current?.();
      }

      if (ydocRef.current) {
        const fullState = Array.from(Y.encodeStateAsUpdate(ydocRef.current));
        socket.emit("code:sync-state", {
          roomId,
          targetSocketId: socketId,
          docState: fullState,
          language: currentLanguageRef.current,
        });
      }
    };

    const onPeerLeft = ({ user }) => {
      handleRemotePeerLeft(user);
    };

    const onYjsUpdate = ({ update }) => {
      if (ydocRef.current && update) {
        try {
          Y.applyUpdate(ydocRef.current, new Uint8Array(update), "remote");
        } catch (err) {
          console.warn("[Yjs applyUpdate]", err);
        }
      }
    };

    const onSyncState = ({ docState, language: syncLang }) => {
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
    };

    const onRequestSync = ({ requesterSocketId }) => {
      if (ydocRef.current && requesterSocketId) {
        const fullState = Array.from(Y.encodeStateAsUpdate(ydocRef.current));
        socket.emit("code:sync-state", {
          roomId,
          targetSocketId: requesterSocketId,
          docState: fullState,
          language: currentLanguageRef.current,
        });
      }
    };

    const onModeChange = ({ mode, user }) => {
      if (!mode) return;
      setViewMode(mode);
      setIsWorkspaceExpanded(false);
      setSpotlightTile(null);
      if (mode === "code" || mode === "whiteboard") {
        socket.emit("code:request-sync", { roomId });
      }
      const who = user?.name || "Partner";
      if (mode === "code") {
        toast.info(`${who} shared the Live Code Editor`);
      } else if (mode === "whiteboard") {
        toast.info(`${who} shared the Collaborative Whiteboard`);
      } else if (mode === "video") {
        toast.info(`${who} switched back to Video View`);
      }
    };

    const onWhiteboardStroke = ({ stroke, user }) => {
      const senderEmail = String(user?.email || "").trim().toLowerCase();
      const selfEmail = String(currentUserEmail || "").trim().toLowerCase();
      if (!stroke || (senderEmail && selfEmail && senderEmail === selfEmail)) return;
      setWhiteboardStrokes((prev) => {
        if (prev.some((s) => s.id === stroke.id)) return prev;
        return [...prev, stroke];
      });
    };

    const onWhiteboardUndo = ({ strokeId }) => {
      setWhiteboardStrokes((prev) =>
        strokeId ? prev.filter((s) => s.id !== strokeId) : prev.slice(0, -1)
      );
    };

    const onWhiteboardClear = () => {
      setWhiteboardStrokes([]);
    };

    const onCursor = ({ cursor, user }) => {
      if (!user?.email || user.email === currentUserEmail) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [user.email]: { cursor, user, timestamp: Date.now() },
      }));
    };

    const onLanguageChange = ({ language: newLang, user }) => {
      if (newLang && newLang !== currentLanguageRef.current) {
        setLanguage(newLang);
        toast.info(`${user?.name || "Peer"} switched language to ${newLang.toUpperCase()}`);
      }
    };

    const onExecutionOutput = ({ output: runOut, error: runErr, language: l, user, durationMs }) => {
      setIsTerminalOpen(true);
      setOutput(runOut || "");
      setOutputError(runErr || null);
      toast.success(`${user?.name || "Peer"} executed ${l} code (${durationMs}ms)`);
    };

    const onQuickChat = ({ message }) => {
      if (!message) return;
      const msgKey =
        message.id != null
          ? String(message.id)
          : `${message.senderEmail || ""}:${message.time || ""}:${message.text || ""}`;
      if (seenChatIdsRef.current.has(msgKey)) return;
      seenChatIdsRef.current.add(msgKey);

      setChatMessages((prev) => [...prev, message]);
      if (
        !isChatOpenRef.current &&
        message.senderEmail?.toLowerCase() !== (currentUserEmail || "").toLowerCase()
      ) {
        setUnreadChatCount((c) => c + 1);
        playNotificationSound("chime");
      }
    };

    socket.on("connect", joinRoom);
    socket.on("collab:room-init", onRoomInit);
    socket.on("collab:mode-change", onModeChange);
    socket.on("code:peer-joined", onPeerJoined);
    socket.on("code:peer-left", onPeerLeft);
    socket.on("code:yjs-update", onYjsUpdate);
    socket.on("code:sync-state", onSyncState);
    socket.on("code:request-sync", onRequestSync);
    socket.on("code:cursor", onCursor);
    socket.on("code:language-change", onLanguageChange);
    socket.on("code:execution-output", onExecutionOutput);
    socket.on("code:quick-chat", onQuickChat);
    socket.on("whiteboard:draw", onWhiteboardStroke);
    socket.on("whiteboard:undo", onWhiteboardUndo);
    socket.on("whiteboard:clear", onWhiteboardClear);

    const emitLeaveRoom = () => {
      socket.emit("code:leave-room", {
        roomId,
        user: { email: currentUserEmail, name: currentUserNameRef.current },
      });
    };

    window.addEventListener("pagehide", emitLeaveRoom);
    window.addEventListener("beforeunload", emitLeaveRoom);

    return () => {
      window.removeEventListener("pagehide", emitLeaveRoom);
      window.removeEventListener("beforeunload", emitLeaveRoom);
      emitLeaveRoom();
      socket.off("connect", joinRoom);
      socket.off("collab:room-init", onRoomInit);
      socket.off("collab:mode-change", onModeChange);
      socket.off("code:peer-joined", onPeerJoined);
      socket.off("code:peer-left", onPeerLeft);
      socket.off("code:yjs-update", onYjsUpdate);
      socket.off("code:sync-state", onSyncState);
      socket.off("code:request-sync", onRequestSync);
      socket.off("code:cursor", onCursor);
      socket.off("code:language-change", onLanguageChange);
      socket.off("code:execution-output", onExecutionOutput);
      socket.off("code:quick-chat", onQuickChat);
      socket.off("whiteboard:draw", onWhiteboardStroke);
      socket.off("whiteboard:undo", onWhiteboardUndo);
      socket.off("whiteboard:clear", onWhiteboardClear);

      ydoc.off("update", onYdocUpdate);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [
    socket,
    roomId,
    currentUserEmail,
    currentUserName,
    userColor,
    markRemotePeerJoined,
    handleRemotePeerLeft,
    setPeerCallStatus,
  ]);

  // ─── Toggle Shared Workspace Mode (Video / Code / Whiteboard) ───────────────
  const handleSwitchMode = useCallback(
    (targetMode) => {
      const nextMode = viewMode === targetMode && targetMode !== "video" ? "video" : targetMode;
      setViewMode(nextMode);
      setIsWorkspaceExpanded(false);
      setSpotlightTile(null);

      socket?.emit("collab:mode-change", {
        roomId,
        mode: nextMode,
        user: { email: currentUserEmail, name: currentUserName },
      });

      if (nextMode === "code" || nextMode === "whiteboard") {
        socket?.emit("code:request-sync", { roomId });
      }
    },
    [viewMode, socket, roomId, currentUserEmail, currentUserName]
  );

  // ─── Toggle Full Screen Spotlight / Browser & iPad Viewport Fullscreen ──────
  const isFullscreenActive = isBrowserFullscreen || isViewportFullscreen;
  const isWhiteboardFullscreen =
    viewMode === "whiteboard" && (isWorkspaceExpanded || isFullscreenActive);
  const useFloatingPipLayout = isWorkspaceExpanded || isWhiteboardFullscreen || !isDesktop;

  const handleToggleTileFullscreen = (tileKey) => {
    setSpotlightTile((prev) => (prev === tileKey ? null : tileKey));
  };

  const enterFullscreen = async () => {
    const target = rootOverlayRef.current;
    try {
      if (typeof target?.requestFullscreen === "function") {
        await target.requestFullscreen();
        setIsViewportFullscreen(true);
        return;
      }
      if (typeof target?.webkitRequestFullscreen === "function") {
        await target.webkitRequestFullscreen();
        setIsViewportFullscreen(true);
        return;
      }
    } catch {
      // iPadOS Safari blocks Element.requestFullscreen on containers — fall back to 100dvh viewport fullscreen
    }
    setIsViewportFullscreen(true);
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
        await document.exitFullscreen();
      } else if (
        document.webkitFullscreenElement &&
        typeof document.webkitExitFullscreen === "function"
      ) {
        await document.webkitExitFullscreen();
      }
    } catch {
      // ignore exit errors
    }
    setIsViewportFullscreen(false);
  };

  const handleToggleBrowserFullscreen = () => {
    if (isFullscreenActive) {
      setIsWorkspaceExpanded(false);
      void exitFullscreen();
    } else {
      if (viewMode === "whiteboard") {
        setIsWorkspaceExpanded(true);
      }
      void enterFullscreen();
    }
  };

  const handleToggleWhiteboardFullscreen = () => {
    if (isWhiteboardFullscreen) {
      setIsWorkspaceExpanded(false);
      setIsPipCollapsed(false);
      setPipOffset({ x: 0, y: 0 });
      void exitFullscreen();
    } else {
      setIsWorkspaceExpanded(true);
      void enterFullscreen();
    }
  };

  const handlePipDragStart = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = pipOffset.x;
    const baseY = pipOffset.y;
    pipDragRef.current = { pointerId: e.pointerId };

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    const onMove = (ev) => {
      if (!pipDragRef.current || ev.pointerId !== pipDragRef.current.pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const maxLeftShift = -(typeof window !== "undefined" ? Math.max(120, window.innerWidth - 250) : 600);
      const maxUpShift = -(typeof window !== "undefined" ? Math.max(100, window.innerHeight - 170) : 500);
      setPipOffset({
        x: Math.min(8, Math.max(maxLeftShift, baseX + dx)),
        y: Math.min(8, Math.max(maxUpShift, baseY + dy)),
      });
    };

    const onEnd = (ev) => {
      if (!pipDragRef.current || ev.pointerId !== pipDragRef.current.pointerId) return;
      pipDragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  // ─── Monaco Editor Mount & Yjs Binding ─────────────────────────────────────
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }
    const ydoc = ydocRef.current;
    const ytext = ydoc.getText("monaco");

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    const binding = createMonacoYjsBinding(ytext, editor, monaco);
    bindingRef.current = binding;

    if (ytext.toString().length === 0) {
      setTimeout(() => {
        if (ydocRef.current) {
          const yt = ydocRef.current.getText("monaco");
          if (yt.toString().length === 0) {
            const tmpl = LANGUAGE_TEMPLATES[currentLanguageRef.current] || LANGUAGE_TEMPLATES.javascript;
            ydocRef.current.transact(() => {
              yt.insert(0, tmpl);
            }, "local-seed");
          }
        }
      }, 250);
    }

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

  useEffect(() => {
    if (viewMode !== "code" && bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
      editorRef.current = null;
    }
  }, [viewMode]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || viewMode !== "code") return;
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
  }, [remoteCursors, viewMode]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    socket?.emit("code:language-change", {
      roomId,
      language: newLang,
      user: { name: currentUserName, email: currentUserEmail },
    });

    if (ydocRef.current) {
      const ytext = ydocRef.current.getText("monaco");
      if (ytext.toString().trim().length === 0) {
        ytext.insert(0, LANGUAGE_TEMPLATES[newLang] || "");
      }
    }
  };

  const handleResetTemplate = () => {
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText("monaco");
      ydocRef.current.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, LANGUAGE_TEMPLATES[language] || "");
      }, "local-reset");

      const fullState = Array.from(Y.encodeStateAsUpdate(ydocRef.current));
      socket?.emit("code:reset", {
        roomId,
        update: fullState,
        language,
        user: { name: currentUserName, email: currentUserEmail },
      });
      toast.info("Editor reset to starter template");
    }
  };

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

      socket?.emit("code:execution-output", {
        roomId,
        output: runOut,
        error: runErr,
        language,
        durationMs,
        user: { name: currentUserName, email: currentUserEmail },
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to execute code";
      setOutputError(msg);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyCode = () => {
    const code = ydocRef.current
      ? ydocRef.current.getText("monaco").toString()
      : editorRef.current?.getValue() || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  const handleSendQuickChat = (e) => {
    e?.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msg = {
      id: msgId,
      sender: currentUserName,
      senderEmail: currentUserEmail,
      senderImage: currentUserImage,
      color: userColor,
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    seenChatIdsRef.current.add(msgId);
    setChatMessages((prev) => [...prev, msg]);
    socket?.emit("code:quick-chat", {
      roomId,
      to: getTargetPeer(),
      message: msg,
    });
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
        onCloseRef.current?.();
      } else {
        setRemainingSecs(secsLeft);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [schedule?.startTime, schedule?.isInstantCall, schedule?.durationMinutes, serverOffset, cleanup]);

  // ─── Media Controls ────────────────────────────────────────────────────────
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
    emitMediaState({ isMuted: nextMuted });
  };

  const handleToggleCamera = async () => {
    const nextCameraOff = !isCameraOff;
    if (streamRef.current && streamRef.current.getVideoTracks().length > 0) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextCameraOff;
      });
      setIsCameraOff(nextCameraOff);
      emitMediaState({ isCameraOff: nextCameraOff });
      return;
    }

    if (!nextCameraOff) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: LOW_LATENCY_VIDEO_CONSTRAINTS,
        });
        const camTrack = camStream.getVideoTracks()[0];
        if (camTrack && "contentHint" in camTrack) {
          camTrack.contentHint = "motion";
        }
        if (!streamRef.current) streamRef.current = new MediaStream();
        streamRef.current.addTrack(camTrack);
        setHasLocalVideo(true);
        setIsCameraOff(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
        if (pcRef.current) {
          const camSender = pcRef.current.addTrack(camTrack, streamRef.current);
          tuneSenderLowLatency(camSender, "camera");
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket?.emit("rtc:offer", {
            to: getTargetPeer(),
            roomId,
            from: currentUserEmail,
            offer: pcRef.current.localDescription,
            scheduleId: schedule?._id,
          });
        }
        emitMediaState({ isCameraOff: false, cameraStreamId: streamRef.current.id });
      } catch {
        toast.error("Unable to access camera.");
      }
    }
  };

  // ─── Dual-Track Screen Share (keeps BOTH faces visible!) ──────────────────
  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (pcRef.current && screenSenderRef.current) {
      try {
        pcRef.current.removeTrack(screenSenderRef.current);
        screenSenderRef.current = null;
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket?.emit("rtc:offer", {
          to: getTargetPeer(),
          roomId,
          from: currentUserEmail,
          offer: pcRef.current.localDescription,
          scheduleId: schedule?._id,
        });
      } catch (err) {
        console.warn("Error removing screen share track:", err);
      }
    }

    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setSpotlightTile((prev) => (prev === "local-screen" ? null : prev));
    emitMediaState({ isScreenSharing: false, screenStreamId: null });
  }, [emitMediaState, socket, getTargetPeer, roomId, currentUserEmail, schedule?._id]);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack && "contentHint" in screenTrack) {
        screenTrack.contentHint = "detail";
      }

      // Notify peer of screenStreamId BEFORE sending SDP offer so peer splits Screen vs Camera!
      emitMediaState({
        isScreenSharing: true,
        screenStreamId: screenStream.id,
        cameraStreamId: streamRef.current?.id || null,
      });

      if (pcRef.current) {
        // Add as a SECOND independent video track so webcam face stream keeps running!
        screenSenderRef.current = pcRef.current.addTrack(screenTrack, screenStream);
        tuneSenderLowLatency(screenSenderRef.current, "screen");

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket?.emit("rtc:offer", {
          to: getTargetPeer(),
          roomId,
          from: currentUserEmail,
          offer: pcRef.current.localDescription,
          scheduleId: schedule?._id,
        });
      }

      if (localScreenRef.current) {
        localScreenRef.current.srcObject = screenStream;
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      setSpotlightTile("local-screen");
      toast.success("Screen sharing started — both cameras remain visible!");
    } catch {
      // User cancelled screen picker
    }
  };

  const handleEndCall = () => {
    if (socket) {
      socket.emit("rtc:end", { to: getTargetPeer(), roomId, scheduleId: schedule?._id });
    }
    cleanup();
    onCloseRef.current?.();
  };

  const formatCountdown = (totalSeconds) => {
    const secs = Math.max(0, totalSeconds);
    return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  };

  const showWarning = remainingSecs !== null && remainingSecs <= 60 && remainingSecs > 0;
  const showRemoteAvatarOverlay = !hasRemoteVideo || peerMediaState.isCameraOff;
  const showLocalAvatarOverlay = !hasLocalVideo || isCameraOff;

  const isAnyScreenActive = hasRemoteScreen || peerMediaState.isScreenSharing || isScreenSharing;
  const activeScreenTile =
    hasRemoteScreen || peerMediaState.isScreenSharing ? "remote-screen" : isScreenSharing ? "local-screen" : null;

  // Render helper for Remote Face Tile
  const renderRemoteFaceTile = (extraClass = "", compact = false, mini = false) => {
    const isPeerWaiting = peerCallState === "waiting";
    const isPeerLeft = peerCallState === "left";
    const remoteInactive = isPeerWaiting || isPeerLeft;
    const labelName = isPeerLeft && leftPeerName ? leftPeerName : peerDisplayName;

    return (
      <div
        onDoubleClick={() => handleToggleTileFullscreen("remote")}
        className={`relative ${mini ? "rounded-xl" : "rounded-2xl"} overflow-hidden flex items-center justify-center shadow-2xl transition-all group ${
          isPeerLeft
            ? "bg-rose-950/25 border border-rose-500/40"
            : isPeerWaiting
            ? "bg-slate-900/75 border border-dashed border-slate-700"
            : rtcConnected
            ? "bg-slate-900 border border-slate-700/80"
            : "bg-slate-900 border border-slate-800"
        } ${extraClass}`}
      >
        <video
          ref={attachRemoteVideo}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${
            remoteInactive || showRemoteAvatarOverlay ? "opacity-0" : "opacity-100"
          }`}
        />

        {(remoteInactive || showRemoteAvatarOverlay) && (
          <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-slate-900/95 ${mini ? "p-1" : "p-3"} text-center`}>
            {isPeerLeft ? (
              <>
                <div
                  className={`relative ${
                    mini ? "w-6 h-6 mb-0.5" : compact ? "w-11 h-11 mb-2" : "w-16 h-16 mb-2"
                  } rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg`}
                >
                  <PhoneOff size={mini ? 12 : compact ? 18 : 26} />
                </div>
                <span className={`${mini ? "text-[9px]" : compact ? "text-xs" : "text-sm"} font-bold text-white truncate max-w-full`}>
                  {labelName}
                </span>
                <span className={`mt-0.5 px-1.5 py-0.5 rounded-full ${mini ? "text-[8px]" : "text-[10px]"} font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30`}>
                  {mini ? "Left" : "Left the call"}
                </span>
                {!compact && (
                  <span className="text-xs text-slate-400 mt-1.5">
                    Disconnected — waiting if they rejoin
                  </span>
                )}
              </>
            ) : isPeerWaiting ? (
              <>
                <div
                  className={`relative ${
                    mini ? "w-6 h-6 mb-0.5" : compact ? "w-11 h-11 mb-2" : "w-16 h-16 mb-2"
                  } rounded-full bg-slate-800/90 border border-dashed border-slate-600 flex items-center justify-center text-slate-400`}
                >
                  <Clock size={mini ? 12 : compact ? 18 : 24} className="animate-pulse text-indigo-400" />
                </div>
                <span className={`${mini ? "text-[9px]" : compact ? "text-xs" : "text-sm"} font-semibold text-slate-300 truncate max-w-full`}>
                  {labelName}
                </span>
                <span className={`mt-0.5 px-1.5 py-0.5 rounded-full ${mini ? "text-[8px]" : "text-[10px]"} font-semibold bg-slate-800 text-slate-400 border border-slate-700`}>
                  {mini ? "Waiting" : "Not joined yet"}
                </span>
                {!compact && (
                  <span className="text-xs text-slate-500 mt-1.5">
                    Waiting for partner to join the room...
                  </span>
                )}
              </>
            ) : (
              <>
                <div
                  className={`relative overflow-hidden ${
                    mini ? "w-7 h-7 text-xs mb-0.5" : compact ? "w-12 h-12 text-lg mb-2" : "w-20 h-20 text-2xl mb-2"
                  } rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-xl ring-2 ring-white/15`}
                >
                  <span>{labelName[0]?.toUpperCase() || "P"}</span>
                  {peerAvatarImage && (
                    <img
                      src={peerAvatarImage}
                      alt={labelName}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className={`${mini ? "text-[9px]" : compact ? "text-xs" : "text-sm"} font-bold text-white truncate max-w-full`}>
                  {labelName}
                </span>
                {!compact && (
                  <span className="text-xs text-slate-400 mt-1">
                    {rtcConnected
                      ? peerMediaState.isCameraOff
                        ? "Camera is turned off"
                        : "Connected"
                      : "Connecting audio & video..."}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Expand / Fullscreen button */}
        {!mini && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTileFullscreen("remote");
            }}
            title={spotlightTile === "remote" ? "Exit Full Screen" : "Full Screen"}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/75 hover:bg-indigo-600 text-white border border-white/10 opacity-85 group-hover:opacity-100 transition cursor-pointer z-10"
          >
            {spotlightTile === "remote" ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}

        {peerCallState === "joined" && (
          <div
            className={`absolute ${
              mini
                ? "bottom-1 left-1 px-1.5 py-0.5 text-[9px] gap-1 max-w-[92%]"
                : "bottom-2.5 left-2.5 pl-1.5 pr-2.5 py-1 text-xs gap-1.5 max-w-[85%]"
            } rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 font-semibold text-white flex items-center`}
          >
            {!mini && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                <span>{labelName[0]?.toUpperCase() || "P"}</span>
                {peerAvatarImage && (
                  <img
                    src={peerAvatarImage}
                    alt={labelName}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            <span className="truncate">{labelName}</span>
            {peerMediaState.isMuted && <MicOff size={mini ? 10 : 12} className="text-rose-400 shrink-0" />}
          </div>
        )}
      </div>
    );
  };

  // Render helper for Local Face Tile
  const renderLocalFaceTile = (extraClass = "", compact = false, mini = false) => (
    <div
      onDoubleClick={() => handleToggleTileFullscreen("local")}
      className={`relative ${mini ? "rounded-xl" : "rounded-2xl"} bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center shadow-2xl transition-all group ${extraClass}`}
    >
      <video
        ref={attachLocalVideo}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover scale-x-[-1] ${showLocalAvatarOverlay ? "hidden" : "block"}`}
      />

      {showLocalAvatarOverlay && (
        <div className={`flex flex-col items-center justify-center text-slate-300 ${mini ? "space-y-0.5 p-1" : "space-y-1.5 p-3"}`}>
          <div
            className={`relative overflow-hidden ${
              mini ? "w-7 h-7 text-xs" : compact ? "w-12 h-12 text-lg" : "w-20 h-20 text-2xl"
            } rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-extrabold shadow-xl ring-2 ring-white/15`}
          >
            <span>{currentUserName[0]?.toUpperCase() || "Y"}</span>
            {currentUserImage && (
              <img
                src={currentUserImage}
                alt={currentUserName}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
          <span className={`${mini ? "text-[9px]" : compact ? "text-xs" : "text-sm"} font-bold text-white text-center truncate max-w-full`}>
            {mini ? "You" : `${currentUserName} (You)`}
          </span>
          {!compact && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <VideoOff size={13} /> Camera Off
            </span>
          )}
        </div>
      )}

      {!mini && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTileFullscreen("local");
          }}
          title={spotlightTile === "local" ? "Exit Full Screen" : "Full Screen"}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/75 hover:bg-indigo-600 text-white border border-white/10 opacity-85 group-hover:opacity-100 transition cursor-pointer z-10"
        >
          {spotlightTile === "local" ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      <div
        className={`absolute ${
          mini
            ? "bottom-1 left-1 px-1.5 py-0.5 text-[9px] gap-1 max-w-[92%]"
            : "bottom-2.5 left-2.5 pl-1.5 pr-2.5 py-1 text-xs gap-1.5 max-w-[85%]"
        } rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 font-semibold text-white flex items-center`}
      >
        {!mini && (
          <div className="relative w-5 h-5 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            <span>{currentUserName[0]?.toUpperCase() || "Y"}</span>
            {currentUserImage && (
              <img
                src={currentUserImage}
                alt={currentUserName}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
        )}
        <span className="truncate">{mini ? "You" : `${currentUserName} (You)`}</span>
        {isMuted && <MicOff size={mini ? 10 : 12} className="text-rose-400 shrink-0" />}
      </div>
    </div>
  );

  // Render helper for Screen Share Stage Tile (Remote or Local)
  const renderScreenShareTile = (isRemoteScreen, extraClass = "") => {
    const tileId = isRemoteScreen ? "remote-screen" : "local-screen";
    const isSpot = spotlightTile === tileId;
    return (
      <div
        onDoubleClick={() => handleToggleTileFullscreen(tileId)}
        className={`relative rounded-2xl bg-black border-2 ${
          isRemoteScreen ? "border-indigo-500/70" : "border-emerald-500/70"
        } overflow-hidden flex items-center justify-center shadow-2xl group ${extraClass}`}
      >
        <video
          ref={isRemoteScreen ? attachRemoteScreen : attachLocalScreen}
          autoPlay
          muted={!isRemoteScreen}
          playsInline
          className="w-full h-full object-contain bg-black"
        />

        {/* Top-Left Screen Share Indicator */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/85 border border-white/15 text-xs font-bold text-white flex items-center gap-2 shadow-lg">
          <Monitor size={13} className={isRemoteScreen ? "text-indigo-400" : "text-emerald-400"} />
          <span>
            {isRemoteScreen ? `${peerDisplayName}'s Shared Screen` : "You are sharing your screen"}
          </span>
        </div>

        {/* Top-Right Fullscreen Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTileFullscreen(tileId);
          }}
          title={isSpot ? "Exit Full Screen" : "Expand Shared Screen to Full Screen"}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer z-10"
        >
          {isSpot ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isSpot ? "Exit Full Screen" : "Full Screen"}</span>
        </button>
      </div>
    );
  };

  return (
    <div
      ref={rootOverlayRef}
      style={{ touchAction: isWhiteboardFullscreen ? "none" : "auto" }}
      className="fixed inset-0 h-[100dvh] w-screen z-[99999] bg-[#090d16] flex flex-col overflow-hidden text-slate-100 font-sans select-none"
    >
      {/* Dedicated persistent audio element so remote voice plays cleanly in all views */}
      <audio ref={attachRemoteAudio} autoPlay playsInline className="hidden" />
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

      {/* ── TOP ZOOM-STYLE HEADER BAR (hidden in edge-to-edge iPad Whiteboard Fullscreen) ── */}
      {!isWhiteboardFullscreen && (
        <header className="h-14 px-4 bg-slate-900/95 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Video size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-2">
              <span>{schedule?.title || "Live Collaborative Meeting"}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                  peerCallState === "left"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : peerCallState === "waiting"
                    ? "bg-slate-800 text-slate-300 border-slate-700"
                    : rtcConnected
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    peerCallState === "left"
                      ? "bg-rose-400"
                      : peerCallState === "waiting"
                      ? "bg-slate-400 animate-pulse"
                      : rtcConnected
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                {peerCallState === "left"
                  ? "Partner Left"
                  : peerCallState === "waiting"
                  ? "Waiting"
                  : rtcConnected
                  ? "Connected"
                  : "Connecting..."}
              </span>
            </h2>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                peerCallState === "left"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              <Users
                size={11}
                className={peerCallState === "left" ? "text-rose-400" : "text-indigo-400"}
              />
              {peerCallState === "joined"
                ? "2 Participants"
                : peerCallState === "left"
                ? `${leftPeerName || peerDisplayName} left`
                : "1 Participant (Waiting)"}
            </span>
          </div>
        </div>

        {/* Center: Code Editor Action Controls (Only shown when Code Mode is active) */}
        {viewMode === "code" && (
          <div className="flex items-center gap-2">
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
              <span>Run</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleResetTemplate}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Reset Starter Template"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {/* Right: Expand Workspace, Browser Fullscreen, Timer */}
        <div className="flex items-center gap-2">
          {viewMode !== "video" && (
            <button
              onClick={() => setIsWorkspaceExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title={isWorkspaceExpanded ? "Show Side Video Strip" : "Expand Workspace Fullscreen"}
            >
              {isWorkspaceExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          <button
            onClick={handleToggleBrowserFullscreen}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title={isFullscreenActive ? "Exit Window Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreenActive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFullscreenActive ? "Exit Full" : "Fullscreen"}</span>
          </button>

          {remainingSecs !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-slate-300">
              <Clock size={12} className="text-indigo-400" />
              <span>{formatCountdown(remainingSecs)}</span>
            </div>
          )}
        </div>
      </header>
      )}

      {/* ── TOAST / WARNING BANNERS ── */}
      {errorMsg && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs text-center py-1.5 px-3 font-semibold flex items-center justify-center gap-3 flex-wrap">
          <span>{errorMsg}</span>
          {errorMsg.toLowerCase().includes("connection dropped") && (
            <button
              type="button"
              onClick={() => manualReconnectRef.current?.()}
              className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition cursor-pointer"
            >
              Reconnect Video
            </button>
          )}
        </div>
      )}

      {showWarning && (
        <div className="bg-amber-500 text-slate-950 text-xs text-center py-1.5 font-extrabold">
          ⚠️ Scheduled session will end in {remainingSecs} seconds.
        </div>
      )}

      {reconnecting && (
        <div className="bg-amber-600 text-white text-xs text-center py-1 font-bold">
          Connection drop detected — attempting to reconnect video stream ({reconnectSecsLeft}s)...
        </div>
      )}

      {(callEndedToast || peerCallState === "left") && (
        <div className="bg-rose-600/95 text-white text-xs text-center py-1.5 px-3 font-semibold flex items-center justify-center gap-3">
          <span>
            {leftPeerName || peerDisplayName} left the call. You can stay in the workspace or leave.
          </span>
          <button
            onClick={handleEndCall}
            className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition cursor-pointer"
          >
            End Call
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE BODY ── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* ── MODE 1: CODE EDITOR SPLIT VIEW ── */}
        {viewMode === "code" && (
          <div
            className={`flex flex-col min-h-0 border-r border-slate-800 transition-all ${
              isWorkspaceExpanded ? "w-full" : "w-full lg:w-[66%]"
            }`}
          >
            <div className="flex-1 min-h-0 relative bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 14,
                  minimap: { enabled: isWorkspaceExpanded },
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
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                    <button
                      onClick={() => setIsTerminalOpen(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
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
                    <div className="text-rose-400 whitespace-pre-wrap font-semibold">{outputError}</div>
                  ) : output ? (
                    <div className="text-emerald-300 whitespace-pre-wrap">{output}</div>
                  ) : (
                    <span className="text-slate-500 italic">
                      Click "Run" above to execute your code and share the output in real time.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: WHITEBOARD SPLIT / FULLSCREEN VIEW ── */}
        {viewMode === "whiteboard" && (
          <div
            className={`flex flex-col min-h-0 transition-all ${
              isWhiteboardFullscreen
                ? "w-full h-full"
                : useFloatingPipLayout
                ? "w-full border-r border-slate-800"
                : "w-full lg:w-[66%] border-r border-slate-800"
            }`}
          >
            <WhiteboardCanvas
              roomId={roomId}
              socket={socket}
              currentUserEmail={currentUserEmail}
              currentUserName={currentUserName}
              strokes={whiteboardStrokes}
              onAddStroke={(stroke) => setWhiteboardStrokes((prev) => [...prev, stroke])}
              onUndoStroke={(strokeId) =>
                setWhiteboardStrokes((prev) =>
                  strokeId ? prev.filter((s) => s.id !== strokeId) : prev.slice(0, -1)
                )
              }
              onClearStrokes={() => setWhiteboardStrokes([])}
              isFullscreen={isWhiteboardFullscreen}
              onToggleFullscreen={handleToggleWhiteboardFullscreen}
            />
          </div>
        )}

        {/* ── MODE 3: ZOOM-STYLE VIDEO / SCREEN-SHARE STAGE ── */}
        {viewMode === "video" && (
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 bg-[#090d16] relative">
            {/* CASE A: FULL-SCREEN SPOTLIGHT MODE (Pinned Tile OR Screen Share Fullscreen) */}
            {spotlightTile ? (
              <div className="flex-1 min-h-0 relative flex flex-col">
                {spotlightTile === "remote-screen" && renderScreenShareTile(true, "flex-1 min-h-0")}
                {spotlightTile === "local-screen" && renderScreenShareTile(false, "flex-1 min-h-0")}
                {spotlightTile === "remote" && renderRemoteFaceTile("flex-1 min-h-0")}
                {spotlightTile === "local" && renderLocalFaceTile("flex-1 min-h-0")}

                {/* Floating Face Strip in Bottom-Right so BOTH FACES STAY VISIBLE even in Full Screen! */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 bg-slate-950/75 p-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                  {spotlightTile !== "remote" &&
                    renderRemoteFaceTile("w-40 sm:w-48 h-28 sm:h-32", true)}
                  {spotlightTile !== "local" &&
                    renderLocalFaceTile("w-40 sm:w-48 h-28 sm:h-32", true)}
                </div>
              </div>
            ) : isAnyScreenActive ? (
              /* CASE B: SCREEN SHARE ACTIVE (Main Screen Share + Right Strip with BOTH Faces!) */
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 min-h-0 flex">
                  {activeScreenTile === "remote-screen"
                    ? renderScreenShareTile(true, "flex-1 min-h-0")
                    : renderScreenShareTile(false, "flex-1 min-h-0")}
                </div>
                <div className="h-36 lg:h-auto lg:w-72 shrink-0 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-3">
                  {renderRemoteFaceTile("h-full min-h-0", true)}
                  {renderLocalFaceTile("h-full min-h-0", true)}
                </div>
              </div>
            ) : (
              /* CASE C: PARTNER FULL-STAGE + COMPACT SELF CORNER PiP */
              <div className="flex-1 min-h-0 relative flex flex-col max-w-6xl w-full mx-auto">
                {renderRemoteFaceTile("flex-1 min-h-[260px] w-full h-full")}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 rounded-2xl shadow-2xl">
                  {renderLocalFaceTile("w-28 h-20 sm:w-44 sm:h-28", true, !isDesktop)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SIDE VIDEO STRIP WHEN CODE / WHITEBOARD IS OPEN (DESKTOP) ── */}
        {viewMode !== "video" && !useFloatingPipLayout && (
          <div className="flex w-[34%] flex-col min-h-0 p-3 bg-slate-950 gap-3">
            {isAnyScreenActive ? (
              <>
                {renderScreenShareTile(activeScreenTile === "remote-screen", "flex-1 min-h-0")}
                <div className="h-40 grid grid-cols-2 gap-2.5 shrink-0">
                  {renderRemoteFaceTile("h-full min-h-0", true)}
                  {renderLocalFaceTile("h-full min-h-0", true)}
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 grid grid-rows-[2fr_1fr] gap-3">
                {renderRemoteFaceTile("h-full min-h-0")}
                {renderLocalFaceTile("h-full min-h-0", true)}
              </div>
            )}
          </div>
        )}

        {/* ── COMPACT FLOATING & DRAGGABLE MINI VIDEO PiP ON iPAD / FULLSCREEN / MOBILE ── */}
        {viewMode !== "video" && useFloatingPipLayout && (
          <div
            style={{
              transform: `translate3d(${pipOffset.x}px, ${pipOffset.y}px, 0)`,
              bottom: isWhiteboardFullscreen
                ? "max(0.75rem, env(safe-area-inset-bottom))"
                : "1rem",
              right: isWhiteboardFullscreen
                ? "max(0.75rem, env(safe-area-inset-right))"
                : "1rem",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col absolute z-20 bg-slate-950/85 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-1 text-[10px] font-bold text-slate-300">
              <button
                type="button"
                onPointerDown={handlePipDragStart}
                title="Drag video window"
                style={{ touchAction: "none" }}
                className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-white px-1 py-0.5 rounded"
              >
                <Move size={11} />
                <span>{isPipCollapsed ? "Video Hidden" : "Video PiP"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPipCollapsed((prev) => !prev)}
                title={isPipCollapsed ? "Show Mini Videos" : "Minimize Mini Videos"}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                {isPipCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            {!isPipCollapsed && (
              <div className="flex items-center gap-1.5">
                {renderRemoteFaceTile(
                  isWhiteboardFullscreen
                    ? "w-24 h-16 sm:w-28 sm:h-[72px]"
                    : "w-32 h-20 sm:w-40 sm:h-24",
                  true,
                  isWhiteboardFullscreen
                )}
                {renderLocalFaceTile(
                  isWhiteboardFullscreen
                    ? "w-24 h-16 sm:w-28 sm:h-[72px]"
                    : "w-32 h-20 sm:w-40 sm:h-24",
                  true,
                  isWhiteboardFullscreen
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SLIM FLOATING MINI CALL DOCK IN FULLSCREEN WHITEBOARD MODE ── */}
        {isWhiteboardFullscreen && (
          <div
            style={{
              bottom: "max(0.75rem, env(safe-area-inset-bottom))",
              left: "max(0.75rem, env(safe-area-inset-left))",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-20 flex items-center gap-1.5 bg-slate-950/85 border border-white/15 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-2xl"
          >
            <button
              onClick={handleToggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                isMuted
                  ? "bg-rose-600/25 border border-rose-500 text-rose-300"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
            >
              {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={handleToggleCamera}
              title={isCameraOff ? "Start Video" : "Stop Video"}
              className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                isCameraOff
                  ? "bg-rose-600/25 border border-rose-500 text-rose-300"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
            >
              {isCameraOff ? <VideoOff size={15} /> : <Video size={15} />}
            </button>
            <button
              onClick={handleToggleWhiteboardFullscreen}
              title="Exit Full Screen"
              className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Minimize2 size={14} />
              <span className="hidden sm:inline">Exit Full</span>
            </button>
            <button
              onClick={handleEndCall}
              title="Leave Call"
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
            >
              <PhoneOff size={15} />
            </button>
          </div>
        )}

        {/* ── IN-ROOM QUICK CHAT DRAWER ── */}
        <AnimatePresence>
          {isChatOpen && (
            <Motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-800 z-30 flex flex-col shadow-2xl backdrop-blur-xl"
            >
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-indigo-400" />
                  <span>Meeting Chat</span>
                </span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 px-4">
                    <MessageSquare size={22} className="text-slate-600 mb-2" />
                    <span>No messages yet. Share links, notes, or questions!</span>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isSelf =
                      msg.senderEmail?.toLowerCase() === (currentUserEmail || "").toLowerCase();
                    const senderName = isSelf ? currentUserName : msg.sender || peerDisplayName;
                    const senderAvatar =
                      msg.senderImage || (isSelf ? currentUserImage : peerAvatarImage);
                    return (
                      <div
                        key={msg.id || `${msg.senderEmail}-${msg.time}-${msg.text}`}
                        className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`relative w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                            isSelf ? "bg-indigo-600" : "bg-slate-700"
                          }`}
                        >
                          <span>{senderName?.[0]?.toUpperCase() || "U"}</span>
                          {senderAvatar && (
                            <img
                              src={senderAvatar}
                              alt={senderName}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div
                          className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs shadow-sm ${
                            isSelf
                              ? "bg-indigo-600/35 border border-indigo-500/40 text-white rounded-br-sm"
                              : "bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-400 mb-0.5">
                            <span className="truncate">{isSelf ? "You" : senderName}</span>
                            <span className="shrink-0">{msg.time}</span>
                          </div>
                          <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendQuickChat} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900/80">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition shrink-0 cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM ZOOM-STYLE CONTROLS BAR (hidden in edge-to-edge iPad Whiteboard Fullscreen) ── */}
      {!isWhiteboardFullscreen && (
      <footer className="h-[72px] px-4 sm:px-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Left: Terminal Toggle (Code) or Video View Return */}
        <div className="flex items-center gap-2 min-w-[90px]">
          {viewMode === "code" ? (
            <button
              onClick={() => setIsTerminalOpen((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isTerminalOpen
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <Terminal size={15} />
              <span className="hidden sm:inline">Terminal</span>
            </button>
          ) : viewMode !== "video" ? (
            <button
              onClick={() => handleSwitchMode("video")}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Video size={15} />
              <span className="hidden sm:inline">Video View</span>
            </button>
          ) : null}
        </div>

        {/* Center: Mic, Camera, Share Screen, Code, Whiteboard, End */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleToggleMute}
            className={`px-3 sm:px-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isMuted
                ? "bg-rose-600/25 border border-rose-500 text-rose-300"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
            <span className="hidden md:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            onClick={handleToggleCamera}
            className={`px-3 sm:px-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isCameraOff
                ? "bg-rose-600/25 border border-rose-500 text-rose-300"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isCameraOff ? "Start Video" : "Stop Video"}
          >
            {isCameraOff ? <VideoOff size={17} /> : <Video size={17} />}
            <span className="hidden md:inline">{isCameraOff ? "Start Video" : "Stop Video"}</span>
          </button>

          <button
            onClick={handleToggleScreenShare}
            className={`px-3 sm:px-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border ${
              isScreenSharing
                ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen (keeps faces visible)"}
          >
            {isScreenSharing ? <MonitorOff size={17} /> : <Monitor size={17} />}
            <span className="hidden md:inline">
              {isScreenSharing ? "Stop Share" : "Share Screen"}
            </span>
          </button>

          <button
            onClick={() => handleSwitchMode("code")}
            className={`px-3 sm:px-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border ${
              viewMode === "code"
                ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
            title="Share & Open Real-Time Code Editor"
          >
            <Code2 size={17} />
            <span className="hidden sm:inline">Code</span>
          </button>

          <button
            onClick={() => handleSwitchMode("whiteboard")}
            className={`px-3 sm:px-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border ${
              viewMode === "whiteboard"
                ? "bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-600/30"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
            title="Share & Open Real-Time Whiteboard"
          >
            <PenTool size={17} />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>

          <button
            onClick={handleEndCall}
            className="px-4 h-11 rounded-xl flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all font-bold text-xs gap-1.5 cursor-pointer ml-1"
            title="Leave Meeting"
          >
            <PhoneOff size={17} />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>

        {/* Right: Quick Chat Toggle */}
        <div className="flex items-center justify-end gap-2 min-w-[90px]">
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer relative ${
              isChatOpen
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Toggle Meeting Chat"
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold leading-none">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </footer>
      )}
    </div>
  );
};

export default VideoCallOverlay;
