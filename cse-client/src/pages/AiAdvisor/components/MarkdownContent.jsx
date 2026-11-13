/* eslint-disable no-unused-vars */
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Check,
  CheckCircle2,
  Info,
} from "lucide-react";
import CodePlaygroundBlock from "./CodePlaygroundBlock";

const getTextFromChildren = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(getTextFromChildren).join(" ");
  if (node.props?.children) return getTextFromChildren(node.props.children);
  return "";
};

export const MarkdownContent = ({ content = "", onDebugWithAi }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none font-sans
      [&>p:first-child]:mt-0 [&>p:last-child]:mb-0
      [&_p]:text-slate-200 [&_p]:leading-[1.75] [&_p]:text-[13.5px] sm:[&_p]:text-[14px] [&_p]:my-2.5
      [&_ul]:pl-5 [&_ol]:pl-5 [&_li::marker]:text-indigo-400 [&_li]:leading-relaxed
      [&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /* 1. Interactive Code Blocks & Inline Code */
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const rawCode = String(children).replace(/\n$/, "");

            if (!inline && (match || rawCode.includes("\n"))) {
              return (
                <CodePlaygroundBlock
                  language={match ? match[1] : ""}
                  initialCode={rawCode}
                  onDebugWithAi={onDebugWithAi}
                />
              );
            }

            return (
              <code
                className="rounded-md bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 text-[11.5px] font-mono font-semibold text-indigo-300 shadow-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },

          /* 2. Styled Callout Blocks (💡 Tips, ⚠️ Warnings, 📌 Insights) */
          blockquote({ children }) {
            const str = getTextFromChildren(children);
            const isWarning = /⚠️|Warning|Trap|Pitfall|Caution|Watch Out/i.test(str);
            const isTip = /💡|Tip|Pro-Tip|Best Practice/i.test(str);

            if (isWarning) {
              return (
                <div className="my-3.5 rounded-2xl border border-rose-500/35 bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-950 p-4 shadow-sm text-rose-200">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                      <AlertTriangle size={15} />
                    </div>
                    <div className="flex-1 text-xs sm:text-[13.5px] leading-relaxed [&>p]:m-0 font-medium">
                      {children}
                    </div>
                  </div>
                </div>
              );
            }

            if (isTip) {
              return (
                <div className="my-3.5 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-950 p-4 shadow-sm text-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                      <Lightbulb size={15} />
                    </div>
                    <div className="flex-1 text-xs sm:text-[13.5px] leading-relaxed [&>p]:m-0 font-medium">
                      {children}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="my-3.5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 p-4 shadow-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0 mt-0.5">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex-1 text-xs sm:text-[13.5px] leading-relaxed [&>p]:m-0 font-medium">
                    {children}
                  </div>
                </div>
              </div>
            );
          },

          /* 3. Section Headers */
          h1({ children }) {
            return (
              <div className="mt-6 mb-3 pb-2 border-b border-slate-800/80 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles size={14} />
                </span>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {children}
                </h1>
              </div>
            );
          },
          h2({ children }) {
            return (
              <div className="mt-5 mb-2.5 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-emerald-400" />
                <h2 className="text-sm sm:text-[15px] font-bold text-white tracking-tight">
                  {children}
                </h2>
              </div>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xs sm:text-[13.5px] font-bold text-indigo-300 mt-4 mb-2 flex items-center gap-1.5">
                <span className="text-indigo-400">▸</span>
                <span>{children}</span>
              </h3>
            );
          },

          /* 4. Styled Tables with Zebra Stripes & Scroll Container */
          table({ children }) {
            return (
              <div className="my-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    {children}
                  </table>
                </div>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-[#0f1526] border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-indigo-300">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return <th className="px-4 py-3 font-extrabold text-indigo-300">{children}</th>;
          },
          tr({ children }) {
            return (
              <tr className="border-t border-slate-800/50 hover:bg-slate-900/40 transition-colors odd:bg-slate-950/40 even:bg-slate-900/20">
                {children}
              </tr>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-3 text-slate-200 text-xs sm:text-[13px] leading-relaxed">
                {children}
              </td>
            );
          },

          /* 5. Interactive Checklists / Task Lists */
          li({ children, checked, ...props }) {
            if (typeof checked === "boolean") {
              return (
                <li className="flex items-start gap-2.5 my-2 list-none text-xs sm:text-[13.5px]">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                      checked
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm"
                        : "border-slate-700 bg-slate-900 text-transparent"
                    }`}
                  >
                    <Check size={11} className={checked ? "opacity-100" : "opacity-0"} />
                  </span>
                  <span
                    className={`flex-1 ${
                      checked ? "line-through text-slate-400" : "text-slate-200 font-medium"
                    }`}
                  >
                    {children}
                  </span>
                </li>
              );
            }
            return (
              <li className="my-1.5 text-xs sm:text-[13.5px] text-slate-200 leading-relaxed marker:text-indigo-400">
                {children}
              </li>
            );
          },

          /* 6. High-Contrast Bold & Dividers */
          strong({ children }) {
            return <strong className="font-bold text-white tracking-wide">{children}</strong>;
          },
          hr() {
            return (
              <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;

