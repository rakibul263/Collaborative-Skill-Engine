import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast-system";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";

export default function EnrolledStudents() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchEnrolledStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/dashboard/enrolled-students");
      setData(res.data);
    } catch (err) {
      setError("Failed to load enrolled students. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrolledStudents();
  }, [fetchEnrolledStudents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" label="Loading student enrollments..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-600 text-sm">{error}</p>
        <button
          onClick={fetchEnrolledStudents}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const courses = data?.courses ?? [];
  const hasEnrollments = courses.some((c) => c.enrollmentCount > 0);

  if (courses.length === 0 || !hasEnrollments) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500 text-sm">
          No students have enrolled in your courses yet.
        </p>
      </div>
    );
  }

  const toggleExpanded = (courseId) => {
    setExpanded((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    return isoString.slice(0, 10); // YYYY-MM-DD
  };

  const handleBan = async (enrollment) => {
    const result = await showConfirm({
      variant: "danger",
      badge: "STUDENT RESTRICTION",
      title: "Ban Student Access?",
      description:
        "This will restrict the student's access to all lessons and course resources.",
      targetLabel: "Student",
      targetValue: enrollment.learnerName,
      confirmText: "Confirm Ban",
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.patch(`/dashboard/enrollments/${enrollment._id}/ban`);
      setData((prev) => ({
        ...prev,
        courses: prev.courses.map((course) => ({
          ...course,
          enrollments: course.enrollments.map((e) =>
            e._id === enrollment._id
              ? { ...e, banned: true, bannedAt: new Date().toISOString() }
              : e
          ),
        })),
      }));
      toast.success("Student access restricted.");
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleUnban = async (enrollment) => {
    try {
      await apiClient.patch(`/dashboard/enrollments/${enrollment._id}/unban`);
      setData((prev) => ({
        ...prev,
        courses: prev.courses.map((course) => ({
          ...course,
          enrollments: course.enrollments.map((e) => {
            if (e._id !== enrollment._id) return e;
            const { bannedAt, bannedByEmail, ...rest } = e;
            return { ...rest, banned: false };
          }),
        })),
      }));
      toast.success("Student access restored.");
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div
          key={course.courseId}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Course header — clickable to toggle */}
          <button
            onClick={() => toggleExpanded(course.courseId)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-sm font-bold text-slate-800">
              {course.courseTitle}
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700">
                {course.enrollmentCount}{" "}
                {course.enrollmentCount === 1 ? "student" : "students"}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  expanded[course.courseId] ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Expanded student list */}
          {expanded[course.courseId] && (
            <div className="border-t border-slate-100">
              {course.enrollments.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-400">
                  No enrollments yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {course.enrollments.map((enrollment) => (
                    <div
                      key={enrollment._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4"
                    >
                      {/* Student info */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {enrollment.learnerName || "—"}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {enrollment.learnerEmail}
                        </span>
                        <span className="text-xs text-slate-400">
                          Enrolled: {formatDate(enrollment.createdAt)}
                        </span>
                      </div>

                      {/* Badges + actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {enrollment.banned === true && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                            Banned
                          </span>
                        )}
                        {enrollment.banned === true ? (
                          <button
                            onClick={() => handleUnban(enrollment)}
                            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(enrollment)}
                            className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black rounded-xl transition-all"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
