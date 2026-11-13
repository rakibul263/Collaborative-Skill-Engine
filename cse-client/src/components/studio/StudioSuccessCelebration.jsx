import React, { useState } from "react";
import { Sparkles, CheckCircle2, Award, ArrowRight, ShieldCheck } from "lucide-react";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

/**
 * StudioSuccessCelebration — Premium celebration screen when user newly unlocks Studio.
 */
const StudioSuccessCelebration = ({ onEnterStudio }) => {
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    setLoading(true);
    await onEnterStudio();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 pt-20">
      <div className="max-w-xl w-full bg-slate-900 border border-indigo-500/40 rounded-3xl p-8 sm:p-10 text-center shadow-2xl space-y-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 transform hover:scale-105 transition-transform duration-300">
            <Award className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Eligibility Approved
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Welcome to Creator Studio!
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Congratulations! All your instructor requirements are fulfilled. Permanent Studio Access has been unlocked for your account.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Instructor Rights Granted
            </div>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Create & Publish Courses in your verified topics
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Build lesson modules with Cloudinary video uploads
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Track revenues, payouts, student progress & ratings
              </li>
            </ul>
          </div>

          <button
            onClick={handleEnter}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
          >
            {loading ? (
              <ButtonSpinner size="sm" />
            ) : (
              <>
                Enter Studio Creator Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioSuccessCelebration;
