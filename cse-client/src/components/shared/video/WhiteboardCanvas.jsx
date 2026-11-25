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

/**
 * Real-time Collaborative Whiteboard Canvas
 *
 * Defaults to a crisp high-contrast White board (#ffffff) so drawings and
 * board boundaries are unmistakably visible. Uses normalized coordinates (0..1)
 * so strokes align identically across different screen sizes and split-pane ratios.
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
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [isDarkBoard, setIsDarkBoard] = useState(false);
  const [tool, setTool] = useState("pen"); // pen | highlighter | line | rect | circle | eraser
  const [color, setColor] = useState("#0f172a");
  const [size, setSize] = useState(4);
  const [remoteLiveStrokes, setRemoteLiveStrokes] = useState({});
  const [activeAuthor, setActiveAuthor] = useState(null);

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastEmitTimeRef = useRef(0);
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const boardBg = isDarkBoard ? "#0f172a" : "#ffffff";
  const palette = isDarkBoard ? DARK_COLORS : LIGHT_COLORS;

  // Auto-adjust default pen color when toggling board theme
  const handleToggleBoardTheme = () => {
    setIsDarkBoard((prev) => {
      const nextDark = !prev;
      if (nextDark && color === "#0f172a") setColor("#f8fafc");
      if (!nextDark && color === "#f8fafc") setColor("#0f172a");
      return nextDark;
    });
  };

  // Draw a single stroke/shape on the 2D context
  const drawStroke = useCallback(
    (ctx, stroke, w, h) => {
      if (!stroke || !w || !h) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const isEraser = stroke.tool === "eraser";
      const isHighlighter = stroke.tool === "highlighter";

      let strokeColor = stroke.color || (isDarkBoard ? "#f8fafc" : "#0f172a");
      if (isEraser) {
        strokeColor = boardBg;
      } else if (!isDarkBoard && strokeColor.toLowerCase() === "#f8fafc") {
        strokeColor = "#0f172a";
      } else if (isDarkBoard && strokeColor.toLowerCase() === "#0f172a") {
        strokeColor = "#f8fafc";
      }

      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = isHighlighter ? 0.35 : 1;
      ctx.lineWidth = isHighlighter
        ? (stroke.size || 4) * 3
        : isEraser
        ? (stroke.size || 4) * 3.5
        : stroke.size || 4;

      if (stroke.tool === "pen" || stroke.tool === "highlighter" || stroke.tool === "eraser") {
        const pts = stroke.points || [];
        if (pts.length === 0) {
          ctx.restore();
          return;
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        if (pts.length === 1) {
          ctx.lineTo(pts[0].x * w + 0.01, pts[0].y * h + 0.01);
        } else {
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x * w, pts[i].y * h);
          }
        }
        ctx.stroke();
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
    },
    [boardBg, isDarkBoard]
  );

  // Redraw entire canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, w, h);

    // Subtle dot grid
    ctx.fillStyle = isDarkBoard
      ? "rgba(148, 163, 184, 0.16)"
      : "rgba(15, 23, 42, 0.12)";
    const step = 26;
    for (let gx = step; gx < w; gx += step) {
      for (let gy = step; gy < h; gy += step) {
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
    }

    strokesRef.current.forEach((s) => drawStroke(ctx, s, w, h));

    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current, w, h);
    }

    Object.values(remoteLiveStrokes).forEach((s) => drawStroke(ctx, s, w, h));
  }, [boardBg, isDarkBoard, drawStroke, remoteLiveStrokes]);

  // Resize observer + initial mount RAF so canvas dimensions are always non-zero
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
        redraw();
      }
    };

    resize();
    const rafId = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [strokes, remoteLiveStrokes, isDarkBoard, redraw]);

  // Socket listeners for live pointer previews while peer is dragging
  useEffect(() => {
    if (!socket || !roomId) return;

    const onLiveStroke = ({ stroke, user }) => {
      if (!stroke || user?.email === currentUserEmail) return;
      const key = user?.email || stroke.id;
      setRemoteLiveStrokes((prev) => ({ ...prev, [key]: stroke }));
      setActiveAuthor(user?.name || "Partner");
    };

    const onCommittedStroke = ({ stroke, user }) => {
      if (!stroke || user?.email === currentUserEmail) return;
      const key = user?.email || stroke.id;
      setRemoteLiveStrokes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setActiveAuthor(null);
    };

    const onClear = () => {
      setRemoteLiveStrokes({});
      currentStrokeRef.current = null;
      setActiveAuthor(null);
    };

    socket.on("whiteboard:draw-live", onLiveStroke);
    socket.on("whiteboard:draw", onCommittedStroke);
    socket.on("whiteboard:clear", onClear);

    return () => {
      socket.off("whiteboard:draw-live", onLiveStroke);
      socket.off("whiteboard:draw", onCommittedStroke);
      socket.off("whiteboard:clear", onClear);
    };
  }, [socket, roomId, currentUserEmail]);

  const getNormalizedPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const pt = getNormalizedPoint(e);
    isDrawingRef.current = true;

    const strokeId = `${currentUserEmail || "u"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const newStroke = {
      id: strokeId,
      tool,
      color,
      size,
      points: tool === "pen" || tool === "highlighter" || tool === "eraser" ? [pt] : undefined,
      start: pt,
      end: pt,
      author: currentUserEmail,
    };

    currentStrokeRef.current = newStroke;
    redraw();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getNormalizedPoint(e);
    const cur = currentStrokeRef.current;

    if (cur.tool === "pen" || cur.tool === "highlighter" || cur.tool === "eraser") {
      cur.points = [...(cur.points || []), pt];
    } else {
      cur.end = pt;
    }

    redraw();

    const now = Date.now();
    if (socket && now - lastEmitTimeRef.current >= 22) {
      lastEmitTimeRef.current = now;
      socket.emit("whiteboard:draw-live", {
        roomId,
        stroke: cur,
        user: { email: currentUserEmail, name: currentUserName },
      });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const committed = { ...currentStrokeRef.current };
    currentStrokeRef.current = null;

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
    setRemoteLiveStrokes({});
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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 relative">
      {/* Whiteboard Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
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
        </div>
      </div>

      {/* Interactive Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[280px] relative overflow-hidden cursor-crosshair bg-white"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full h-full block touch-none"
        />
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
