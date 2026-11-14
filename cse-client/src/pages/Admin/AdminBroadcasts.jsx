import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/components/ui/toast-system";
import { showConfirm } from "@/components/ui/confirm-dialog";
import {
  Radio,
  Send,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wrench,
  Eye,
} from "lucide-react";
import { ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";

const typeStyles = {
  info: {
    icon: Info,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/25",
    label: "Information",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
    label: "Warning",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    label: "System Event",
  },
  update: {
    icon: RefreshCw,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/25",
    label: "Feature Update",
  },
  maintenance: {
    icon: Wrench,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/25",
    label: "Maintenance",
  },
};

const AdminBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: "info",
      audience: "all",
      priority: "normal",
      title: "",
      message: "",
    },
  });

  const watchValues = watch();

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await adminApiClient.get("/broadcasts");
      setBroadcasts(res.data.broadcasts || []);
    } catch {
      toast.error("Failed to load broadcast history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const onSubmit = async (data) => {
    setSending(true);
    try {
      const res = await adminApiClient.post("/broadcast", {
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type,
        audience: data.audience,
        priority: data.priority,
      });

      toast.confirmed("Broadcast Dispatched", {
        description: `Announcement pushed live to ${res.data.recipientCount || "active"} platform users.`,
        target: data.title.trim(),
        badge: "DISPATCHED",
      });
      reset();
      fetchBroadcasts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to dispatch broadcast.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id, title) => {
    const { isConfirmed } = await showConfirm({
      variant: "delete",
      badge: "BROADCAST REMOVAL",
      title: "Delete Broadcast Record?",
      description:
        "This announcement will be permanently removed from broadcast history and user notifications.",
      targetLabel: "Headline",
      targetValue: title,
      confirmText: "Delete Broadcast",
    });
    if (!isConfirmed) return;

    try {
      await adminApiClient.delete(`/broadcasts/${id}`);
      setBroadcasts((prev) => prev.filter((b) => b._id !== id));
      toast.deleted("Broadcast Record Removed", {
        description: "Announcement removed from broadcast history.",
        target: title,
      });
    } catch {
      toast.error("Failed to delete broadcast record.");
    }
  };

  const currentTypeConfig = typeStyles[watchValues.type] || typeStyles.info;
  const CurrentIcon = currentTypeConfig.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Radio className="text-slate-400 w-5 h-5" />
          Global Broadcast & System Announcements
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Publish real-time announcements, maintenance notices, and platform alerts to targeted user groups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-[#0E1322] rounded-xl border border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800/80 mb-5">
            <h2 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Compose Announcement
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Headline <span className="text-rose-400">*</span>
              </label>
              <input
                {...register("title", {
                  required: "Headline is required",
                  maxLength: { value: 120, message: "Maximum 120 characters" },
                })}
                placeholder="e.g. Platform update: Live coding workspace improvements"
                className="w-full px-3.5 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
              />
              {errors.title && (
                <p className="text-rose-400 text-xs mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Target Audience, Type & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Audience
                </label>
                <select
                  {...register("audience")}
                  className="w-full px-3 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
                >
                  <option value="all">Everyone (All Users)</option>
                  <option value="instructors">Instructors Only</option>
                  <option value="students">Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notice Type
                </label>
                <select
                  {...register("type")}
                  className="w-full px-3 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="success">Milestone</option>
                  <option value="update">Feature Update</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Priority
                </label>
                <select
                  {...register("priority")}
                  className="w-full px-3 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600 transition-colors"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Message Body <span className="text-rose-400">*</span>
              </label>
              <textarea
                {...register("message", {
                  required: "Message content is required",
                  maxLength: { value: 600, message: "Maximum 600 characters" },
                })}
                rows={4}
                placeholder="Provide complete details about the platform notice or update..."
                className="w-full px-3.5 py-2 bg-[#080B11] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 resize-none transition-colors"
              />
              {errors.message && (
                <p className="text-rose-400 text-xs mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-slate-100 hover:bg-white text-slate-900 font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <ButtonSpinner size="xs" />
              ) : (
                <>
                  <Send size={14} />
                  Transmit Broadcast
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-[#0E1322] rounded-xl border border-slate-800/80 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800/80 mb-4">
            <Eye size={15} className="text-slate-400" />
            <h2 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Recipient Preview
            </h2>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Real-time preview of how this card will render inside learner and instructor notification drawers:
          </p>

          <div className="flex-1 flex flex-col justify-center">
            <div
              className={`p-5 rounded-xl border ${currentTypeConfig.bg} bg-[#080B11] shadow-sm space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CurrentIcon size={15} className={currentTypeConfig.color} />
                  <span
                    className={`text-[11px] uppercase font-semibold px-2 py-0.5 rounded-md ${currentTypeConfig.bg} ${currentTypeConfig.color}`}
                  >
                    {currentTypeConfig.label}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 capitalize">
                  To: {watchValues.audience}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {watchValues.title || "Announcement headline preview..."}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {watchValues.message ||
                    "Message payload will appear here as you type in the editor."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="capitalize">Priority: {watchValues.priority}</span>
                <span>Just Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-[#0E1322] rounded-xl border border-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-[#0A0E1A] flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            Broadcast Archive
          </h3>
          <span className="text-xs text-slate-400 font-mono">{broadcasts.length} Sent</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <p className="text-xs text-slate-500">Loading broadcast history...</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs">
            No system broadcasts logged in the archive
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 text-xs">
            {broadcasts.map((b) => {
              const cfg = typeStyles[b.type] || typeStyles.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={b._id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg ${cfg.bg} border flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-100 text-sm">{b.title}</span>
                        <span
                          className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${cfg.bg} ${cfg.color}`}
                        >
                          {b.type}
                        </span>
                        <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Audience: {b.audience}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{b.message}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dispatched: {b.createdAt ? new Date(b.createdAt).toLocaleString() : "Recent"}{" "}
                        &bull; By {b.adminEmail || "Admin"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b._id, b.title)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors self-end sm:self-center"
                    title="Delete Broadcast Record"
                  >
                    <Trash2 size={15} />
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

export default AdminBroadcasts;
