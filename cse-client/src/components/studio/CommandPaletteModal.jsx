import React, { useState, useEffect } from "react";
import { Search, BookOpen, Users, Video, Wallet, BarChart3, Settings, Tag, ShieldCheck, Mail, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBDT } from "@/lib/money";

const CommandPaletteModal = ({ isOpen, onClose, courses = [], students = [] }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { id: "nav-dash", title: "Go to Overview Dashboard", icon: BarChart3, path: "/studio/dashboard", cat: "Navigation" },
    { id: "nav-analytics", title: "View Creator Analytics & Revenue", icon: Wallet, path: "/studio/analytics", cat: "Navigation" },
    { id: "nav-courses", title: "Manage All Courses", icon: BookOpen, path: "/studio/courses", cat: "Navigation" },
    { id: "nav-students", title: "Manage Enrolled Students", icon: Users, path: "/studio/students", cat: "Navigation" },
    { id: "nav-appeals", title: "Appeals Mailbox (Student Ban & Access Inquiries)", icon: Mail, path: "/studio/appeals", cat: "Navigation" },
    { id: "nav-reviews", title: "Read & Reply to Reviews", icon: ShieldCheck, path: "/studio/reviews", cat: "Navigation" },
    { id: "nav-coupons", title: "Create Discount Coupons", icon: Tag, path: "/studio/coupons", cat: "Navigation" },
    { id: "nav-logs", title: "View Creator Activity Logs", icon: Settings, path: "/studio/audit-logs", cat: "Navigation" },
  ];

  const filteredCourses = courses.filter((c) =>
    c.title?.toLowerCase().includes(query.toLowerCase()) ||
    c.topic?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredStudents = students.filter((s) =>
    s.learnerName?.toLowerCase().includes(query.toLowerCase()) ||
    s.learnerEmail?.toLowerCase().includes(query.toLowerCase()) ||
    s.courseTitle?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredActions = quickActions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search courses, lessons, students, settings..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results / Action List */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs">
          
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1">
                Quick Navigation & Commands
              </div>
              <div className="space-y-1 mt-1">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.path)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-600/20 hover:text-indigo-200 text-slate-300 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-indigo-500 group-hover:text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-xs">{action.title}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Courses */}
          {filteredCourses.length > 0 && (
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1">
                Matching Courses ({filteredCourses.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredCourses.map((course) => (
                  <button
                    key={course._id || course.id}
                    onClick={() => handleSelect("/studio/courses")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{course.title}</div>
                        <div className="text-[10px] text-slate-400">{course.topic} • {formatBDT(course.price)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {course.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Students */}
          {filteredStudents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 py-1">
                Matching Enrolled Students ({filteredStudents.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id || student.learnerEmail}
                    onClick={() => handleSelect("/studio/students")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{student.learnerName}</div>
                        <div className="text-[10px] text-slate-400">{student.learnerEmail} • {student.courseTitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Enrolled
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredActions.length === 0 && filteredCourses.length === 0 && filteredStudents.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No matching commands or records found for "<strong className="text-white">{query}</strong>"
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 flex items-center justify-between px-4">
          <span>Navigate with mouse or keyboard</span>
          <span className="font-mono text-slate-400">CSE Studio Command Engine</span>
        </div>

      </div>
    </div>
  );
};

export default CommandPaletteModal;
