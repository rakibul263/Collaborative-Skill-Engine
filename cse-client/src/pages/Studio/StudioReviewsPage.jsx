import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Send, ShieldCheck, RefreshCw, ThumbsUp, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

const StudioReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/studio/reviews");
      setReviews(res.data || []);
    } catch (err) {
      console.error("Fetch reviews error:", err);
      toast.error("Could not fetch student reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handlePostReply = async (reviewId) => {
    const text = replyTextMap[reviewId];
    if (!text || text.trim().length < 2) {
      return toast.error("Please enter a valid reply before submitting.");
    }

    setSubmittingId(reviewId);
    try {
      await apiClient.post(`/studio/reviews/${reviewId}/reply`, { replyText: text.trim() });
      toast.success("Instructor response posted successfully!");
      setReplyTextMap((prev) => ({ ...prev, [reviewId]: "" }));
      fetchReviews();
    } catch (err) {
      toast.error("Failed to post response to review.");
    } finally {
      setSubmittingId(null);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">Student Feedback & Reviews</h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor verified learner ratings, gather course feedback, and engage directly with replies.
          </p>
        </div>

        <button
          onClick={fetchReviews}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Reviews
        </button>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rating</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-white">{avgRating}</span>
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold">Consistently high satisfaction</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Feedback</span>
          <div className="text-3xl font-black text-white">{reviews.length}</div>
          <p className="text-[11px] text-slate-400 font-medium">Ratings submitted by enrolled learners</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor Response Rate</span>
          <div className="text-3xl font-black text-white">
            {reviews.length > 0
              ? `${Math.round((reviews.filter((r) => r.replyText).length / reviews.length) * 100)}%`
              : "100%"}
          </div>
          <p className="text-[11px] text-indigo-400 font-semibold">Active instructor engagement</p>
        </div>
      </div>

      {/* ── REVIEWS LIST ── */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review._id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 font-black text-xs text-indigo-300 flex items-center justify-center">
                  {review.studentName ? review.studentName[0].toUpperCase() : "S"}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{review.studentName || "Verified Learner"}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < (review.rating || 5) ? "fill-amber-400" : "text-slate-700"}`}
                        />
                      ))}
                    </div>
                    {review.courseTitle && (
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                        {review.courseTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-slate-500 font-medium">
                {new Date(review.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              "{review.reviewText || "Excellent explanations and high quality course curriculum!"}"
            </p>

            {/* Existing Reply */}
            {review.replyText && (
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl text-xs space-y-1.5 ml-0 sm:ml-4">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Your Response • {new Date(review.replyAt || review.createdAt).toLocaleDateString()}
                </div>
                <p className="text-slate-300 leading-relaxed">{review.replyText}</p>
              </div>
            )}

            {/* Reply Input Form */}
            {!review.replyText && (
              <div className="flex gap-2 pt-1 ml-0 sm:ml-4">
                <input
                  type="text"
                  value={replyTextMap[review._id] || ""}
                  onChange={(e) => setReplyTextMap({ ...replyTextMap, [review._id]: e.target.value })}
                  placeholder="Reply to this student publicly as instructor..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handlePostReply(review._id)}
                  disabled={submittingId === review._id}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingId === review._id ? "Sending..." : "Reply"}
                </button>
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && !loading && (
          <div className="py-20 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No student feedback or ratings submitted yet.</p>
            <p className="text-[11px] text-slate-500">Reviews left by enrolled learners will show up here.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default StudioReviewsPage;