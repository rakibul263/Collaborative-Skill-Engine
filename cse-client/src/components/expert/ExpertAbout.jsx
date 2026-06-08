import React from "react";
import { User, GraduationCap, MapPin, Briefcase, Sparkles, BookOpen } from "lucide-react";
import ExpertEmptyState from "./ExpertEmptyState";

const ExpertAbout = ({ bio, education, location, role, headline }) => {
  const hasData = Boolean(bio || education || headline);

  if (!hasData) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
          <User size={18} className="text-indigo-400" />
          <span>About Expert</span>
        </h3>
        <ExpertEmptyState
          icon={User}
          title="No Bio Information Added Yet"
          description="This expert has not provided a detailed bio or background summary yet."
        />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
          <User size={18} className="text-indigo-400" />
          <span>About Expert</span>
        </h3>
        {role && (
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            {role}
          </span>
        )}
      </div>

      {/* Bio Paragraph */}
      {bio && (
        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {bio}
          </p>
        </div>
      )}

      {/* Quick Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {education && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <GraduationCap size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Education
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {education}
              </span>
            </div>
          </div>
        )}

        {location && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Location
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {location}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertAbout;
