import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  ShieldCheck,
  EyeOff,
  Lock,
  Gauge,
} from "lucide-react";
import { toast } from "@/components/ui/toast-system";

let ytApiPromise = null;

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === "function") prevCallback();
      resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

function formatTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const WATERMARK_POSITIONS = [
  "top-14 left-6",
  "top-16 right-6",
  "bottom-20 left-8",
  "bottom-20 right-8",
];

/**
 * ProtectedVideoPlayer — Custom Website Video Player backed by YouTube IFrame API.
 * Completely hides native YouTube UI, Share/Copy Link chrome, right-click menus,
 * and adds dynamic user watermarking + capture/focus privacy shielding.
 */
const ProtectedVideoPlayer = (props) => {
  return <ProtectedVideoStage key={props.videoId || "empty"} {...props} />;
};

const ProtectedVideoStage = ({
  videoId,
  title = "Lesson Video",
  lessonTitle = "",
  viewerEmail = "Learner",
  viewerName = "",
  progressStatus = null,
  hasNext = false,
  hasPrev = false,
  onNext,
  onPrev,
  onMarkWatched,
  onSkipVideo,
  previewMode = false,
  autoplay = true,
}) => {
  const wrapperRef = useRef(null);
  const mountNodeRef = useRef(null);
  const playerRef = useRef(null);
  const autoCompletedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(90);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [privacyShielded, setPrivacyShielded] = useState(false);
  const [shieldReason, setShieldReason] = useState("");
  const [watermarkIdx, setWatermarkIdx] = useState(0);

  const liveRefs = useRef({
    volume,
    isMuted,
    playbackRate,
    progressStatus,
    onMarkWatched,
  });
  useEffect(() => {
    liveRefs.current = {
      volume,
      isMuted,
      playbackRate,
      progressStatus,
      onMarkWatched,
    };
  }, [volume, isMuted, playbackRate, progressStatus, onMarkWatched]);

  // Rotate dynamic watermark position cleanly
  useEffect(() => {
    const id = setInterval(() => {
      setWatermarkIdx((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  // Boot YouTube IFrame Player with native chrome & keyboard disabled
  useEffect(() => {
    if (!videoId || !mountNodeRef.current) return undefined;
    let active = true;
    const hostContainer = mountNodeRef.current;

    loadYouTubeIframeApi().then((YT) => {
      if (!active || !hostContainer) return;

      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore stale player cleanup errors
      }

      // Create fresh child node so YT.Player can safely replace it with an iframe
      hostContainer.innerHTML = "";
      const playerHost = document.createElement("div");
      hostContainer.appendChild(playerHost);

      playerRef.current = new YT.Player(playerHost, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (!active) return;
            const snap = liveRefs.current;
            setIsReady(true);
            const dur = e.target.getDuration?.() || 0;
            setDuration(dur);
            if (snap.isMuted) e.target.mute?.();
            else e.target.setVolume?.(snap.volume);
            e.target.setPlaybackRate?.(snap.playbackRate);
            const iframeEl = e.target.getIframe?.();
            if (iframeEl) {
              iframeEl.setAttribute("tabindex", "-1");
              iframeEl.setAttribute("aria-hidden", "true");
              iframeEl.style.pointerEvents = "none";
            }
          },
          onStateChange: (e) => {
            if (!active || !window.YT) return;
            const snap = liveRefs.current;
            const state = e.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasEnded(false);
              const dur = e.target.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setHasEnded(true);
              if (!autoCompletedRef.current && snap.progressStatus !== "watched") {
                autoCompletedRef.current = true;
                snap.onMarkWatched?.({
                  watchedSeconds: Math.round(e.target.getDuration?.() || 0),
                  durationSeconds: Math.round(e.target.getDuration?.() || 0),
                });
              }
            }
          },
        },
      });
    });

    return () => {
      active = false;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore cleanup error
      }
      playerRef.current = null;
    };
  }, [videoId, autoplay]);

  // Poll time & handle automatic >=90% completion mark
  useEffect(() => {
    if (!isReady) return undefined;
    const timer = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      const cur = p.getCurrentTime() || 0;
      const dur = p.getDuration?.() || 0;
      setCurrentTime(cur);
      if (dur > 0) {
        setDuration(dur);
        if (
          !autoCompletedRef.current &&
          progressStatus !== "watched" &&
          cur / dur >= 0.9
        ) {
          autoCompletedRef.current = true;
          onMarkWatched?.({
            watchedSeconds: Math.round(cur),
            durationSeconds: Math.round(dur),
          });
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isReady, progressStatus, onMarkWatched]);

  // Anti-screenshot, shortcut guard, and window focus privacy curtain
  const triggerPrivacyShield = useCallback(
    (reason) => {
      if (previewMode) return;
      try {
        playerRef.current?.pauseVideo?.();
      } catch {
        // ignore
      }
      setShieldReason(reason || "Protected Content Paused");
      setPrivacyShielded(true);
    },
    [previewMode]
  );

  useEffect(() => {
    if (previewMode) return undefined;

    const handleVisibility = () => {
      if (document.hidden) {
        triggerPrivacyShield("Window switched or hidden — stream protected.");
      }
    };

    const handleWindowBlur = () => {
      triggerPrivacyShield("Screen focus lost — capture & share protection active.");
    };

    const handleKeyDown = (e) => {
      const key = e.key;
      const isModifierCapture =
        key === "PrintScreen" ||
        ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(key.toLowerCase())) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["s", "i", "3", "4", "5"].includes(key.toLowerCase()));

      if (isModifierCapture) {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        triggerPrivacyShield("Screen capture, saving, and external sharing are disabled for course videos.");
        toast.warning("Protected Stream", {
          description: "Screenshots, downloads, and link sharing are restricted on course lessons.",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [previewMode, triggerPrivacyShield]);

  // Track Fullscreen changes on wrapper container
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p || !isReady) return;
    if (privacyShielded) {
      setPrivacyShielded(false);
    }
    if (isPlaying) {
      p.pauseVideo?.();
    } else {
      if (hasEnded) p.seekTo?.(0, true);
      p.playVideo?.();
    }
  };

  const seekBy = (deltaSeconds) => {
    const p = playerRef.current;
    if (!p || !isReady) return;
    const next = Math.min(duration || 0, Math.max(0, (p.getCurrentTime?.() || 0) + deltaSeconds));
    p.seekTo?.(next, true);
    setCurrentTime(next);
  };

  const handleSeekInput = (e) => {
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    playerRef.current?.seekTo?.(nextTime, true);
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unMute?.();
      p.setVolume?.(volume || 80);
      setIsMuted(false);
    } else {
      p.mute?.();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    const p = playerRef.current;
    if (!p) return;
    if (val === 0) {
      p.mute?.();
      setIsMuted(true);
    } else {
      p.unMute?.();
      p.setVolume?.(val);
      setIsMuted(false);
    }
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(next);
    playerRef.current?.setPlaybackRate?.(next);
  };

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore fullscreen errors
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={wrapperRef}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      className={`protected-player-root relative w-full bg-black overflow-hidden select-none group ${
        isFullscreen ? "h-screen w-screen flex items-center justify-center" : "aspect-video"
      }`}
    >
      <style>{`
        @media print {
          .protected-player-root {
            display: none !important;
          }
        }
      `}</style>

      {/* Non-interactive YouTube IFrame Mount Layer */}
      <div
        ref={mountNodeRef}
        className="w-full h-full pointer-events-none select-none scale-[1.01]"
      />

      {/* Top Branded Theater Bar (shields top YouTube chrome cleanly) */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 py-3 bg-gradient-to-b from-[#030712]/95 via-[#030712]/70 to-transparent flex items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/35 text-[10px] font-mono font-bold text-indigo-200 shrink-0 backdrop-blur-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            PROTECTED STREAM
          </span>
          <div className="min-w-0">
            {lessonTitle && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {lessonTitle}
              </span>
            )}
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
              {title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {progressStatus === "watched" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
              <CheckCircle2 className="w-3 h-3" />
              Watched
            </span>
          )}
          {progressStatus === "skipped" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 backdrop-blur-md">
              <SkipForward className="w-3 h-3" />
              Skipped
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700/70 text-[10px] font-mono text-slate-300">
            <Lock className="w-2.5 h-2.5 text-rose-400" />
            No Share
          </span>
        </div>
      </div>

      {/* Dynamic Anti-Leak User Watermark */}
      {!previewMode && viewerEmail && (
        <div
          className={`absolute z-20 pointer-events-none transition-all duration-1000 opacity-30 ${WATERMARK_POSITIONS[watermarkIdx]}`}
        >
          <div className="px-2.5 py-1 rounded-lg bg-black/45 border border-white/10 text-[10px] font-mono text-white/80 tracking-wider backdrop-blur-xs">
            {viewerName ? `${viewerName} • ` : ""}
            {viewerEmail} • CSE LMS
          </div>
        </div>
      )}

      {/* Interactive Transparent Shield over Iframe (Blocks Right Click & YouTube Links) */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-pointer"
        title="Click to Play/Pause • Double-click for Fullscreen"
      />

      {/* Branded Pause / Ended Center Overlay (Masks YouTube related-videos wall) */}
      {(!isPlaying || hasEnded) && !privacyShielded && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-15 bg-[#030712]/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-opacity"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.45)] hover:scale-105 transition-transform mb-3">
            {hasEnded ? (
              <RotateCcw className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 text-white ml-0.5 fill-white" />
            )}
          </div>
          <p className="text-sm sm:text-base font-black text-white max-w-md truncate">
            {hasEnded ? "Video Finished" : isReady ? title : "Loading Protected Video Stream..."}
          </p>
          <p className="text-[11px] text-slate-300 mt-1">
            {hasEnded
              ? "Great job! Replay or continue to the next video."
              : "Click anywhere to resume playback"}
          </p>

          {hasEnded && hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg"
            >
              <span>Play Next Video</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Privacy Curtain Overlay on Focus Loss / Screenshot Attempt */}
      {privacyShielded && (
        <div className="absolute inset-0 z-30 bg-[#030712]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <EyeOff className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-base font-black text-white">Protected Content Shield Active</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {shieldReason || "External sharing, printing, and screen capture are restricted."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPrivacyShielded(false);
              playerRef.current?.playVideo?.();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Resume Protected Stream</span>
          </button>
        </div>
      )}

      {/* Custom Website Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 inset-x-0 z-25 bg-gradient-to-t from-[#030712] via-[#030712]/90 to-transparent px-3 sm:px-5 pt-8 pb-3 space-y-2"
      >
        {/* Interactive Scrub Seekbar */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-slate-300 w-10 text-right shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeekInput}
              className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer"
              aria-label="Seek video timeline"
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-slate-200">
          {/* Left Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekBy(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => seekBy(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {hasPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Previous Video"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            {hasNext && (
              <button
                type="button"
                onClick={onNext}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Next Video"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-indigo-500 cursor-pointer"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Right Controls: Progress Actions, Speed & Custom Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onMarkWatched && (
              <button
                type="button"
                onClick={() =>
                  onMarkWatched({
                    watchedSeconds: Math.round(currentTime),
                    durationSeconds: Math.round(duration),
                  })
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  progressStatus === "watched"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-900/90 hover:bg-emerald-600/20 border-slate-700 text-slate-200 hover:text-emerald-300"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{progressStatus === "watched" ? "Watched" : "Mark Watched"}</span>
              </button>
            )}

            {onSkipVideo && (
              <button
                type="button"
                onClick={() =>
                  onSkipVideo({
                    watchedSeconds: Math.round(currentTime),
                    durationSeconds: Math.round(duration),
                  })
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  progressStatus === "skipped"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-900/90 hover:bg-amber-600/20 border-slate-700 text-slate-300 hover:text-amber-300"
                }`}
              >
                <SkipForward className="w-3 h-3" />
                <span>Skip</span>
              </button>
            )}

            <button
              type="button"
              onClick={cycleSpeed}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-200"
              title="Playback Speed"
            >
              <Gauge className="w-3 h-3 text-indigo-400" />
              <span>{playbackRate}x</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedVideoPlayer;
