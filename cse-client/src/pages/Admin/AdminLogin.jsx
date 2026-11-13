import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Shield, Eye, EyeOff, Lock, AlertCircle, Terminal, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { useAdmin } from "@/context/AdminContext/AdminContext";
import adminApiClient from "@/lib/adminApiClient";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import { toast } from "sonner";
import logoImg from "@/assets/images/logo.png";

const AdminLogin = () => {
  const { loginAdmin, isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const isExpired = searchParams.get("session_expired") === "true";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // If already logged in, route directly to overview
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate("/admin/overview", { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    document.title = "Admin Gateway | Collaborative Skill Engine";
  }, []);

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      const res = await adminApiClient.post("/login", {
        email: data.email.trim().toLowerCase(),
        password: data.password ? data.password.trim() : "",
      });

      if (res.data?.token) {
        toast.success("Authentication successful. Welcome to Mission Control.");
        loginAdmin(res.data.token, res.data.admin);
        navigate("/admin/overview", { replace: true });
      } else {
        throw new Error(res.data?.message || "Invalid authentication response");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Authentication failed. Please verify your administrative credentials.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Cyber Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-[550px] h-[550px] bg-cyan-600/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Cyber Grid Lines */}
      <div
        className="fixed inset-0 opacity-[0.035] pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Back to Site link */}
      <div className="w-full max-w-md mb-6 relative z-10 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} /> Return to Main Application
        </Link>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/70 text-rose-300 text-[10px] font-mono font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          RESTRICTED GATEWAY
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Gateway Card */}
        <div className="bg-[#0b101f]/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden relative group">
          {/* Top Decorative Neon Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]" />

          {/* Header with Collaborative Skill Engine Logo */}
          <div className="px-8 pt-8 pb-4 text-center">
            {/* Glowing Logo Container */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-50 blur-xl rounded-2xl animate-pulse" />
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-slate-900/90 border border-indigo-500/40 p-2 shadow-2xl flex items-center justify-center mx-auto hover:rotate-3 transition-transform">
                <img
                  src={logoImg}
                  alt="Collaborative Skill Engine"
                  className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-indigo-500/60 flex items-center justify-center z-20 shadow-md">
                <KeyRound size={12} className="text-indigo-300" />
              </div>
            </div>

            {/* Brand Title */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight leading-none text-white">
                  Skill<span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">Engine</span>
                </span>
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-950 to-purple-950 border border-indigo-700/80 rounded-md text-[9px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                  Admin Gateway
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-300 font-extrabold">
                  Collaborative Skill Engine
                </p>
              </div>
              <h1 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold mt-2.5">
                Executive Mission Control
              </h1>
            </div>
          </div>

          {/* Session Expired Banner */}
          {isExpired && (
            <div className="mx-8 mb-2 p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-amber-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-400" />
              <span>Your administrative session has timed out. Please authenticate again.</span>
            </div>
          )}

          {/* Server Error Banner */}
          {serverError && (
            <div className="mx-8 mb-2 p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-5 space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                Admin Identifier (Email)
              </label>
              <input
                type="email"
                {...register("email", {
                  required: "Admin email identifier is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
                placeholder="admin@collaborative.com"
                className="w-full px-4 py-3 bg-[#070b16] border border-slate-700/80 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-rose-400 text-xs font-mono mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                Security Keyphrase
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: "Security password is required",
                  })}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-11 py-3 bg-[#070b16] border border-slate-700/80 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-400 text-xs font-mono mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock size={15} className="group-hover:rotate-12 transition-transform" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Clearance Tag */}
          <div className="px-8 py-3.5 bg-[#070b16]/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Shield size={12} />
              256-Bit SSL/TLS
            </span>
            <span className="text-slate-400 font-mono text-[10px]">AUTH_GATEWAY_V2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
