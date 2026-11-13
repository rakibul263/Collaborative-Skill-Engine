import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import { Bell, Send, Trash2, Info, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { LoadingSpinner, ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const typeConfig = {
  info:    { icon: <Info size={14} />,          color: "text-blue-600",   bg: "bg-blue-50"   },
  warning: { icon: <AlertTriangle size={14} />, color: "text-amber-600",  bg: "bg-amber-50"  },
  success: { icon: <CheckCircle size={14} />,   color: "text-green-600",  bg: "bg-green-50"  },
  update:  { icon: <RefreshCw size={14} />,     color: "text-indigo-600", bg: "bg-indigo-50" },
};

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notifications`);
      setNotifications(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/notifications`,
        { title: data.title, message: data.body, type: data.type },
        { withCredentials: true }
      );
      setNotifications((prev) => [res.data, ...prev]);
      reset();
      toast.success("Notification sent!");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to send notification. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    const { isConfirmed } = await showConfirm({
      variant: "delete",
      badge: "NOTIFICATION DELETE",
      title: "Delete Notification?",
      description: "This notification will be removed permanently.",
      targetLabel: "Notification Title",
      targetValue: title,
      confirmText: "Delete Notification",
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/notifications/${id}`, { withCredentials: true });
      setNotifications((prev) => prev.filter((n) => String(n._id) !== String(id)));
      toast.deleted("Notification Removed", {
        description: "Notification deleted from platform records.",
        target: title,
      });
    } catch {
      toast.error("Failed to delete notification.");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[#1B1B4B]">Notifications</h2>
        <p className="text-sm text-slate-400 font-bold mt-1">Broadcast platform announcements to all users</p>
      </div>

      {/* Compose Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest mb-5">Compose Notification</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Title</label>
              <input
                {...register("title", { required: "Title is required", maxLength: { value: 100, message: "Max 100 characters" } })}
                placeholder="Notification title..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.title && <p className="text-red-500 text-xs font-bold mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
              <select
                {...register("type", { required: "Please select a type" })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select type —</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="update">Update</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs font-bold mt-1">{errors.type.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Message</label>
            <textarea
              {...register("body", { required: "Message is required", maxLength: { value: 500, message: "Max 500 characters" } })}
              rows={3}
              placeholder="Notification message..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            {errors.body && <p className="text-red-500 text-xs font-bold mt-1">{errors.body.message}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1B1B4B] hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-sm disabled:opacity-50"
          >
            {submitting ? <ButtonSpinner size="xs" /> : <Send size={14} />}
            Send Notification
          </button>
        </form>
      </div>

      {/* Sent Notifications List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#1B1B4B] uppercase tracking-widest">Sent Notifications</h3>
          <span className="text-xs font-black text-slate-400">{notifications.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="sm" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-bold text-sm">No notifications sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.info;
              return (
                <div key={String(n._id)} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-slate-800">{n.title}</p>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(n._id, n.title)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
