import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Shield, Eye, EyeOff, Lock, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
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
    document.title = "Admin Gateway | Skill Engine";
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
        toast.success("Authentication successful. Welcome to Admin Console.");
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
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Subtle, soft ambient background depth (no harsh neon blobs) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Top Navigation */}
      <div className="w-full max-w-sm mb-6 relative z-10 flex items-center justify-between text-xs">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Platform
        </Link>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md">
          Admin Portal
        </span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm relative z-10 bg-[#0E1322] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center pb-6 border-b border-slate-800/80 mb-6">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 p-1.5 mx-auto mb-3.5 flex items-center justify-center shadow-sm">
            <img src={logoImg} alt="Skill Engine" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Admin Console
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Administrative governance & platform controls
          </p>
        </div>

        {/* Session Expired Notice */}
        {isExpired && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {/* Server Error Notice */}
        {serverError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="admin@skillengine.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Valid email address required",
                },
              })}
              className={`w-full px-3.5 py-2.5 bg-slate-900/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors ${
                errors.email ? "border-rose-500/80" : "border-slate-800"
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                {...register("password", { required: "Password is required" })}
                className={`w-full px-3.5 py-2.5 pr-10 bg-slate-900/90 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors ${
                  errors.password ? "border-rose-500/80" : "border-slate-800"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <ButtonSpinner size="sm" />
            ) : (
              <>
                <KeyRound size={14} />
                <span>Sign In to Console</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
          <span>Enterprise access protected with JWT session tokens.</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
