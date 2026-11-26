import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Loader2,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import LoginButton from "../shared/LoginButton/LoginButton";
import useAuth from "@/hooks/useAuth";
import LogoImg from "@/assets/images/logo.png";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { signInUser, signInWithGoogle, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go after successful login (set by PrivateRoute/CourseDetail/Navbar via state or query param)
  const searchParams = new URLSearchParams(location.search);
  const returnUrlParam = searchParams.get("returnUrl") || searchParams.get("redirect");

  const candidateFrom =
    returnUrlParam ||
    location.state?.returnUrl ||
    (location.state?.from
      ? typeof location.state.from === "string"
        ? location.state.from
        : `${location.state.from.pathname || ""}${location.state.from.search || ""}`
      : null) ||
    "/";

  // Security guard: must be relative path
  const from = candidateFrom.startsWith("/") && !candidateFrom.startsWith("//") ? candidateFrom : "/";

  // If user is already logged in (or returned from Google redirect), route cleanly
  useEffect(() => {
    if (!user) return;
    const googleNewUser = sessionStorage.getItem("googleNewUser");
    if (googleNewUser) {
      sessionStorage.removeItem("googleNewUser");
      try {
        const googleData = JSON.parse(googleNewUser);
        navigate(`/register${from !== "/" ? `?returnUrl=${encodeURIComponent(from)}` : ""}`, {
          state: { fromGoogle: true, googleUser: googleData, returnUrl: from },
          replace: true,
        });
        return;
      } catch {
        // Fallback to normal navigation if malformed
      }
    }
    navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData;
    if (!email || !password) {
      toast.warning("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signInUser(email, password);

      toast.success("Welcome back to the Skill Engine!");
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login Error:", error);

      let errorMessage = error.message || "Invalid credentials, please try again.";
      if (error.code === "auth/user-not-found")
        errorMessage = "No user found with this email.";
      if (error.code === "auth/wrong-password")
        errorMessage = "Incorrect password. Please try again.";
      if (error.code === "auth/too-many-requests")
        errorMessage = "Too many attempts. Try again later.";

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    const emailPrompt = window.prompt("Enter your registered email address to receive password reset instructions:", formData.email);
    if (emailPrompt) {
      resetPassword(emailPrompt.trim())
        .then(() => {
          toast.success(`Password reset email sent to ${emailPrompt.trim()}`);
        })
        .catch((error) => {
          let msg = "Could not send reset email. Please try again.";
          if (error.code === "auth/user-not-found") msg = "No account found with that email.";
          if (error.code === "auth/invalid-email") msg = "Please enter a valid email address.";
          toast.error(msg);
        });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-10 flex items-center justify-center font-sans">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-[#0b0d19]/80 border border-slate-800/80 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
        {/* LEFT PANEL: Enterprise Brand Experience */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-10 lg:p-12 bg-gradient-to-b from-[#0e1022] via-[#090b17] to-[#0d0f20] border-r border-slate-800/60 relative overflow-hidden">
          {/* Ambient Glowing Orbs */}
          <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Brand Info */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
              <Sparkles size={13} className="text-indigo-400" />
              <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">
                AI Engine 2.0 Released
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
              Master Any Skill.{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent block mt-1">
                Share Knowledge.
              </span>
              Scale Together.
            </h1>

            <p className="text-slate-400 text-xs leading-relaxed mt-4 font-medium">
              Connect with verified professionals who teach what you want to learn. Our intelligent AI engine matches skill sets, availability, and career goals.
            </p>
          </div>

          {/* Center Lottie Animation */}
          <div className="relative z-10 my-4 py-2 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full z-10 max-w-[280px] scale-110"
            >
              <DotLottieReact
                src="https://lottie.host/9a305a7c-2413-4e38-833a-5e9eba2a6fa8/TazhnYHmwG.lottie"
                autoplay
                loop
              />
            </motion.div>
          </div>

          {/* Bottom Footer Quote */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 flex items-center justify-between text-slate-400 text-[11px] font-medium">
            <span className="italic">"Connecting the nodes of human intelligence."</span>
            <div className="flex items-center gap-1.5 text-indigo-400">
              <ShieldCheck size={14} />
              <span className="font-bold text-[10px] uppercase tracking-wider">Enterprise Grade</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Authentication Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-[#090b16]/90 relative">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md mx-auto w-full"
          >
            {/* Header Header & Subtitle */}
            <div className="mb-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-indigo-400 text-[10px] font-extrabold uppercase tracking-[0.25em] mb-2">
                <Sparkles size={12} /> Authentication Portal
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome <span className="text-indigo-400">Back</span>
              </h2>
              <p className="text-slate-400 text-xs mt-2 font-medium">
                Enter your credentials to access your peer-to-peer learning matrix.
              </p>
            </div>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter Your Valid Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl focus:bg-slate-900 focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-100 placeholder:text-slate-500 font-medium text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl focus:bg-slate-900 focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-100 placeholder:text-slate-500 font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <ButtonSpinner size="sm" />
                ) : (
                  <>
                    <span className="uppercase text-xs tracking-widest font-extrabold">
                      Secure Sign In
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>

              {/* Quick Access Divider */}
              <div className="flex items-center gap-4 py-4">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Or Continue With
                </span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Google OAuth Login Button */}
              <LoginButton
                onClick={async () => {
                  try {
                    const authResult = await signInWithGoogle();
                    if (authResult?.redirected) return;
                    // Check if new user was flagged (set by signInWithGoogle in AuthProvider)
                    const googleNewUser = sessionStorage.getItem("googleNewUser");
                    if (googleNewUser) {
                      sessionStorage.removeItem("googleNewUser");
                      const googleData = JSON.parse(googleNewUser);
                      navigate(`/register${from !== "/" ? `?returnUrl=${encodeURIComponent(from)}` : ""}`, {
                        state: { fromGoogle: true, googleUser: googleData, returnUrl: from },
                      });
                    } else {
                      navigate(from, { replace: true });
                    }
                  } catch (error) {
                    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
                      return; // User closed popup — no error needed
                    }
                    console.error("[Google Sign-in Error]", error.code, error.message);
                    toast.error(error.message || "Could not sign in with Google.");
                  }
                }}
              />
              <p className="text-center text-xs font-semibold text-slate-400 mt-6 pt-2">
                Not a member yet?{" "}
                <NavLink
                  to={`/register${from !== "/" ? `?returnUrl=${encodeURIComponent(from)}` : ""}`}
                  className="text-indigo-400 font-extrabold hover:text-indigo-300 hover:underline underline-offset-4 transition-colors"
                >
                  Join the Engine
                </NavLink>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
