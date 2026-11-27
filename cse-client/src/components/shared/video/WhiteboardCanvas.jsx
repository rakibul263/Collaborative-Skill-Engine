import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pen,
  Eraser,
  Square,
  Circle,
  Minus,
  Highlighter,
  Undo2,
  Trash2,
  Download,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
} from "lucide-react";

const LIGHT_COLORS = [
  { name: "Black", hex: "#0f172a" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Emerald", hex: "#059669" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Cyan", hex: "#0284c7" },
];

const DARK_COLORS = [
  { name: "White", hex: "#f8fafc" },
  { name: "Indigo", hex: "#818cf8" },
  { name: "Emerald", hex: "#34d399" },
  { name: "Rose", hex: "#fb7185" },
  { name: "Amber", hex: "#fbbf24" },
  { name: "Cyan", hex: "#22d3ee" },
];

const SIZES = [2, 4, 8, 14];
const FREEHAND_TOOLS = new Set(["pen", "highlighter", "eraser"]);

/**
 * Resolve adaptive stroke color when switching between Light and Dark boards.
 */
const resolveStrokeColor = (rawColor, tool, isDarkBoard, boardBg) => {
  if (tool === "eraser") return boardBg;
  const c = rawColor || (isDarkBoard ? "#f8fafc" : "#0f172a");
  const lower = c.toLowerCase();
  if (!isDarkBoard && lower === "#f8fafc") return "#0f172a";
  if (isDarkBoard && lower === "#0f172a") return "#f8fafc";
  return c;
};

/**
 * Draw a single stroke/shape using smooth quadratic midpoint interpolation
 * for freehand tools and crisp geometry for shapes. Coordinates are normalized (0..1).
 */
const drawStrokeOnContext = (ctx, stroke, w, h, isDarkBoard, boardBg) => {
  if (!stroke || !w || !h) return;

  const isEraser = stroke.tool === "eraser";
  const isHighlighter = stroke.tool === "highlighter";
  const strokeColor = resolveStrokeColor(stroke.color, stroke.tool, isDarkBoard, boardBg);
  const lineWidth = isHighlighter
    ? (stroke.size || 4) * 3
    : isEraser
    ? (stroke.size || 4) * 3.5
    : stroke.size || 4;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.globalAlpha = isHighlighter ? 0.35 : 1;
  ctx.lineWidth = lineWidth;

  if (FREEHAND_TOOLS.has(stroke.tool)) {
    const pts = stroke.points;
    if (!Array.isArray(pts) || pts.length === 0) {
      ctx.restore();
      return;
    }
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * w, pts[0].y * h, Math.max(1, lineWidth / 2), 0, Math.PI * 2);
      ctx.fill();
    } else if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      ctx.lineTo(pts[1].x * w, pts[1].y * h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = ((pts[i].x + pts[i + 1].x) * 0.5) * w;
        const yc = ((pts[i].y + pts[i + 1].y) * 0.5) * h;
        ctx.quadraticCurveTo(pts[i].x * w, pts[i].y * h, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * w, last.y * h);
      ctx.stroke();
    }
  } else if (stroke.start && stroke.end) {
    const x1 = stroke.start.x * w;
    const y1 = stroke.start.y * h;
    const x2 = stroke.end.x * w;
    const y2 = stroke.end.y * h;

    ctx.beginPath();
    if (stroke.tool === "line") {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (stroke.tool === "rect") {
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
    } else if (stroke.tool === "circle") {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  ctx.restore();
};

/**
 * Paint board background + lightweight pattern dot grid once onto an offscreen canvas.
 */
const paintBoardBackground = (ctx, w, h, isDarkBoard, boardBg) => {
  ctx.fillStyle = boardBg;
  ctx.fillRect(0, 0, w, h);

  const step = 26;
  const tile = document.createElement("canvas");
  tile.width = step;
  tile.height = step;
  const tileCtx = tile.getContext("2d");
  if (tileCtx) {
    tileCtx.fillStyle = isDarkBoard
      ? "rgba(148, 163, 184, 0.18)"
      : "rgba(15, 23, 42, 0.12)";
    tileCtx.fillRect(step - 2, step - 2, 1.5, 1.5);
    const pattern = ctx.createPattern(tile, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
  }
};

/**
 * Real-time Collaborative Whiteboard Canvas
 *
 * Uses two-layer rendering (offscreen cached base canvas + lightweight active RAF overlay),
 * Pointer Events with iPad Touch / Apple Pencil coalesced input + palm rejection,
 * HiDPI Retina scaling, and incremental delta point streaming.
 */
const WhiteboardCanvas = ({
  roomId,
  socket,
  currentUserEmail,
  currentUserName,
  strokes = [],
  onAddStroke,
  onUndoStroke,
  onClearStrokes,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const baseCanvasRef = useRef(null);

  const [isDarkBoard, setIsDarkBoard] = useState(false);
  const [tool, setTool] = useState("pen"); // pen | highlighter | line | rect | circle | eraser
  const [color, setColor] = useState("#0f172a");
  const [size, setSize] = useState(4);
  const [activeAuthor, setActiveAuthor] = useState(null);

  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const activePointerTypeRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const pendingDeltaPointsRef = useRef([]);
  const remoteLiveStrokesRef = useRef({});
  const lastEmitTimeRef = useRef(0);
  const emitFlushTimerRef = useRef(null);
  const authorTimeoutRef = useRef(null);
  const rafRenderIdRef = useRef(null);
  const strokesRef = useRef(strokes);
  const renderedBaseStrokesRef = useRef([]);
  const renderedThemeRef = useRef(false);
  const sizeCssRef = useRef({ w: 0, h: 0, dpr: 1 });
  const isDarkBoardRef = useRef(isDarkBoard);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    isDarkBoardRef.current = isDarkBoard;
  }, [isDarkBoard]);

  const boardBg = isDarkBoard ? "#0f172a" : "#ffffff";
  const palette = isDarkBoard ? DARK_COLORS : LIGHT_COLORS;

  // Render active foreground frame (fast GPU blit of baseCanvas + live local/remote strokes)
  const renderFrameNow = useCallback(() => {
    rafRenderIdRef.current = null;
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    const { w, h, dpr } = sizeCssRef.current;
    if (!canvas || !baseCanvas || w <= 0 || h <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dark = isDarkBoardRef.current;
    const bg = dark ? "#0f172a" : "#ffffff";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(baseCanvas, 0, 0, w, h);

    if (currentStrokeRef.current) {
      drawStrokeOnContext(ctx, currentStrokeRef.current, w, h, dark, bg);
    }

    const remoteMap = remoteLiveStrokesRef.current;
    const remoteKeys = Object.keys(remoteMap);
    for (let i = 0; i < remoteKeys.length; i++) {
      drawStrokeOnContext(ctx, remoteMap[remoteKeys[i]], w, h, dark, bg);
    }
  }, []);

  const scheduleFrame = useCallback(() => {
    if (rafRenderIdRef.current !== null) return;
    rafRenderIdRef.current = requestAnimationFrame(renderFrameNow);
  }, [renderFrameNow]);

  // Rebuild or incrementally append committed strokes onto the offscreen base canvas
  const syncBaseCanvas = useCallback(
    (forceFullRebuild = false) => {
      const { w, h, dpr } = sizeCssRef.current;
      if (w <= 0 || h <= 0) return;

      if (!baseCanvasRef.current) {
        baseCanvasRef.current = document.createElement("canvas");
      }
      const base = baseCanvasRef.current;
      const targetBw = Math.max(1, Math.floor(w * dpr));
      const targetBh = Math.max(1, Math.floor(h * dpr));
      const sizeChanged = base.width !== targetBw || base.height !== targetBh;
      if (sizeChanged) {
        base.width = targetBw;
        base.height = targetBh;
      }

      const baseCtx = base.getContext("2d");
      if (!baseCtx) return;
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dark = isDarkBoardRef.current;
      const bg = dark ? "#0f172a" : "#ffffff";
      const nextStrokes = strokesRef.current;
      const prevStrokes = renderedBaseStrokesRef.current;
      const themeChanged = renderedThemeRef.current !== dark;

      const sameLength = nextStrokes.length === prevStrokes.length;
      const alreadySynced =
        !forceFullRebuild &&
        !sizeChanged &&
        !themeChanged &&
        sameLength &&
        prevStrokes.every((s, idx) => s.id === nextStrokes[idx]?.id);

      if (alreadySynced) {
        return;
      }

      const canAppendOne =
        !forceFullRebuild &&
        !sizeChanged &&
        !themeChanged &&
        nextStrokes.length === prevStrokes.length + 1 &&
        prevStrokes.every((s, idx) => s.id === nextStrokes[idx]?.id);

      if (canAppendOne) {
        drawStrokeOnContext(
          baseCtx,
          nextStrokes[nextStrokes.length - 1],
          w,
          h,
          dark,
          bg
        );
      } else {
        paintBoardBackground(baseCtx, w, h, dark, bg);
        for (let i = 0; i < nextStrokes.length; i++) {
          drawStrokeOnContext(baseCtx, nextStrokes[i], w, h, dark, bg);
        }
      }

      renderedBaseStrokesRef.current = nextStrokes;
      renderedThemeRef.current = dark;
      scheduleFrame();
    },
    [scheduleFrame]
  );

  // Sync base canvas when committed strokes or board theme change
  useEffect(() => {
    syncBaseCanvas(false);
  }, [strokes, isDarkBoard, syncBaseCanvas]);

  // Stable ResizeObserver (never disconnected during strokes/live socket updates!)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const prev = sizeCssRef.current;
      if (prev.w === w && prev.h === h && prev.dpr === dpr) return;

      sizeCssRef.current = { w, h, dpr };
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      syncBaseCanvas(true);
    };

    resize();
    const initRaf = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(initRaf);
      ro.disconnect();
      if (rafRenderIdRef.current !== null) {
        cancelAnimationFrame(rafRenderIdRef.current);
        rafRenderIdRef.current = null;
      }
      if (emitFlushTimerRef.current) {
        clearTimeout(emitFlushTimerRef.current);
        emitFlushTimerRef.current = null;
      }
      if (authorTimeoutRef.current) {
        clearTimeout(authorTimeoutRef.current);
        authorTimeoutRef.current = null;
      }
    };
  }, [syncBaseCanvas]);

  // Prevent iPad/iOS Safari native touch scroll, pinch-zoom & Scribble selection on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchScroll = (e) => {
      if (e.cancelable) e.preventDefault();
    };

    canvas.addEventListener("touchstart", preventTouchScroll, { passive: false });
    canvas.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", preventTouchScroll);
      canvas.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  // Socket listeners for live pointer previews while peer is dragging (no React re-render per point!)
  useEffect(() => {
    if (!socket || !roomId) return;

    const selfEmail = String(currentUserEmail || "").trim().toLowerCase();

    const onLiveStroke = ({ stroke, strokeId, deltaPoints, tool: liveTool, color: liveColor, size: liveSize, user }) => {
      const senderEmail = String(user?.email || "").trim().toLowerCase();
      if (senderEmail && selfEmail && senderEmail === selfEmail) return;

      const resolvedId = stroke?.id || strokeId;
      if (!resolvedId) return;
      const key = senderEmail || resolvedId;

      if (stroke) {
        remoteLiveStrokesRef.current[key] = stroke;
      } else if (Array.isArray(deltaPoints) && deltaPoints.length > 0) {
        const existing = remoteLiveStrokesRef.current[key];
        if (existing && existing.id === resolvedId) {
          existing.points = [...(existing.points || []), ...deltaPoints];
        } else {
          remoteLiveStrokesRef.current[key] = {
            id: resolvedId,
            tool: liveTool || "pen",
            color: liveColor || "#0f172a",
            size: liveSize || 4,
            points: [...deltaPoints],
          };
        }
      } else {
        return;
      }

      scheduleFrame();

      const authorName = user?.name || "Partner";
      setActiveAuthor((prev) => (prev === authorName ? prev : authorName));
      if (authorTimeoutRef.current) clearTimeout(authorTimeoutRef.current);
      authorTimeoutRef.current = setTimeout(() => {
        setActiveAuthor(null);
      }, 2500);
    };

    const onCommittedStroke = ({ stroke, user }) => {
      const senderEmail = String(user?.email || "").trim().toLowerCase();
      if (senderEmail && selfEmail && senderEmail === selfEmail) return;
      if (stroke) {
        const key = senderEmail || stroke.id;
        delete remoteLiveStrokesRef.current[key];
        const { w, h, dpr } = sizeCssRef.current;
        if (
          baseCanvasRef.current &&
          w > 0 &&
          h > 0 &&
          !renderedBaseStrokesRef.current.some((s) => s.id === stroke.id)
        ) {
          const baseCtx = baseCanvasRef.current.getContext("2d");
          if (baseCtx) {
            const dark = isDarkBoardRef.current;
            baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawStrokeOnContext(
              baseCtx,
              stroke,
              w,
              h,
              dark,
              dark ? "#0f172a" : "#ffffff"
            );
            renderedBaseStrokesRef.current = [...renderedBaseStrokesRef.current, stroke];
          }
        }
        scheduleFrame();
      }
      if (authorTimeoutRef.current) {
        clearTimeout(authorTimeoutRef.current);
        authorTimeoutRef.current = null;
      }
      setActiveAuthor(null);
    };

    const onClear = () => {
      remoteLiveStrokesRef.current = {};
      currentStrokeRef.current = null;
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      setActiveAuthor(null);
      scheduleFrame();
    };

    socket.on("whiteboard:draw-live", onLiveStroke);
    socket.on("whiteboard:draw", onCommittedStroke);
    socket.on("whiteboard:clear", onClear);

    return () => {
      socket.off("whiteboard:draw-live", onLiveStroke);
      socket.off("whiteboard:draw", onCommittedStroke);
      socket.off("whiteboard:clear", onClear);
    };
  }, [socket, roomId, currentUserEmail, scheduleFrame]);

  // Auto-adjust default pen color when toggling board theme
  const handleToggleBoardTheme = () => {
    setIsDarkBoard((prev) => {
      const nextDark = !prev;
      if (nextDark && color === "#0f172a") setColor("#f8fafc");
      if (!nextDark && color === "#f8fafc") setColor("#0f172a");
      return nextDark;
    });
  };

  const toNormalizedPoint = (clientX, clientY, rect) => ({
    x: Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width))),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height))),
  });

  const flushLiveDelta = useCallback(() => {
    if (emitFlushTimerRef.current) {
      clearTimeout(emitFlushTimerRef.current);
      emitFlushTimerRef.current = null;
    }
    const cur = currentStrokeRef.current;
    if (!socket || !cur) return;

    lastEmitTimeRef.current = Date.now();
    if (FREEHAND_TOOLS.has(cur.tool)) {
      const delta = pendingDeltaPointsRef.current;
      if (!delta || delta.length === 0) return;
      pendingDeltaPointsRef.current = [];
      socket.emit("whiteboard:draw-live", {
        roomId,
        strokeId: cur.id,
        tool: cur.tool,
        color: cur.color,
        size: cur.size,
        deltaPoints: delta,
        user: { email: currentUserEmail, name: currentUserName },
      });
    } else {
      socket.emit("whiteboard:draw-live", {
        roomId,
        stroke: {
          id: cur.id,
          tool: cur.tool,
          color: cur.color,
          size: cur.size,
          start: cur.start,
          end: cur.end,
        },
        user: { email: currentUserEmail, name: currentUserName },
      });
    }
  }, [socket, roomId, currentUserEmail, currentUserName]);

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Palm rejection on iPad: ignore secondary touches while a pen or primary finger is drawing,
    // and let Apple Pencil take precedence over a brief initial palm tap.
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      const canPenPreemptPalm =
        e.pointerType === "pen" &&
        activePointerTypeRef.current === "touch" &&
        (currentStrokeRef.current?.points?.length || 0) <= 3;
      if (!canPenPreemptPalm) return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = toNormalizedPoint(e.clientX, e.clientY, rect);

    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType || "mouse";
    isDrawingRef.current = true;
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture is unsupported
    }

    const strokeId = `${currentUserEmail || "u"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const isFreehand = FREEHAND_TOOLS.has(tool);
    currentStrokeRef.current = {
      id: strokeId,
      tool,
      color,
      size,
      points: isFreehand ? [pt] : undefined,
      start: pt,
      end: pt,
      author: currentUserEmail,
    };
    pendingDeltaPointsRef.current = isFreehand ? [pt] : [];
    scheduleFrame();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cur = currentStrokeRef.current;

    const nativeEvents =
      typeof e.nativeEvent?.getCoalescedEvents === "function"
        ? e.nativeEvent.getCoalescedEvents()
        : null;
    const eventsToRead = nativeEvents && nativeEvents.length > 0 ? nativeEvents : [e];

    if (FREEHAND_TOOLS.has(cur.tool)) {
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const pts = cur.points;
      let lastPt = pts[pts.length - 1];
      let added = false;

      for (let i = 0; i < eventsToRead.length; i++) {
        const pt = toNormalizedPoint(eventsToRead[i].clientX, eventsToRead[i].clientY, rect);
        if (lastPt) {
          const dxPx = (pt.x - lastPt.x) * w;
          const dyPx = (pt.y - lastPt.y) * h;
          if (dxPx * dxPx + dyPx * dyPx < 1.5) continue;
        }
        pts.push(pt);
        pendingDeltaPointsRef.current.push(pt);
        lastPt = pt;
        added = true;
      }

      if (!added) return;
    } else {
      const latestEvent = eventsToRead[eventsToRead.length - 1];
      cur.end = toNormalizedPoint(latestEvent.clientX, latestEvent.clientY, rect);
    }

    scheduleFrame();

    if (socket) {
      const elapsed = Date.now() - lastEmitTimeRef.current;
      if (elapsed >= 16) {
        flushLiveDelta();
      } else if (!emitFlushTimerRef.current) {
        emitFlushTimerRef.current = setTimeout(flushLiveDelta, Math.max(4, 16 - elapsed));
      }
    }
  };

  const handlePointerEnd = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;

    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;

    if (emitFlushTimerRef.current) {
      clearTimeout(emitFlushTimerRef.current);
      emitFlushTimerRef.current = null;
    }
    pendingDeltaPointsRef.current = [];

    const finished = currentStrokeRef.current;
    const committed = {
      ...finished,
      points: finished.points ? [...finished.points] : undefined,
    };
    currentStrokeRef.current = null;

    // Immediately bake onto base canvas so pointerUp never flickers before React state syncs
    const { w, h, dpr } = sizeCssRef.current;
    if (baseCanvasRef.current && w > 0 && h > 0) {
      const baseCtx = baseCanvasRef.current.getContext("2d");
      if (baseCtx) {
        baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawStrokeOnContext(
          baseCtx,
          committed,
          w,
          h,
          isDarkBoardRef.current,
          isDarkBoardRef.current ? "#0f172a" : "#ffffff"
        );
        renderedBaseStrokesRef.current = [...renderedBaseStrokesRef.current, committed];
      }
    }
    scheduleFrame();

    onAddStroke?.(committed);
    socket?.emit("whiteboard:draw", {
      roomId,
      stroke: committed,
      user: { email: currentUserEmail, name: currentUserName },
    });
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const last = strokesRef.current[strokesRef.current.length - 1];
    onUndoStroke?.(last.id);
    socket?.emit("whiteboard:undo", {
      roomId,
      strokeId: last.id,
      user: { email: currentUserEmail, name: currentUserName },
    });
  };

  const handleClear = () => {
    remoteLiveStrokesRef.current = {};
    currentStrokeRef.current = null;
    setActiveAuthor(null);
    onClearStrokes?.();
    socket?.emit("whiteboard:clear", {
      roomId,
      user: { email: currentUserEmail, name: currentUserName },
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const tools = [
    { id: "pen", label: "Pen", icon: Pen },
    { id: "highlighter", label: "Highlighter", icon: Highlighter },
    { id: "line", label: "Line", icon: Minus },
    { id: "rect", label: "Box", icon: Square },
    { id: "circle", label: "Circle", icon: Circle },
    { id: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 relative select-none">
      {/* Whiteboard Toolbar */}
      <div
        className={`px-2.5 sm:px-3 ${
          isFullscreen
            ? "pt-[max(0.45rem,env(safe-area-inset-top))] pb-1.5"
            : "py-2"
        } bg-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0`}
      >
        {/* Label & Drawing Tools */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
            Whiteboard
          </span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                    tool === t.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden xl:inline text-[11px]">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Swatches & Stroke Width */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {palette.map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setColor(c.hex);
                  if (tool === "eraser") setTool("pen");
                }}
                title={c.name}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full border border-slate-500/60 transition cursor-pointer ${
                  color === c.hex && tool !== "eraser"
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-110"
                    : "opacity-85 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-1">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                title={`Stroke ${s}px`}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  size === s
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: Math.min(12, s + 2), height: Math.min(12, s + 2) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Board Actions */}
        <div className="flex items-center gap-1.5">
          {activeAuthor && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold animate-pulse mr-1">
              {activeAuthor} is drawing...
            </span>
          )}
          <button
            onClick={handleToggleBoardTheme}
            title={isDarkBoard ? "Switch to White Board" : "Switch to Dark Board"}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            {isDarkBoard ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={handleUndo}
            title="Undo"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleClear}
            title="Clear Board"
            className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={handleDownload}
            title="Save Board as PNG"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <Download size={14} />
          </button>
          {typeof onToggleFullscreen === "function" && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Whiteboard Fullscreen" : "Full Screen Whiteboard"}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                isFullscreen
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                  : "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
              }`}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Full" : "Full Screen"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Canvas */}
      <div
        ref={containerRef}
        style={{
          backgroundColor: boardBg,
          touchAction: "none",
          overscrollBehavior: "none",
        }}
        className="flex-1 min-h-[280px] relative overflow-hidden cursor-crosshair select-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            touchAction: "none",
            overscrollBehavior: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
          className="w-full h-full block touch-none select-none"
        />
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
