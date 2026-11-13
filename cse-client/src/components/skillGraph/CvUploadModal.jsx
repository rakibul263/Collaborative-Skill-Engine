import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  FileCheck,
  Shield,
  Layers,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/components/ui/toast-system";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

/**
 * CvUploadModal — Allows users to upload their CV/Resume.
 * Automatically parses competencies and saves them to user's MongoDB profile.
 */
const CvUploadModal = ({
  isOpen,
  onClose,
  onSuccess,
  careerTrackId = "ai-engineer",
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const validateFile = (selectedFile) => {
    setErrorMsg("");
    if (!selectedFile) return false;

    const ext = "." + (selectedFile.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrorMsg("Please upload a valid PDF, DOCX, or TXT file.");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setErrorMsg("Please select a CV/Resume file to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg("");

      const formData = new FormData();
      formData.append("cv", file);
      formData.append("careerTrackId", careerTrackId);
      if (user?.email) {
        formData.append("email", user.email);
      }

      const res = await apiClient.post("/api/skill-graph/upload-cv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(
          res.data.message || "CV uploaded and profile updated with new competencies!"
        );
        if (onSuccess) {
          onSuccess(res.data);
        }
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Failed to parse CV.");
      }
    } catch (err) {
      console.error("[CvUploadModal] upload error:", err);
      const serverMsg =
        err.response?.data?.message || "Failed to upload and parse CV file.";
      setErrorMsg(serverMsg);
      toast.error(serverMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={uploading ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-indigo-950/50 overflow-hidden z-10 flex flex-col my-auto"
        >
          {/* Header Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={12} className="text-amber-400" />
                <span>Automated CV Skill Extraction</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Upload CV / Resume to Generate Roadmap
              </h3>
              <p className="text-xs text-slate-400">
                Upload your CV once — skills, tools, and past projects will be saved to your profile and used to calculate your exact learning roadmap.
              </p>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  file
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {file ? <FileCheck size={24} /> : <UploadCloud size={24} />}
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white max-w-xs truncate mx-auto">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze & save
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-[11px] text-rose-400 hover:underline pt-1 inline-block"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">
                    Click to browse or drag and drop your CV file here
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Supports PDF, DOCX, or TXT up to {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Profile Auto-save Notice */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Automatic Profile Sync</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Extracted skills and projects are saved directly into your user profile so you won't need to re-upload your CV on other pages.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={uploading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!file || uploading}
              onClick={handleUploadSubmit}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {uploading ? (
                <>
                  <ButtonSpinner size="xs" />
                  <span>Extracting Skills & Updating Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Extract Skills & Build Roadmap</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CvUploadModal;

