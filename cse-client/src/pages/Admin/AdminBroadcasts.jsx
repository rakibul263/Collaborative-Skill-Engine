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
  Users,
  Eye,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { LoadingSpinner, ButtonSpinner } from "@/components/shared/loading/LoadingSpinner";
import adminApiClient from "@/lib/adminApiClient";

const typeStyles = {
  info: {
    icon: Info,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/30",
    label: "Information",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    label: "Warning",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    label: "System Event",
  },
  update: {
    icon: RefreshCw,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/30",
    label: "Feature Update",
  },
  maintenance: {
    icon: Wrench,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
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
        "This system announcement will be permanently deleted from broadcast history and active feeds.",
      targetLabel: "Announcement Headline",
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Global Broadcast & System Alerts
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Publish real-time announcements, maintenance notices, and system alerts to targeted user groups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 p-6 shadow-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800/80 mb-5">
            <Radio size={16} className="text-cyan-400" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
              Dispatch New Announcement
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                Announcement Headline
              </label>
              <input
                {...register("title", {
                  required: "Headline is required",
                  maxLength: { value: 120, message: "Maximum 120 characters" },
                })}
                placeholder="e.g. Scheduled Platform Maintenance at 02:00 AM UTC"
                className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.title && (
                <p className="text-rose-400 text-xs font-mono mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Target Audience & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                  Target Audience
                </label>
                <select
                  {...register("audience")}
                  className="w-full px-3 py-2 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Everyone (All Users)</option>
                  <option value="instructors">Instructors Only</option>
                  <option value="students">Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                  Notice Type
                </label>
                <select
                  {...register("type")}
                  className="w-full px-3 py-2 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="success">System Milestone</option>
                  <option value="update">Feature Update</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                  Priority
                </label>
                <select
                  {...register("priority")}
                  className="w-full px-3 py-2 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Interrupt</option>
                </select>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 font-bold">
                Detailed Message Payload
              </label>
              <textarea
                {...register("message", {
                  required: "Message content is required",
                  maxLength: { value: 600, message: "Maximum 600 characters" },
                })}
                rows={4}
                placeholder="Provide complete details about the platform notice, update, or action requested from the user..."
                className="w-full px-4 py-2.5 bg-[#070b16] border border-slate-800 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-sans resize-none"
              />
              {errors.message && (
                <p className="text-rose-400 text-xs font-mono mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <ButtonSpinner size="xs" />
              ) : (
                <>
                  <Send size={14} />
                  Transmit System Broadcast
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 p-6 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800/80 mb-5">
            <Eye size={16} className="text-cyan-400" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
              User Notification Preview
            </h2>
          </div>

          <p className="text-xs font-mono text-slate-400 mb-4">
            Live preview of this announcement card as displayed to active participants:
          </p>

          <div className="flex-1 flex flex-col justify-center">
            <div
              className={`p-5 rounded-2xl border ${currentTypeConfig.bg} bg-[#070b16]/90 shadow-lg space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CurrentIcon size={16} className={currentTypeConfig.color} />
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${currentTypeConfig.bg} ${currentTypeConfig.color}`}
                  >
                    {currentTypeConfig.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Target: {watchValues.audience}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white">
                  {watchValues.title || "Headline placeholder..."}
                </h4>
                <p className="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
                  {watchValues.message ||
                    "Message body preview will appear here in real time as you compose the announcement."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Priority: {watchValues.priority}</span>
                <span>Just Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-[#0b101f]/90 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#070b16]/70 flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
            Recent Broadcast Transmission History
          </h3>
          <span className="text-xs font-mono text-cyan-400">{broadcasts.length} Dispatched</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" label="Loading broadcast archive..." />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs">
            No system broadcasts logged in the archive
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {broadcasts.map((b) => {
              const cfg = typeStyles[b.type] || typeStyles.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={b._id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${cfg.bg} border flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-slate-100 text-sm">{b.title}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${cfg.bg} ${cfg.color}`}
                        >
                          {b.type}
                        </span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Audience: {b.audience}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans line-clamp-2">{b.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dispatched: {b.createdAt ? new Date(b.createdAt).toLocaleString() : "Recent"}{" "}
                        &bull; By {b.adminEmail || "Admin"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b._id, b.title)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all self-end sm:self-center"
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

