import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import UserRow from "@/components/admin/UserRow";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const fetchUsers = useCallback(async (pg, q) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/admin-api/users`, {
        params: { page: pg, search: q },
        withCredentials: true,
      });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, fetchUsers]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(1, val), 300);
  };

  const handleDeactivate = async (userId) => {
    try {
      await axios.patch(
        `${API}/admin-api/users/${userId}/deactivate`,
        {},
        { withCredentials: true }
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isDeactivated: true } : u))
      );
    } catch {
      Swal.fire({ icon: "error", title: "Action failed. Please try again.", timer: 2000, showConfirmButton: false });
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await axios.patch(
        `${API}/admin-api/users/${userId}/reactivate`,
        {},
        { withCredentials: true }
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isDeactivated: false } : u))
      );
    } catch {
      Swal.fire({ icon: "error", title: "Action failed. Please try again.", timer: 2000, showConfirmButton: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#1B1B4B]">Users</h2>
          <p className="text-sm text-slate-400 font-bold mt-1">{total} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-bold">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-bold text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">User</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Registered</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
