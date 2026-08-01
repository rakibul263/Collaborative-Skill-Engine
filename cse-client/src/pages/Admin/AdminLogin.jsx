import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import axios from "axios";
import { useAdmin } from "@/context/AdminContext/AdminContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminLogin = () => {
  const { loginAdmin, isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // Already logged in
  if (isAdminAuthenticated) {
    navigate("/admin/overview");
    return null;
  }

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/admin-api/login`,
        { email: data.email, password: data.password },
        { withCredentials: true }
      );
      loginAdmin(res.data.token || "authenticated");
      navigate("/admin/overview");
    } catch (err) {
      const msg = err?.response?.data?.message || "Login failed. Please try again.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B1B4B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#1B1B4B] to-indigo-700 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Access</h1>
            <p className="text-indigo-300 text-sm font-bold mt-1">Collaborative Skill Engine</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-5">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl">
                {serverError}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Admin Email
              </label>
              <input
                type="email"
                {...register("email", { required: "Email is required" })}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: "Password is required" })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1B1B4B] hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={16} />
                  Sign In to Admin Panel
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 font-bold pb-6">
            Unauthorized access is prohibited
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
