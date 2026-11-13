import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Search,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  FolderGit2,
  Star,
  Users,
  ShieldCheck,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";

import ExpertProfileHeader from "@/components/expert/ExpertProfileHeader";
import ExpertAbout from "@/components/expert/ExpertAbout";
import ExpertSkills from "@/components/expert/ExpertSkills";
import ExpertProjects from "@/components/expert/ExpertProjects";
import ExpertCertifications from "@/components/expert/ExpertCertifications";
import ExpertReviews from "@/components/expert/ExpertReviews";
import ExpertLoadingSkeleton from "@/components/expert/ExpertLoadingSkeleton";

const ExpertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [expertData, setExpertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpert = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const viewerParam = authUser?.email ? `?viewerEmail=${encodeURIComponent(authUser.email)}` : "";
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/experts/${id}${viewerParam}`
      );

      if (res.data?.success && res.data?.data) {
        setExpertData(res.data.data);
      } else {
        setError("Failed to load expert details.");
      }
    } catch (err) {
      console.error("Error fetching expert profile:", err);
      const msg = err.response?.data?.message || "Expert profile not found or server error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, authUser?.email]);

  useEffect(() => {
    fetchExpert();
  }, [fetchExpert]);

  const handleRateModal = async () => {
    if (!authUser?.email || !expertData?.profile?.email) return;

    const targetEmail = expertData.profile.email;
    const fullName = expertData.profile.fullName;

    const result = await Swal.fire({
      title: `Rate ${fullName}`,
      html: `
        <div style="display:flex;flex-direction:column;gap:14px;text-align:left">
          <label style="font-size:13px;color:#94a3b8">Rating Score (1 to 5 Stars)</label>
          <input id="swal-rating" type="range" min="1" max="5" value="5" style="accent-color:#6366f1;cursor:pointer;" />
          <textarea id="swal-review" placeholder="Share your experience working or learning with ${fullName}..." style="width:100%;min-height:100px;padding:12px;border:1px solid #334155;background:#0f172a;color:#fff;border-radius:12px;font-size:13px;"></textarea>
        </div>
      `,
      background: "#090d16",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Submit Rating",
      confirmButtonColor: "#6366f1",
      preConfirm: () => {
        const rating = Number(document.getElementById("swal-rating")?.value || 5);
        const review = document.getElementById("swal-review")?.value || "";
        return { rating, review };
      },
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/ratings`, {
        reviewerEmail: authUser.email,
        targetEmail,
        rating: result.value.rating,
        review: result.value.review,
      });

      toast.success("Feedback submitted! Thank you for reviewing this mentor.");
      await fetchExpert();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rating submission failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 bg-[#030712] text-slate-100 font-sans">
        <ExpertLoadingSkeleton />
      </div>
    );
  }

  if (error || !expertData) {
    return (
      <div className="min-h-screen py-24 px-4 bg-[#030712] text-slate-100 font-sans flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl text-center space-y-5"
        >
          <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={36} />
          </div>
          <h2 className="text-xl font-extrabold text-white">Expert Not Found</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            {error || "We couldn't find the requested expert profile. It may have been removed or updated."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate("/experts")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back to Experts</span>
            </button>
            <button
              onClick={fetchExpert}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const { profile, skills, projects, certificates, reviews, stats, connectionStatus, isOnline } = expertData;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#030712] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/experts"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all"
          >
            <ArrowLeft size={14} className="text-indigo-400" />
            <span>Explore All Experts</span>
          </Link>

          <span className="text-[11px] font-semibold text-slate-500">
            Real-time Expert Profile
          </span>
        </div>

        {/* Profile Header Card */}
        <ExpertProfileHeader
          profile={profile}
          reviewsSummary={reviews}
          connectionStatus={connectionStatus}
          isOnline={isOnline}
          onRefetch={fetchExpert}
          onOpenRateModal={handleRateModal}
        />

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <ExpertAbout
              bio={profile.bio}
              education={profile.education}
              location={profile.location}
              role={profile.role}
              headline={profile.headline}
            />

            <ExpertSkills
              teachSkills={skills?.teachSkills}
              learnSkills={skills?.learnSkills}
              teachLevel={profile.teachLevel}
              learnLevel={profile.learnLevel}
            />

            <ExpertProjects projects={projects} />

            <ExpertCertifications certificates={certificates} />

            <ExpertReviews
              reviews={reviews}
              connectionStatus={connectionStatus}
              onOpenRateModal={handleRateModal}
            />
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-8">
            {/* Quick Stats Widget */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl space-y-5">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Sparkles size={16} className="text-indigo-400" />
                <span>Expert Overview</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Teach Skills
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    {stats?.teachSkillsCount || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Projects
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    {stats?.projectsCount || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Credentials
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    {stats?.certificatesCount || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reviews
                  </span>
                  <span className="text-xl font-extrabold text-amber-400">
                    {stats?.ratingsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Platform Guarantee Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-indigo-500/20 p-6 backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck size={20} />
                <h4 className="text-sm font-bold text-white">
                  Verified Practitioner
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Profiles on Collaboration Skill Engine feature authentic skills, verified connections, and transparent community reviews.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertDetail;
