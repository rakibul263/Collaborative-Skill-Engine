/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from "react";
import {
  Play,
  Terminal,
  Copy,
  Check,
  Edit3,
  Code2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  Sliders,
  X,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

const RUNNABLE_LANGS = {
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  python3: "python",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
};

const LANG_LABELS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python 3",
  cpp: "C++ 17",
  c: "C (GCC)",
};

const LANG_BADGE_COLORS = {
  python: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  cpp: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  c: "text-sky-400 bg-sky-500/10 border-sky-500/25",
  javascript: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  typescript: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
};

const CodePlaygroundBlock = ({ language = "", initialCode = "", onDebugWithAi }) => {
  const normalizedLang = useMemo(() => {
    const raw = (language || "").toLowerCase().replace(/^language-/, "").trim();
    return RUNNABLE_LANGS[raw] || raw;
  }, [language]);

  const isRunnable = Boolean(RUNNABLE_LANGS[normalizedLang]);
  const displayLabel = LANG_LABELS[normalizedLang] || normalizedLang.toUpperCase() || "CODE";
  const badgeColor = LANG_BADGE_COLORS[normalizedLang] || "text-indigo-400 bg-indigo-500/10 border-indigo-500/25";

  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
  const [stdin, setStdin] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [errorLine, setErrorLine] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [durationMs, setDurationMs] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(initialCode);
    setIsEditing(false);
    setOutput("");
    setError(null);
    setErrorLine(null);
    setShowOutput(false);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setShowOutput(true);
    setError(null);
    setErrorLine(null);
    setOutput("");

    try {
      const res = await apiClient.post("/api/code/run", {
        language: normalizedLang,
        code,
        stdin,
      });

      const data = res.data || {};
      if (data.success) {
        setOutput(data.output || "Program finished successfully (exit code 0).");
        setError(null);
        setErrorLine(null);
        setErrorType(null);
      } else {
        setOutput(data.output || "");
        setError(data.error || "Execution failed.");
        setErrorLine(data.errorLine || null);
        setErrorType(data.errorType || "RuntimeError");
      }
      setDurationMs(data.durationMs || 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to execute code in sandbox.");
      setOutput("");
      setErrorType("ExecutionError");
    } finally {
      setIsRunning(false);
    }
  };

  const codeLines = useMemo(() => {
    return (code || "").split("\n");
  }, [code]);

  return (
    <div className="my-3.5 rounded-2xl border border-slate-800/90 bg-[#070b14] shadow-xl overflow-hidden font-mono transition-all">
      {/* ── Top Header Toolbar ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0b101d] border-b border-slate-800/80 text-xs">
        {/* Left: Language Badge & Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Code2 size={14} className="text-slate-400" />
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${badgeColor}`}>
              {displayLabel}
            </span>
          </div>
          {isEditing && (
            <span className="text-[10px] text-amber-400 font-sans font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Editing Sandbox
            </span>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 font-sans">
          {/* Stdin Toggle */}
          {isRunnable && (
            <button
              type="button"
              onClick={() => setShowStdin((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                showStdin || stdin
                  ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Provide standard input (stdin) for program"
            >
              <Sliders size={11} />
              <span>Input</span>
            </button>
          )}

          {/* Edit / Reset Toggle */}
          {isRunnable && (
            <button
              type="button"
              onClick={() => (isEditing ? handleReset() : setIsEditing(true))}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                isEditing
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title={isEditing ? "Discard edits & reset" : "Edit code in sandbox"}
            >
              {isEditing ? <RotateCcw size={11} /> : <Edit3 size={11} />}
              <span>{isEditing ? "Reset" : "Edit"}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition-all"
            title="Copy snippet"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* ▶ Run Code Button */}
          {isRunnable && (
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-[11px] shadow-md transition-all cursor-pointer"
              title="Run code live in sandbox"
            >
              {isRunning ? (
                <>
                  <Clock size={12} className="animate-spin text-white" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={12} className="fill-current text-white" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Optional Stdin Tray ── */}
      {showStdin && (
        <div className="p-3 bg-[#0a0f1d] border-b border-slate-800/80 font-sans space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sliders size={11} className="text-indigo-400" />
              Standard Input (stdin / console inputs):
            </span>
            <button
              type="button"
              onClick={() => setShowStdin(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Type input values here (e.g. 5 or multiple lines for cin/input)..."
            rows={2}
            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-y"
          />
        </div>
      )}

      {/* ── Code Display or Editor ── */}
      <div className="relative text-[12.5px] leading-relaxed">
        {isEditing ? (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            rows={Math.min(22, Math.max(5, codeLines.length + 1))}
            className="w-full font-mono text-[12.5px] leading-relaxed bg-[#070b14] text-slate-200 p-4 focus:outline-none resize-y border-none"
          />
        ) : (
          <div className="overflow-x-auto p-3.5 space-y-0.5">
            {codeLines.map((line, idx) => {
              const lineNum = idx + 1;
              const isError = errorLine === lineNum;

              return (
                <div
                  key={idx}
                  className={`flex items-start group rounded px-1.5 py-0.5 transition-colors ${
                    isError
                      ? "bg-rose-500/20 border-l-2 border-rose-500 text-rose-200 font-semibold"
                      : "hover:bg-slate-900/40 text-slate-200"
                  }`}
                >
                  <span className="w-8 shrink-0 text-right pr-3 select-none text-[11px] font-mono text-slate-600 group-hover:text-slate-400">
                    {lineNum}
                  </span>
                  <span className="flex-1 whitespace-pre font-mono">
                    {line || " "}
                  </span>
                  {isError && (
                    <span className="shrink-0 ml-2 text-[10px] font-sans font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle size={10} />
                      Error Line {lineNum}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live Execution Output & Console Tray ── */}
      {showOutput && (
        <div className="border-t border-slate-800/90 bg-[#050811] p-3.5 space-y-2.5 font-mono">
          {/* Output Header */}
          <div className="flex items-center justify-between text-xs font-sans pb-1.5 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-emerald-400" />
              <span className="font-bold text-white text-[11px]">Execution Output</span>
              {durationMs !== null && (
                <span className="text-[10px] text-slate-500 font-mono">
                  ({durationMs}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {error ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  <AlertCircle size={11} />
                  {errorType || "Failed"}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  Success (Exit 0)
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowOutput(false)}
                className="text-slate-500 hover:text-slate-300"
                title="Hide output"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Console Body */}
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-900 text-xs overflow-x-auto max-h-56 scrollbar-thin">
            {isRunning ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Clock size={13} className="animate-spin text-indigo-400" />
                <span>Executing code in isolated environment...</span>
              </div>
            ) : error ? (
              <div className="space-y-2">
                {output && (
                  <div className="text-slate-300 whitespace-pre-wrap pb-1 border-b border-slate-900">
                    {output}
                  </div>
                )}
                <div className="text-rose-400 whitespace-pre-wrap font-mono">
                  {error}
                </div>
              </div>
            ) : (
              <pre className="text-emerald-300 whitespace-pre-wrap font-mono m-0">
                {output || "Program finished with no output."}
              </pre>
            )}
          </div>

          {/* ⚡ Debug with AI Action Bar on Error */}
          {error && !isRunning && onDebugWithAi && (
            <div className="pt-1 flex items-center justify-between gap-3 font-sans">
              <span className="text-[11px] text-slate-400 font-medium">
                Got a compilation or runtime bug?
              </span>
              <button
                type="button"
                onClick={() => {
                  const errorContext = `Please analyze and debug this ${displayLabel} code.${
                    errorLine ? ` The error occurs on line ${errorLine}.` : ""
                  }\n\n\`\`\`${normalizedLang}\n${code}\n\`\`\`\n\n**Error Output:**\n\`\`\`\n${error}\n\`\`\`\n\nPlease pinpoint the exact line, explain why it crashed/failed, and provide the complete corrected code.`;
                  onDebugWithAi(errorContext);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                title="Send code and error to AI Advisor to get instant fix"
              >
                <Sparkles size={13} />
                <span>⚡ Debug with AI</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodePlaygroundBlock;

