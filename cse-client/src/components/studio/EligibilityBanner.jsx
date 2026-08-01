import { Star, Video, TrendingUp } from "lucide-react";

const EligibilityBanner = ({ averageRating, sessionCount }) => {
  const ratingOk = averageRating >= 4.0;
  const sessionOk = sessionCount > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <TrendingUp size={22} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-black text-[#1B1B4B] mb-1">Unlock Course Creation</h3>
          <p className="text-sm text-slate-500 font-bold mb-4">
            Complete these two requirements to start creating premium courses:
          </p>

          <div className="space-y-3">
            {/* Rating requirement */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${ratingOk ? "bg-green-50 border border-green-100" : "bg-white border border-slate-200"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ratingOk ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                <Star size={15} className={ratingOk ? "fill-white" : ""} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black ${ratingOk ? "text-green-700" : "text-slate-700"}`}>
                  Average Rating ≥ 4.0
                </p>
                <p className={`text-xs font-bold ${ratingOk ? "text-green-600" : "text-slate-500"}`}>
                  Your rating: <strong>{averageRating.toFixed(1)}</strong>
                  {!ratingOk && ` · Need ${(4.0 - averageRating).toFixed(1)} more`}
                </p>
              </div>
              {ratingOk && (
                <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Met</span>
              )}
            </div>

            {/* Session requirement */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${sessionOk ? "bg-green-50 border border-green-100" : "bg-white border border-slate-200"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sessionOk ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                <Video size={15} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black ${sessionOk ? "text-green-700" : "text-slate-700"}`}>
                  At least 1 completed free session
                </p>
                <p className={`text-xs font-bold ${sessionOk ? "text-green-600" : "text-slate-500"}`}>
                  Sessions delivered: <strong>{sessionCount}</strong>
                  {!sessionOk && " · Schedule a free session to get started"}
                </p>
              </div>
              {sessionOk && (
                <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Met</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EligibilityBanner;
