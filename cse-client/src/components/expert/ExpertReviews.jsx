import React from "react";
import { Star, MessageSquare, Sparkles, User, ThumbsUp } from "lucide-react";
import ExpertEmptyState from "./ExpertEmptyState";

const ExpertReviews = ({
  reviews = {},
  connectionStatus,
  onOpenRateModal,
}) => {
  const { averageRating = 0, totalRatings = 0, items = [] } = reviews || {};
  const hasReviews = totalRatings > 0 && items.length > 0;

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" />
            <span>Ratings & Peer Feedback</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified feedback from mentees and platform collaborators
          </p>
        </div>

        {/* Rating Button for Connected Peers */}
        {connectionStatus === "connected" && (
          <button
            onClick={onOpenRateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all shadow-xs"
          >
            <Star size={14} className="fill-amber-400" />
            <span>Write a Review</span>
          </button>
        )}
      </div>

      {!hasReviews ? (
        <ExpertEmptyState
          icon={Star}
          title="No Peer Reviews Yet"
          description="This expert does not have any recorded feedback or rating submissions yet."
          actionLabel={connectionStatus === "connected" ? "Leave First Review" : undefined}
          onAction={connectionStatus === "connected" ? onOpenRateModal : undefined}
        />
      ) : (
        <div className="space-y-6">
          {/* Rating Summary Bar */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {Number(averageRating).toFixed(1)}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={
                        star <= Math.round(averageRating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-700"
                      }
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Based on {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-indigo-300 font-bold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Verified Mentorship Rating</span>
            </div>
          </div>

          {/* Reviews List Feed */}
          <div className="space-y-4">
            {items.map((item, idx) => {
              const { _id, rating, review, createdAt, reviewer } = item;
              const reviewerName = reviewer?.fullName || "Anonymous Peer";
              const reviewerImage = reviewer?.profileImage;

              return (
                <div
                  key={_id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        {reviewerImage ? (
                          <img
                            src={reviewerImage}
                            alt={reviewerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-sm">
                            {reviewerName[0]}
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-white">
                          {reviewerName}
                        </h5>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={
                                star <= rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-700"
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {createdAt && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {new Date(createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {review && (
                    <p className="text-xs text-slate-300 leading-relaxed font-normal italic pl-1 border-l-2 border-indigo-500/40">
                      "{review}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertReviews;
