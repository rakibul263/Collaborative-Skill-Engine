import React from "react";
import { FolderGit2, ExternalLink, Github, Sparkles, Code } from "lucide-react";
import ExpertEmptyState from "./ExpertEmptyState";

const ExpertProjects = ({ projects = [] }) => {
  const hasProjects = Array.isArray(projects) && projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
          <FolderGit2 size={18} className="text-indigo-400" />
          <span>Portfolio & Featured Projects</span>
        </h3>
        <ExpertEmptyState
          icon={FolderGit2}
          title="No Portfolio Projects Added Yet"
          description="This expert has not published any showcase projects in their portfolio."
        />
      </div>
    );
  }

  const formatUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  const getTechList = (project) => {
    const raw = project.techStack || project.skills || project.tags;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return raw.split(",").map((s) => s.trim());
    return [];
  };

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <FolderGit2 size={18} className="text-indigo-400" />
            <span>Portfolio & Featured Projects</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Demonstrated technical projects ({projects.length})
          </p>
        </div>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj, idx) => {
          const { title, description, liveUrl, link, githubUrl, github, image, imageUrl } = proj;
          const displayImage = image || imageUrl;
          const displayLive = liveUrl || link;
          const displayRepo = githubUrl || github;
          const techList = getTechList(proj);

          return (
            <div
              key={idx}
              className="group rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/50 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="space-y-3">
                {/* Optional Project Thumbnail */}
                {displayImage && (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 relative">
                    <img
                      src={displayImage}
                      alt={title || "Project Image"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {title || "Untitled Project"}
                  </h4>
                </div>

                {description && (
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-normal">
                    {description}
                  </p>
                )}

                {/* Tech Stack Badges */}
                {techList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {techList.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Links Footer */}
              {(displayLive || displayRepo) && (
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-800/80">
                  {displayLive && (
                    <a
                      href={formatUrl(displayLive)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
                    >
                      <ExternalLink size={13} />
                      <span>Live Preview</span>
                    </a>
                  )}

                  {displayRepo && (
                    <a
                      href={formatUrl(displayRepo)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold transition-all"
                    >
                      <Github size={13} />
                      <span>Source Code</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpertProjects;
