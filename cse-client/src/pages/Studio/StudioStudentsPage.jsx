import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Users,
  ShieldAlert,
  CheckCircle2,
  Ban,
  RefreshCw,
  Wallet,
  Activity,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Receipt,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import apiClient from "@/lib/apiClient";
import { getCachedData } from "@/lib/fastCache";
import { getSocket } from "@/lib/socket";
import { formatBDT } from "@/lib/money";
import InvoiceModal from "@/components/courses/InvoiceModal";
import StudentManagementModal from "@/components/studio/StudentManagementModal";

const StudioStudentsPage = () => {
  const [students, setStudents] = useState(
    () => getCachedData("/studio/students?search=&status=all")?.students || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedData("/studio/students?search=&status=all")
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [selectedStudentForManage, setSelectedStudentForManage] = useState(null);

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    const url = `/studio/students?search=${encodeURIComponent(search)}&status=${statusFilter}`;
    if (!getCachedData(url) && !forceRefresh) setLoading(true);
    try {
      const res = await apiClient.get(url, { forceRefresh });
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error("Fetch students error:", err);
      if (!getCachedData(url)) toast.error("Could not fetch enrolled learners.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchStudents();
    };

    socket.on("appeal:new", handleUpdate);
    socket.on("appeal:updated", handleUpdate);
    socket.on("enrollment:updated", handleUpdate);

    return () => {
      socket.off("appeal:new", handleUpdate);
      socket.off("appeal:updated", handleUpdate);
      socket.off("enrollment:updated", handleUpdate);
    };
  }, [fetchStudents]);

  const handleStudentAction = async (enrollmentId, action) => {
    const actionMeta = {
      ban: {
        variant: "danger",
        badge: "STUDENT RESTRICTION",
        title: "Ban Student Access?",
        description: "This student will immediately lose access to the course content and community.",
        confirmText: "Confirm Ban",
      },
      unban: {
        variant: "approve",
        badge: "ACCESS RESTORE",
        title: "Unban Student Access?",
        description: "Restore this student's enrollment and full access to lessons.",
        confirmText: "Restore Access",
      },
      suspend: {
        variant: "warning",
        badge: "TEMP SUSPENSION",
        title: "Suspend Student Access?",
        description: "Temporarily pause this student's access to course materials.",
        confirmText: "Suspend Access",
      },
      restore: {
        variant: "approve",
        badge: "ACCESS RESTORE",
        title: "Restore Student Access?",
        description: "Re-enable active enrollment for this student.",
        confirmText: "Restore Access",
      },
      refund: {
        variant: "warning",
        badge: "FULL REFUND",
        title: "Issue Full Enrollment Refund?",
        description: "This will issue a full refund and revoke the student's course enrollment.",
        confirmText: "Issue Refund",
      },
    };

    const cfg = actionMeta[action] || {
      variant: "warning",
      title: `Confirm ${action}?`,
      description: `Are you sure you want to ${action} for this student enrollment?`,
      confirmText: "Confirm",
    };

    const { isConfirmed } = await showConfirm(cfg);
    if (!isConfirmed) return;

    try {
      await apiClient.patch(`/studio/students/${enrollmentId}/status`, { action });
      toast.confirmed(`Student Status Updated`, {
        description: `Action "${action}" applied to enrollment successfully.`,
        badge: action.toUpperCase(),
      });
      fetchStudents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update student status.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">Student Directory & Governance</h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor enrolled learners across your courses, track completion progress, manage access permissions, and handle refunds.
          </p>
        </div>

        <button
          onClick={fetchStudents}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          Refresh Directory
        </button>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner name, email, or course title..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "active", "banned", "suspended", "appealed", "refunded"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80"
              }`}
            >
              {st === "appealed" ? "Appeals Received" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── STUDENT RECORDS TABLE ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Learner</th>
                <th className="p-3.5">Enrolled Course</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Progress</th>
                <th className="p-3.5">Net Earnings</th>
                <th className="p-3.5">Access Status</th>
                <th className="p-3.5 text-right">Invoice &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                        {student.learnerName ? student.learnerName[0].toUpperCase() : "S"}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{student.learnerName}</div>
                        <div className="text-[11px] text-slate-400">{student.learnerEmail}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-200 font-semibold max-w-[200px] truncate">
                    {student.courseTitle}
                  </td>

                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 font-mono text-[10px] font-bold text-cyan-300">
                      {student.invoiceNumber || "INV-LEDGER"}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                        style={{ width: `${student.progressPercent || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {student.progressPercent || 0}% completed
                    </span>
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-emerald-400">
                      {formatBDT(student.instructorEarnings || 0)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Paid: {formatBDT(student.price || 0)}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="space-y-1">
                      {student.banned ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                          Banned
                        </span>
                      ) : student.suspended ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          Suspended
                        </span>
                      ) : student.refunded ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                          Refunded
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Active
                        </span>
                      )}

                      {student.hasAppeal && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold animate-pulse w-fit">
                          <MessageSquare className="w-2.5 h-2.5" />
                          Appeal Received
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForManage(student)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          student.hasAppeal
                            ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
                            : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30"
                        }`}
                        title="Manage Student & Appeals"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{student.hasAppeal ? "Review Appeal" : "Manage"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveInvoiceId(student.enrollmentId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        title="View Purchase Invoice"
                      >
                        <Receipt className="w-3 h-3 text-cyan-400" />
                        Invoice
                      </button>

                      {student.banned ? (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "unban")}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedStudentForManage(student)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                        >
                          Ban
                        </button>
                      )}

                      {student.suspended ? (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "restore")}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedStudentForManage(student)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20 transition-colors cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}

                      {!student.refunded && (
                        <button
                          onClick={() => handleStudentAction(student.enrollmentId, "refund")}
                          className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-lg border border-purple-500/20 transition-colors"
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
                  <td colSpan={7} className="text-center py-16 text-slate-500 text-xs">
                    No student enrollment records match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeInvoiceId && (
        <InvoiceModal
          enrollmentId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
        />
      )}

      {selectedStudentForManage && (
        <StudentManagementModal
          student={selectedStudentForManage}
          courseId={selectedStudentForManage.courseId}
          onClose={() => setSelectedStudentForManage(null)}
          onRefresh={fetchStudents}
        />
      )}
    </div>
  );
};

export default StudioStudentsPage;