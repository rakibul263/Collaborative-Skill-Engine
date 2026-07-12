import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Send, ShieldCheck, RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";

const StudioReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTextMap, setReplyTextMap] = useState({});

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/studio/reviews");
      setReviews(res.data || []);
    } catch (err) {
      console.error("Fetch reviews error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handlePostReply = async (reviewId) => {
    const text = replyTextMap[reviewId];
    if (!text || text.trim().length < 2) return alert("Please enter a valid reply.");

    try {
      await apiClient.post(`/studio/reviews/${reviewId}/reply`, { replyText: text });
      setReplyTextMap((prev) => ({ ...prev, [reviewId]: "" }));
      fetchReviews();
    } catch (err) {
      alert("Failed to post reply.");
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Course Reviews & Student Feedback</h1>
          <p className="text-xs text-slate-400">Read ratings left by enrolled students and reply directly.</p>
        </div>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Reviews
        </button>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-500/30 font-black text-xs text-indigo-300 flex items-center justify-center">
                  {review.studentName ? review.studentName[0].toUpperCase() : "S"}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{review.studentName || "Anonymous Learner"}</h4>
                  <div className="flex items-center gap-1 text-amber-400 text-xs mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating || 5) ? "fill-amber-400" : "text-slate-700"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{review.reviewText || "Great course content!"}</p>

            {/* Instructor Existing Reply */}
            {review.replyText && (
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Your Response ({new Date(review.replyAt).toLocaleDateString()})
                </div>
                <p className="text-slate-300">{review.replyText}</p>
              </div>
            )}

            {/* Reply Input Form */}
            {!review.replyText && (
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={replyTextMap[review._id] || ""}
                  onChange={(e) => setReplyTextMap({ ...replyTextMap, [review._id]: e.target.value })}
                  placeholder="Write an instructor response..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handlePostReply(review._id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && !loading && (
          <div className="py-16 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 text-xs">
            No student reviews submitted yet.
          </div>
        )}
      </div>

    </div>
  );
};

export default StudioReviewsPage;
