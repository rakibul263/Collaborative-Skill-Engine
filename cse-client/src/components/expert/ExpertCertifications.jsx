import React from "react";
import { Award, ExternalLink, ShieldCheck, Calendar } from "lucide-react";
import ExpertEmptyState from "./ExpertEmptyState";

const ExpertCertifications = ({ certificates = [] }) => {
  const hasCerts = Array.isArray(certificates) && certificates.length > 0;

  if (!hasCerts) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
          <Award size={18} className="text-amber-400" />
          <span>Certifications & Credentials</span>
        </h3>
        <ExpertEmptyState
          icon={Award}
          title="No Certifications Listed Yet"
          description="This expert has not added any verified certificates or professional credentials yet."
        />
      </div>
    );
  }

  const formatUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <span>Certifications & Credentials</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified qualifications & completed certifications ({certificates.length})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certificates.map((cert, idx) => {
          const { title, name, issuer, organization, issueDate, date, fileUrl, credentialUrl, link } = cert;
          const certTitle = title || name || "Professional Certification";
          const certIssuer = issuer || organization || "Verified Platform";
          const certDate = issueDate || date;
          const certLink = fileUrl || credentialUrl || link;

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-start gap-4 hover:border-amber-500/40 transition-colors"
            >
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldCheck size={20} />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-bold text-white truncate">
                  {certTitle}
                </h4>
                <p className="text-xs font-medium text-slate-400 truncate">
                  {certIssuer}
                </p>

                {certDate && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pt-1">
                    <Calendar size={12} />
                    <span>Issued {certDate}</span>
                  </div>
                )}

                {certLink && (
                  <div className="pt-2">
                    <a
                      href={formatUrl(certLink)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>View Credential</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpertCertifications;
