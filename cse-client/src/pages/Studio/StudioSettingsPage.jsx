import React, { useContext, useState } from "react";
import { User, Mail, ShieldCheck, Camera, Save, Sparkles, Settings } from "lucide-react";
import { toast } from "sonner";
import { AuthContext } from "@/context/AuthContext/AuthContext";
import apiClient from "@/lib/apiClient";

const StudioSettingsPage = () => {
  const { user } = useContext(AuthContext) || {};
  const [headline, setHeadline] = useState(user?.headline || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiClient.patch("/users/me", { headline, bio });
      toast.success("Instructor studio profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Instructor Profile & Studio Settings</h1>
          <p className="text-xs text-slate-400">
            Customize your public instructor credentials, headline, and course creator biography.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Profile Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-800 pb-6">
          <img
            src={user?.profileImage || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"}
            alt="Profile"
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-lg"
          />
          <div className="space-y-1">
            <h3 className="font-bold text-white text-lg">{user?.fullName || user?.displayName}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Creator Standing
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Instructor Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Principal Software Engineer & Cloud Architect"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Teaching Bio & Experience Summary</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Describe your engineering experience and what students will gain from taking your courses..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium leading-relaxed"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>

      </form>

    </div>
  );
};

export default StudioSettingsPage;