import React, { useState, useEffect, useCallback } from "react";
import { Search, Users, ShieldAlert, CheckCircle2, Ban, RefreshCw, DollarSign, Activity, AlertTriangle } from "lucide-react";
import apiClient from "@/lib/apiClient";

const StudioStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/studio/students?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleStudentAction = async (enrollmentId, action) => {
    const actionNames = {
      ban: "ban student access",
      unban: "unban student",
      suspend: "suspend access",
      restore: "restore access",
      refund: "issue a full refund",
    };

    if (!window.confirm(`Are you sure you want to ${actionNames[action]} for this enrollment?`)) return;

    try {
      await apiClient.patch(`/studio/students/${enrollmentId}/status`, { action });
      fetchStudents();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update student status.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Student Directory & Governance</h1>
          <p className="text-xs text-slate-400">Manage enrolled learners, monitor progress, ban/unban, suspend access, and handle refunds.</p>
        </div>
        <button
          onClick={fetchStudents}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Directory
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, email, or course title..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["all", "active", "banned", "suspended", "refunded"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Student Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Enrolled Course</th>
                <th className="p-3">Progress</th>
                <th className="p-3">Earnings</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                        {student.learnerName ? student.learnerName[0].toUpperCase() : "S"}
                      </div>
                      <div>
                        <div className="font-bold text-white">{student.learnerName}</div>
                        <div className="text-[10px] text-slate-400">{student.learnerEmail}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-slate-200 font-semibold">{student.courseTitle}</td>

                  <td className="p-3">
                    <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${student.progressPercent || 50}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">{student.progressPercent || 50}% completed</span>
                  </td>

                  <td className="p-3 font-bold text-emerald-400">${student.instructorEarnings}</td>

                  <td className="p-3">
                    {student.banned ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                        Banned
                      </span>
                    ) : student.suspended ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Suspended
                      </span>
                    ) : student.refunded ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        Refunded
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {student.banned ? (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "unban")}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "ban")}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/20"
                        >
                          Ban
                        </button>
                      )}

                      {student.suspended ? (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "restore")}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "suspend")}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20"
                        >
                          Suspend
                        </button>
                      )}

                      {!student.refunded && (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "refund")}
                          className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-lg border border-purple-500/20"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No student enrollment records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StudioStudentsPage;
