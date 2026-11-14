import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import {
  BookOpen,
  Search,
  RefreshCw,
  X,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CourseApprovalCard from "@/components/admin/CourseApprovalCard";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import { formatBDT } from "@/lib/money";
import adminApiClient from "@/lib/adminApiClient";

const AdminCourses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending";

  const [statusTab, setStatusTab] = useState(initialStatus);
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [inspectModalCourse, setInspectModalCourse] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const debounceRef = useRef(null);

  const fetchCourses = useCallback(
    async (tab = statusTab, pg = page, q = search) => {
      setLoading(true);
      try {
        const res = await adminApiClient.get("/courses", {
          params: {
            status: tab === "all" ? undefined : tab,
            page: pg,
            limit: 12,
            search: q || undefined,
          },
        });
        setCourses(res.data.courses || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } catch {
        toast.error("Failed to fetch courses.");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [statusTab, page, search]
  );

  useEffect(() => {
    fetchCourses(statusTab, page, search);
  }, [statusTab, page, fetchCourses]);

  const handleTabChange = (tab) => {
    setStatusTab(tab);
    setPage(1);
    setSearchParams({ status: tab });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCourses(statusTab, 1, val);
    }, 300);
  };

  const handleInspectCourse = async (courseSummary) => {
    setInspectModalCourse(courseSummary);
    setInspectLoading(true);
    try {
      const res = await adminApiClient.get(`/courses/${courseSummary._id}`);
      setInspectModalCourse(res.data?.course || res.data);
    } catch {
      toast.error("Failed to load detailed curriculum.");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleApprove = async (courseId) => {
    const confirm = await showConfirm({
      variant: "approve",
      badge: "MARKETPLACE RELEASE",
      title: "Authorize Curriculum Release?",
      description:
        "This course will become live on the public marketplace immediately for learners to purchase and enroll.",
      confirmText: "Approve & Publish",
    });

    if (!confirm.isConfirmed) return;

    try {
      await adminApiClient.patch(`/courses/${courseId}/approve`);
      toast.confirmed("Course Approved & Published", {
        description: "Curriculum is now live on the public marketplace.",
        badge: "LIVE",
      });
      if (inspectModalCourse && inspectModalCourse._id === courseId) {
        setInspectModalCourse((prev) => ({ ...prev, status: "approved" }));
      }
      fetchCourses(statusTab, page, search);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed.");
    }
  };

  const handleReject = async (courseId) => {
    const { value: reason, isConfirmed } = await showConfirm({
      variant: "warning",
      badge: "CURRICULUM AUDIT",
      title: "Reject Curriculum Submission",
      description:
        "Provide constructive feedback so the instructor understands what improvements are required before resubmission.",
      input: {
        type: "textarea",
        label: "Constructive Feedback / Rejection Reason",
        placeholder:
          "Specify changes needed (e.g., improve video clarity, complete lesson syllabus...)",
        maxLength: 500,
      },
      confirmText: "Submit Rejection",
    });

    if (!isConfirmed) return;

    try {
      await adminApiClient.patch(`/courses/${courseId}/reject`, {
        rejectionReason: reason || "Does not meet platform quality standards.",
      });
      toast.warning("Course submission rejected with feedback.");
      if (inspectModalCourse && inspectModalCourse._id === courseId) {
        setInspectModalCourse((prev) => ({
          ...prev,
          status: "rejected",
          rejectionReason: reason,
        }));
      }
      fetchCourses(statusTab, page, search);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed.");
    }
  };

  const handleDelete = async (courseId, courseTitle) => {
    const result = await showConfirm({
      variant: "delete",
      badge: "DATABASE PURGE",
      title: "Purge Course from Database?",
      description:
        "Permanently delete this course along with all enrolled student records, video lessons, and syllabus modules.",
      targetLabel: "Target Course",
      targetValue: courseTitle,
      notice: "This action cannot be undone and removes the course immediately.",
      confirmText: "Purge Course",
    });

    if (!result.isConfirmed) return;

    try {
      await adminApiClient.delete(`/courses/${courseId}`);
      toast.deleted("Course Purged Permanently", {
        description: "Course, modules, and linked enrollments removed.",
        target: courseTitle,
        badge: "PURGED",
      });
      if (inspectModalCourse && inspectModalCourse._id === courseId) {
        setInspectModalCourse(null);
      }
      fetchCourses(statusTab, page, search);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete course.");
    }
  };

  if (initialLoading) {
    return (
      <AdminPageLoader
        label="Auditing Course Repository & Curriculum Modules..."
        subtext="Loading course submissions, lesson structure, and instructor metadata"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="text-slate-400 w-5 h-5" />
            Curriculum Approvals & Course Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review instructor submissions, audit lesson modules, and manage marketplace listings
          </p>
        </div>

        <button
          onClick={() => fetchCourses(statusTab, page, search)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#0E1322] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Sync Submissions
        </button>
      </div>

      {/* Tabs and Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0E1322] border border-slate-800 rounded-xl overflow-x-auto custom-scrollbar">
          {[
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved Live" },
            { id: "rejected", label: "Rejected" },
            { id: "all", label: "All Courses" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusTab === tab.id
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by title, instructor..."
            className="w-full pl-9 pr-4 py-2 bg-[#0E1322] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
          />
        </div>
      </div>

      {/* Main Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="md" label="Auditing Course Repository..." />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 p-16 text-center">
          <BookOpen size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
            No {statusTab !== "all" ? statusTab : ""} courses found
          </p>
          <p className="text-slate-500 text-xs mt-1">All curriculum items in this filter are up to date</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {courses.map((course) => (
            <CourseApprovalCard
              key={course._id}
              course={course}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              onInspect={handleInspectCourse}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-[#0E1322] border border-slate-800/80 rounded-xl">
          <p className="text-xs text-slate-400">
            Page <span className="text-slate-100 font-semibold">{page}</span> of {totalPages} &bull;{" "}
            {total} courses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-[#080B11] border border-slate-800 rounded-md text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-[#080B11] border border-slate-800 rounded-md text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detailed Course Inspection Modal */}
      {inspectModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1322] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-[#0A0E1A]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                    Curriculum Audit
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    Status: {inspectModalCourse.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {inspectModalCourse.title}
                </h2>
              </div>
              <button
                onClick={() => setInspectModalCourse(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {inspectLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner size="md" label="Loading curriculum details..." />
                </div>
              ) : (
                <>
                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#080B11] rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        Instructor
                      </span>
                      <p className="font-semibold text-slate-200 mt-1">
                        {inspectModalCourse.instructorName || inspectModalCourse.instructorEmail}
                      </p>
                      <p className="text-slate-400 font-mono mt-0.5">
                        {inspectModalCourse.instructorEmail}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        Pricing & Topic
                      </span>
                      <p className="font-bold text-slate-100 mt-1 text-sm font-mono">
                        {formatBDT(inspectModalCourse.price || 0)}
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        Topic: {inspectModalCourse.topic || "General"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        Enrollment Metrics
                      </span>
                      <p className="font-semibold text-slate-200 mt-1 text-sm font-mono">
                        {inspectModalCourse.enrollmentCount || 0} Learners
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {(inspectModalCourse.curriculum || []).length} Total Lessons
                      </p>
                    </div>
                  </div>

                  {/* Course Description */}
                  <div>
                    <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                      Course Description
                    </h4>
                    <p className="p-4 bg-[#080B11] rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                      {inspectModalCourse.description || "No description provided."}
                    </p>
                  </div>

                  {/* Curriculum Lessons breakdown */}
                  <div>
                    {(() => {
                      const items =
                        inspectModalCourse.lessons?.length > 0
                          ? inspectModalCourse.lessons
                          : inspectModalCourse.curriculum || [];
                      return (
                        <>
                          <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center justify-between">
                            <span>Curriculum Syllabus Lessons</span>
                            <span className="text-slate-400 font-mono">{items.length} Modules</span>
                          </h4>

                          {items.length === 0 ? (
                            <p className="text-slate-500 font-mono text-center py-6">
                              No lessons registered in this submission
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {items.map((lesson, idx) => {
                                const link =
                                  (Array.isArray(lesson.videoLinks) && lesson.videoLinks[0]) ||
                                  lesson.videoUrl;
                                const dur = lesson.videoDuration || lesson.duration;
                                return (
                                  <div
                                    key={lesson._id || idx}
                                    className="p-3 bg-[#080B11] border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-semibold text-xs shrink-0 font-mono">
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-slate-200 truncate">
                                          {lesson.title || `Lesson #${idx + 1}`}
                                        </p>
                                        {dur ? (
                                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Clock size={11} /> {dur} mins
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    {link && (
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] shrink-0 transition-colors"
                                      >
                                        <Video size={12} />
                                        Preview Link
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Modal Action Bar */}
            <div className="p-4 border-t border-slate-800 bg-[#0A0E1A] flex items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(inspectModalCourse._id, inspectModalCourse.title)}
                className="px-4 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium transition-colors border border-slate-700/60"
              >
                Delete Course
              </button>

              <div className="flex items-center gap-2">
                {inspectModalCourse.status !== "rejected" && (
                  <button
                    onClick={() => handleReject(inspectModalCourse._id)}
                    className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Reject Course
                  </button>
                )}

                {inspectModalCourse.status !== "approved" && (
                  <button
                    onClick={() => handleApprove(inspectModalCourse._id)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    Approve Curriculum
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
