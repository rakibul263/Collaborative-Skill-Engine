import { useState, useEffect, useCallback } from "react";
import { Pencil, BookOpen } from "lucide-react";
import apiClient from "@/lib/apiClient";
import CourseEditForm from "@/components/dashboard/CourseEditForm";
import LessonManager from "@/components/dashboard/LessonManager";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";
import { formatBDT } from "@/lib/money";

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [managingLessons, setManagingLessons] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/courses/mine");
      setCourses(res.data);
    } catch {
      setError("Failed to load your courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEditSuccess = (updatedCourse) => {
    setCourses((prev) =>
      prev.map((c) => (c._id === updatedCourse._id ? updatedCourse : c))
    );
    setEditingCourse(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" label="Loading courses..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-600 text-sm">{error}</p>
        <button
          onClick={fetchCourses}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (editingCourse !== null) {
    return (
      <CourseEditForm
        course={editingCourse}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingCourse(null)}
      />
    );
  }

  if (managingLessons !== null) {
    return (
      <LessonManager
        courseId={managingLessons}
        onBack={() => setManagingLessons(null)}
      />
    );
  }

  const statusBadge = (status) => {
    const map = {
      draft: "bg-slate-100 text-slate-600",
      pending_review: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const label = {
      draft: "Draft",
      pending_review: "Pending Review",
      approved: "Approved",
      rejected: "Rejected",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
        {label[status] ?? status}
      </span>
    );
  };

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500 text-sm">You haven't created any courses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div
          key={course._id}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{course.title}</h3>
            <div className="flex items-center gap-2">
              {statusBadge(course.status)}
              <span className="text-xs font-bold text-slate-500">{formatBDT(course.price)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditingCourse(course)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => setManagingLessons(course._id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
            >
              <BookOpen size={13} />
              Manage Lessons
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
