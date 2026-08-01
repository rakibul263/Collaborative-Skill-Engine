import React, { useContext, useState } from "react";
import { User, Mail, ShieldCheck, Camera, Save, Sparkles } from "lucide-react";
import { AuthContext } from "@/context/AuthContext/AuthContext";
import apiClient from "@/lib/apiClient";

const StudioSettingsPage = () => {
  const { user } = useContext(AuthContext) || {};
  const [headline, setHeadline] = useState(user?.headline || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await apiClient.patch("/users/me", { headline, bio });
      setMessage("Studio instructor profile updated successfully!");
    } catch (err) {
      setMessage("Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Instructor Profile & Studio Settings</h1>
        <p className="text-xs text-slate-400">Configure public instructor branding and studio preferences.</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {message && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs font-bold text-indigo-300">
            {message}
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <img
            src={user?.profileImage || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/50"
          />
          <div>
            <h3 className="font-bold text-white text-base">{user?.fullName || user?.displayName}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <span className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Verified Creator Standing
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Instructor Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Principal Software Engineer & Cloud Architect"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Teaching Bio & Experience Summary</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Describe your expertise and what students will gain from your courses..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>

      </form>

    </div>
  );
};

export default StudioSettingsPage;
