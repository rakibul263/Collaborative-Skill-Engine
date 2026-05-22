import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router";
import {
  ShieldCheck,
  ChevronRight,
  X,
  ScrollText,
  CheckCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import LogoImg from "../../../assets/images/logo.png";

const AuthNavbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const terms = [
    {
      id: "01",
      title: "Acceptance of Terms",
      content:
        "By registering or logging into the Collaborative Skill Engine platform, you agree to follow all the rules and policies described in these Terms and Conditions.",
    },
    {
      id: "02",
      title: "User Account",
      content:
        "Users must provide accurate information. Sharing login credentials is not allowed. Each user is responsible for their account security.",
    },
    {
      id: "03",
      title: "Login Security",
      content:
        "Keep your password secure. Suspicious login activity may lead to temporary account restrictions.",
    },
    {
      id: "04",
      title: "Skill Sharing",
      content:
        "Only list skills you genuinely possess. Respect other learners and mentors during interactions.",
    },
    {
      id: "05",
      title: "Behavior Policy",
      content:
        "No harassment, offensive language, or harmful content. Violations may result in account removal.",
    },
    {
      id: "06",
      title: "Ratings & Reviews",
      content:
        "Reviews should be honest and respectful. Fake or abusive reviews will be removed.",
    },
    {
      id: "07",
      title: "Profile Content",
      content:
        "Profile images must not be offensive or copyrighted. Inappropriate content will be removed.",
    },
    {
      id: "08",
      title: "Privacy & Data",
      content:
        "User info is stored securely. Basic profile info (name, skills) is visible to other users.",
    },
    {
      id: "09",
      title: "Account Termination",
      content:
        "The platform may terminate accounts for policy violations or harmful activities.",
    },
    {
      id: "10",
      title: "Updates",
      content:
        "Terms may be updated. Continued use of the platform means you accept the revised terms.",
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 pt-4 pb-2">
        <motion.nav
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl mx-auto w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-[#0b0d19]/80 backdrop-blur-xl border border-slate-800/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all"
        >
          {/* Left: Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-xl p-1"
          >
            <div className="relative">
              <motion.img
                src={LogoImg}
                alt="Skill Engine Logo"
                className="w-8 sm:w-9 h-auto relative z-10 group-hover:rotate-12 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1">
                Skill
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Engine
                </span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Collaborative
                </span>
              </div>
            </div>
          </Link>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back to Home Button */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all duration-200"
            >
              <ArrowLeft size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>

            {/* Security Protocol / Terms Modal Button */}
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                <ShieldCheck size={14} />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                  Security Protocol
                </span>
                <span className="text-xs font-bold text-slate-200 leading-tight">
                  Terms of Service
                </span>
              </div>
              <ChevronRight
                size={12}
                className="text-indigo-400 hidden sm:block"
              />
            </motion.button>
          </div>
        </motion.nav>
      </header>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0d0f1d] rounded-3xl shadow-2xl overflow-hidden border border-slate-800 z-10"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden border-b border-slate-800">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl backdrop-blur-md border border-indigo-500/20 text-indigo-400">
                      <ScrollText size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                        Legal <span className="text-indigo-400">Terms</span> & Protocol
                      </h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        Platform Governance v2.0
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-800/80 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none" />
              </div>

              {/* Terms Content List */}
              <div className="p-6 sm:p-8 max-h-[55vh] overflow-y-auto space-y-6 bg-[#090b16]">
                {terms.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-xs">
                      {item.id}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {item.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-slate-400 font-medium">
                        {item.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    Compliance Verified
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
                >
                  Confirm Awareness
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuthNavbar;
