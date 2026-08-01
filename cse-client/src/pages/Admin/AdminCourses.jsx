import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { BookOpen } from "lucide-react";
import CourseApprovalCard from "@/components/admin/CourseApprovalCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/admin-api/courses/pending`, { withCredentials: true });
      setCourses(res.data || []);
    } catch {
      setError("Failed to fetch pending courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleApprove = async (courseId) => {
    const confirm = await Swal.fire({
      title: "Approve this course?",
      text: "The course will become live in the marketplace.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Approve",
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.patch(`${API}/admin-api/courses/${courseId}/approve`, {}, { withCredentials: true });
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      Swal.fire({ icon: "success", title: "Course approved!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      const msg = err?.response?.data?.message || "Action failed. Please try again.";
      Swal.fire({ icon: "error", title: msg, timer: 2000, showConfirmButton: false });
    }
  };

  const handleReject = async (courseId) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject this course?",
      input: "textarea",
      inputLabel: "Rejection reason (optional, max 500 chars)",
      inputAttributes: { maxlength: 500 },
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Reject Course",
      inputValidator: (v) => v.length > 500 ? "Reason must be 500 characters or less." : null,
    });
    if (!isConfirmed) return;

    try {
      await axios.patch(
        `${API}/admin-api/courses/${courseId}/reject`,
        { rejectionReason: reason || "" },
        { withCredentials: true }
      );
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      Swal.fire({ icon: "success", title: "Course rejected.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      const msg = err?.response?.data?.message || "Action failed. Please try again.";
      Swal.fire({ icon: "error", title: msg, timer: 2000, showConfirmButton: false });
    }
  };

  const handleDelete = async (courseId) => {
    const result = await Swal.fire({
      title: "Delete Course?",
      text: "This will permanently delete the course and all associated lessons and enrollment records. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Confirm Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API}/admin-api/courses/${courseId}`, { withCredentials: true });
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
    } catch (err) {
      if (err?.response?.status === 404) {
        setCourses((prev) => prev.filter((c) => c._id !== courseId));
        Swal.fire("Not Found", "Course not found. It may have already been deleted.", "info");
      } else {
        Swal.fire("Error", "Failed to delete course. Please try again.", "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#1B1B4B]">Course Approvals</h2>
        <p className="text-sm text-slate-400 font-bold mt-1">
          {courses.length} course{courses.length !== 1 ? "s" : ""} pending review
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 font-bold">{error}</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No pending courses</p>
          <p className="text-slate-300 text-xs font-bold mt-1">All course submissions have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <CourseApprovalCard
              key={course._id}
              course={course}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
