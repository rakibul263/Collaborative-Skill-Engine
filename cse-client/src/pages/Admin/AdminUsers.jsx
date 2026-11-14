import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  X,
  Shield,
  UserPlus,
  Crown,
  Star,
} from "lucide-react";
import UserRow from "@/components/admin/UserRow";
import { LoadingSpinner, AdminPageLoader } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";
import { useAdmin } from "@/context/AdminContext/AdminContext";

const AdminUsers = () => {
  const { adminUser } = useAdmin();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [inspectUser, setInspectUser] = useState(null);

  // Create Admin Modal State
  const [createAdminModalOpen, setCreateAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", password: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const debounceRef = useRef(null);

  const fetchUsers = useCallback(
    async (pg = 1, q = search, role = roleFilter, status = statusFilter) => {
      setLoading(true);
      try {
        const res = await adminApiClient.get("/users", {
          params: {
            page: pg,
            limit: 15,
            search: q || undefined,
            role: role || undefined,
            status: status || undefined,
          },
        });
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } catch {
        toast.error("Failed to fetch user directory.");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [search, roleFilter, statusFilter]
  );

  useEffect(() => {
    fetchUsers(page, search, roleFilter, statusFilter);
  }, [page, roleFilter, statusFilter, fetchUsers]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(1, val, roleFilter, statusFilter);
    }, 300);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApiClient.patch(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      toast.confirmed(`Role updated to ${newRole}`, {
        description: "Access permissions have been synchronized immediately.",
        badge: "ROLE UPDATED",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update role.");
    }
  };

  const handleDeactivate = async (userId) => {
    const { isConfirmed } = await showConfirm({
      variant: "warning",
      badge: "ACCESS SUSPENSION",
      title: "Suspend User Access?",
      description:
        "This user will be blocked from signing in or interacting with platform services until restored.",
      confirmText: "Suspend User",
    });
    if (!isConfirmed) return;

    try {
      await adminApiClient.patch(`/users/${userId}/deactivate`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isDeactivated: true } : u))
      );
      toast.warning("User access suspended.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to deactivate user.");
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await adminApiClient.patch(`/users/${userId}/reactivate`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isDeactivated: false } : u))
      );
      toast.confirmed("User Access Restored", {
        description: "Account standing returned to active status.",
        badge: "RESTORED",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reactivate user.");
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (adminUser?.email && userEmail?.toLowerCase() === adminUser.email.toLowerCase()) {
      toast.error("Security Restriction: You cannot delete your own administrative account.");
      return;
    }

    const { isConfirmed } = await showConfirm({
      variant: "delete",
      badge: "PERMANENT PURGE",
      title: "Delete User Account?",
      description:
        "All associated courses, learning sessions, connections, and audit telemetry for this user will be permanently deleted.",
      targetLabel: "Target Account",
      targetValue: userEmail,
      notice: "This action is irreversible and immediately terminates user access.",
      confirmText: "Delete Permanently",
    });

    if (!isConfirmed) return;

    try {
      await adminApiClient.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.deleted("User Account Purged", {
        description: "Account and all linked records were permanently deleted.",
        target: userEmail,
        badge: "USER DELETED",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminForm.fullName.trim() || !adminForm.email.trim()) {
      toast.error("Please enter the administrator's name and email.");
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await adminApiClient.post("/admins", {
        fullName: adminForm.fullName.trim(),
        email: adminForm.email.trim().toLowerCase(),
        password: adminForm.password ? adminForm.password.trim() : "admin123",
      });

      toast.success(res.data.message || "Administrator account created successfully.");
      setCreateAdminModalOpen(false);
      setAdminForm({ fullName: "", email: "", password: "" });
      fetchUsers(1, search, roleFilter, statusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create administrator account.");
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (initialLoading) {
    return (
      <AdminPageLoader
        label="Querying User Directory & Role Registry..."
        subtext="Loading user accounts, telemetry, and platform permissions"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="text-slate-400 w-5 h-5" />
            User Directory & Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage student-instructor permissions, administrator privileges, and account security
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setCreateAdminModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <UserPlus size={14} />
            Create Admin
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-[#0E1322] border border-slate-800 text-slate-300 font-mono text-xs font-medium">
            {total} Total Users
          </span>

          <button
            onClick={() => fetchUsers(page, search, roleFilter, statusFilter)}
            className="p-2 bg-[#0E1322] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors"
            title="Refresh directory"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search users by name or email address..."
            className="w-full pl-9 pr-8 py-2 bg-[#0E1322] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                fetchUsers(1, "", roleFilter, statusFilter);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div className="sm:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-[#0E1322] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
          >
            <option value="">All Roles</option>
            <option value="user">Students (User)</option>
            <option value="Instructor">Instructors</option>
            <option value="Admin">Administrators</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-[#0E1322] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="deactivated">Suspended / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <LoadingSpinner size="md" label="Querying Security Directory..." />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-xs">
            <Users size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-300 uppercase tracking-wider font-semibold">
              No User Records Found
            </p>
            <p className="text-slate-500 text-xs mt-1">Try refining search parameters or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#0A0E1A]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Identity
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Role & Privileges
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Telemetry
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    currentUserEmail={adminUser?.email}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                    onChangeRole={handleRoleChange}
                    onDeleteUser={handleDeleteUser}
                    onViewDetails={(u) => setInspectUser(u)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#0A0E1A] flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Page <span className="text-slate-100 font-semibold">{page}</span> of {totalPages} &bull;{" "}
              {total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-[#0E1322] border border-slate-800 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-[#0E1322] border border-slate-800 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: CREATE ADMINISTRATOR MODAL ── */}
      {createAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1322] border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0A0E1A]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create Administrator</h3>
                  <p className="text-xs text-slate-400">
                    Assign governance privileges to a new team member
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateAdminModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrator Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.admin@collaborative.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Initial Password / Keyphrase
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to default to admin123"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 font-mono transition-colors"
                />
              </div>

              {/* Policy Note Banner */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <Crown size={13} className="inline mr-1.5 text-amber-400" />
                <b>Security Architecture:</b> Only one primary Super Administrator exists. New accounts are provisioned strictly with the <b>Admin</b> role.
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingAdmin && <LoadingSpinner size="sm" />}
                  Provision Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: USER PROFILE INSPECTION MODAL ── */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1322] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setInspectUser(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-slate-200 uppercase">
                {inspectUser.fullName ? inspectUser.fullName.charAt(0) : inspectUser.email.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{inspectUser.fullName || "User Profile"}</h3>
                <p className="text-xs font-mono text-slate-400">{inspectUser.email}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#080B11] rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Role</span>
                  <p className="text-slate-200 font-semibold capitalize mt-0.5">{inspectUser.role || "user"}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Status</span>
                  <p className={`font-semibold mt-0.5 ${inspectUser.isDeactivated ? "text-rose-400" : "text-emerald-400"}`}>
                    {inspectUser.isDeactivated ? "Suspended" : "Active"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Average Rating</span>
                  <p className="text-amber-300 font-semibold mt-0.5 flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {inspectUser.averageRating ? inspectUser.averageRating.toFixed(1) : "0.0"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Total Sessions</span>
                  <p className="text-slate-200 font-semibold mt-0.5">{inspectUser.sessionCount || 0}</p>
                </div>
              </div>

              {inspectUser.bio && (
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Bio / Profile Summary</p>
                  <p className="p-3 bg-[#080B11] rounded-lg border border-slate-800 text-slate-300 text-xs leading-relaxed">
                    {inspectUser.bio}
                  </p>
                </div>
              )}

              {inspectUser.skills && inspectUser.skills.length > 0 && (
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold mb-1.5">Skills & Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectUser.skills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Last Login IP:</span>
                  <span className="text-slate-200 font-mono">{inspectUser.lastLoginIp || "Not recorded"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Device:</span>
                  <span className="text-slate-200">{inspectUser.lastLoginDevice || "Web Browser"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Active:</span>
                  <span className="text-slate-200">
                    {inspectUser.lastLogin ? new Date(inspectUser.lastLogin).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Account Created:</span>
                  <span className="text-slate-200">
                    {inspectUser.createdAt ? new Date(inspectUser.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Link
                to={`/admin/logins?search=${encodeURIComponent(inspectUser.email)}`}
                onClick={() => setInspectUser(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium text-xs rounded-lg transition-colors"
              >
                View Login Logs
              </Link>
              <button
                onClick={() => setInspectUser(null)}
                className="px-5 py-2 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white font-medium text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
