import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  UploadCloud,
  PenTool,
  Check,
  RotateCcw,
  Sparkles,
  Award,
  ShieldCheck,
  Eye,
  Grid,
  FileCheck2,
  Loader2,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "@/components/ui/toast-system";
import {
  removeBackgroundAndEnhanceSignature,
  trimCanvas,
  INK_PALETTES,
} from "@/lib/signatureEnhancer";

const InstructorSignatureModal = ({
  isOpen = true,
  currentSignature = null,
  instructorName = "Course Instructor",
  onSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'draw'
  const [selectedInk, setSelectedInk] = useState("midnight");
  const [threshold, setThreshold] = useState(210);

  // Upload state
  const [rawImageSource, setRawImageSource] = useState(null);
  const [processedSignature, setProcessedSignature] = useState(currentSignature || null);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Digital canvas drawing state
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);

  // Preview background mode: 'certificate' (paper) | 'grid' (transparent png checkerboard)
  const [previewBg, setPreviewBg] = useState("certificate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Process uploaded image with AI background removal and ink enhancement
  const processImage = useCallback(
    async (source, ink = selectedInk, thresh = threshold) => {
      if (!source) return;
      setProcessing(true);
      setError("");
      try {
        const result = await removeBackgroundAndEnhanceSignature(source, {
          inkColor: ink,
          threshold: thresh,
          contrast: 1.35,
          trimPadding: 16,
        });
        if (!result.hasInk) {
          setError("No clear signature strokes detected. Please try a clearer photo or darker pen.");
        } else {
          setProcessedSignature(result.dataUrl);
        }
      } catch (err) {
        setError(err?.message || "Failed to process signature image.");
      } finally {
        setProcessing(false);
      }
    },
    [selectedInk, threshold]
  );

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }
    setError("");
    setRawImageSource(file);
    processImage(file, selectedInk, threshold);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Re-process when ink palette or threshold changes
  const handleInkChange = (inkKey) => {
    setSelectedInk(inkKey);
    if (activeTab === "upload" && rawImageSource) {
      processImage(rawImageSource, inkKey, threshold);
    } else if (activeTab === "draw" && canvasRef.current && hasDrawn) {
      exportDrawnSignature(inkKey);
    }
  };

  const handleThresholdChange = (newThresh) => {
    setThreshold(newThresh);
    if (activeTab === "upload" && rawImageSource) {
      processImage(rawImageSource, selectedInk, newThresh);
    }
  };

  // --- Digital Pen Drawing Logic ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (activeTab === "draw") {
      // Delay slightly for DOM render
      const timer = setTimeout(initCanvas, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, initCanvas]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const currentPoint = getCanvasCoords(e);

    const palette = INK_PALETTES[selectedInk] || INK_PALETTES.midnight;
    ctx.strokeStyle = palette.hex;
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    exportDrawnSignature();
  };

  const clearCanvas = () => {
    initCanvas();
    setHasDrawn(false);
    setProcessedSignature(null);
  };

  const exportDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const trimmedDataUrl = trimCanvas(canvas, 16);
    setProcessedSignature(trimmedDataUrl);
  };

  // Submit to Server
  const handleSaveSignature = async () => {
    if (!processedSignature) {
      return setError("Please upload a photo of your signature or draw one above.");
    }

    setSaving(true);
    setError("");
    try {
      const res = await apiClient.post("/studio/signature", {
        signatureData: processedSignature,
      });

      toast.confirmed("Instructor Signature Verified & Saved", {
        description: "Your official signature has been linked to all course certificates.",
        badge: "VERIFIED SIGNATURE",
      });

      onSuccess?.(res.data?.instructorSignature || processedSignature);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save instructor signature.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative text-slate-100 my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
            <PenTool className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Upload Instructor Official Signature
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase">
                Certificate Official
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Your signature will be placed in the instructor signatory block on course completion certificates.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "upload"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Photo of Signature</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "draw"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Draw on Screen (Digital Pen)</span>
          </button>
        </div>

        {/* Tab 1: Upload Photo / Scan with Instant Auto-BG-Removal */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDragOver
                  ? "border-indigo-400 bg-indigo-500/10"
                  : "border-slate-700/80 bg-slate-950/60 hover:border-slate-600"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-md">
                  {processing ? (
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <p className="text-xs font-bold text-white">
                  {processing
                    ? "Removing paper background & enhancing ink strokes..."
                    : "Click or drag & drop a photo/scan of your signature"}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Sign on white paper with a pen, take a photo with your phone, and upload. The paper background will be automatically removed and made 100% transparent!
                </p>
              </div>
            </div>

            {/* Threshold fine-tuning if an image is loaded */}
            {rawImageSource && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">
                    Background Removal Sensitivity:
                  </span>
                  <span className="font-mono text-indigo-300 font-bold">{threshold}</span>
                </div>
                <input
                  type="range"
                  min="160"
                  max="245"
                  step="2"
                  value={threshold}
                  onChange={(e) => handleThresholdChange(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Digital Pen Pad */}
        {activeTab === "draw" && (
          <div className="space-y-2">
            <div className="relative rounded-2xl border border-slate-700/80 bg-white shadow-inner overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-semibold">
                  Sign your official signature here with your finger, mouse, or stylus
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Smooth calligraphy digital pen active
              </span>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Pad</span>
              </button>
            </div>
          </div>
        )}

        {/* Ink Palette Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            AI Enhanced Ink Tone:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(INK_PALETTES)
              .filter(([k]) => k !== "original")
              .map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleInkChange(key)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedInk === key
                      ? "bg-slate-800 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: val.hex }}
                  />
                  <span className="truncate">{val.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* ── LIVE CERTIFICATE PREVIEW PANEL ── */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Live Certificate Placement Preview
            </span>

            {/* Toggle Preview Background */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setPreviewBg("certificate")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  previewBg === "certificate"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Certificate Paper
              </button>
              <button
                type="button"
                onClick={() => setPreviewBg("grid")}
                className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 ${
                  previewBg === "grid"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Grid className="w-2.5 h-2.5" />
                Transparent Grid
              </button>
            </div>
          </div>

          {/* Certificate Mock Surface */}
          <div
            className={`rounded-2xl p-6 transition-all min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden ${
              previewBg === "certificate"
                ? "bg-[#fcfaf2] border border-[#d4af37]/40 shadow-inner"
                : "bg-slate-900 border border-slate-800"
            }`}
            style={
              previewBg === "grid"
                ? {
                    backgroundImage: `
                      linear-gradient(45deg, #1e293b 25%, transparent 25%),
                      linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #1e293b 75%),
                      linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                    `,
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  }
                : undefined
            }
          >
            {processedSignature ? (
              <div className="flex flex-col items-center">
                <img
                  src={processedSignature}
                  alt="Enhanced Signature"
                  className="h-16 max-w-[260px] object-contain drop-shadow-sm select-none"
                />
                <div
                  className={`h-[1.5px] w-48 mt-1 ${
                    previewBg === "certificate" ? "bg-slate-800" : "bg-slate-500"
                  }`}
                />
                <p
                  className={`text-xs font-black pt-1 ${
                    previewBg === "certificate" ? "text-slate-900" : "text-white"
                  }`}
                >
                  {instructorName}
                </p>
                <p
                  className={`text-[9px] font-bold tracking-widest uppercase ${
                    previewBg === "certificate" ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Course Instructor Signature
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1 text-slate-400">
                <PenTool className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs font-semibold">No signature loaded yet</p>
                <p className="text-[10px] text-slate-500">
                  Upload a photo or sign above to preview placement.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer"
          >
            Remind Me Later
          </button>

          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={saving || !processedSignature}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-black text-white uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Signature...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save &amp; Apply to Certificates</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorSignatureModal;

