import { useState } from "react";
import { Star, UserCheck, UserX, Trash2, Shield, Eye, Award, Lock, Crown } from "lucide-react";

const UserRow = ({
  user,
  currentUserEmail,
  onDeactivate,
  onReactivate,
  onChangeRole,
  onDeleteUser,
  onViewDetails,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const regDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—";

  const isSelf =
    Boolean(currentUserEmail) &&
    (user.email || "").toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

  const isSuperAdmin =
    user.role === "SuperAdmin" ||
    user.isMasterAdmin === true ||
    (user.email || "").toLowerCase().trim() === "collaborativeskillengine@gmail.com";

  const getRoleBadge = (role) => {
    if (isSuperAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold">
          <Crown size={11} className="text-amber-400" />
          SuperAdmin
        </span>
      );
    }

    switch (role?.toLowerCase()) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-semibold">
            <Shield size={10} className="text-purple-400" />
            Admin
          </span>
        );
      case "instructor":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold">
            <Award size={10} className="text-cyan-400" />
            Instructor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-mono font-medium">
            Student
          </span>
        );
    }
  };

  return (
    <tr
      className={`border-b border-slate-800/60 transition-colors ${
        isSelf ? "bg-cyan-950/10 hover:bg-cyan-950/20" : "hover:bg-slate-800/30"
      }`}
    >
      {/* Identity */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs uppercase shrink-0 border ${
              isSuperAdmin
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : isSelf
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            {user.fullName ? user.fullName.charAt(0) : user.email?.charAt(0) || "U"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.fullName || "User"}</p>
              {isSelf && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 border border-cyan-700/70 text-cyan-300 uppercase">
                  You
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3 whitespace-nowrap">
        {isSuperAdmin || isSelf ? (
          <div className="inline-block" title={isSuperAdmin ? "SuperAdmin role is immutable" : "Cannot alter your own role"}>
            {getRoleBadge(user.role)}
          </div>
        ) : (
          <div className="relative inline-block">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              title="Click to modify role"
            >
              {getRoleBadge(user.role)}
              <span className="text-[9px] text-slate-400 font-mono">▾</span>
            </button>

            {showRoleMenu && (
              <div className="absolute left-0 mt-1 w-36 bg-[#0D121F] border border-slate-700/90 rounded-xl shadow-xl z-30 py-1 text-xs font-medium">
                <button
                  onClick={() => {
                    onChangeRole(user._id, "user");
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white"
                >
                  Set as Student
                </button>
                <button
                  onClick={() => {
                    onChangeRole(user._id, "Instructor");
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200"
                >
                  Set as Instructor
                </button>
                <button
                  onClick={() => {
                    onChangeRole(user._id, "Admin");
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-purple-300 hover:text-purple-200 font-semibold"
                >
                  Set as Admin
                </button>
              </div>
            )}
          </div>
        )}
      </td>

      {/* Registered Date */}
      <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{regDate}</td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        {user.isDeactivated ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Deactivated
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        )}
      </td>

      {/* Rating & Sessions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono text-amber-300">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>{user.averageRating ? user.averageRating.toFixed(1) : "0.0"}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {user.sessionCount || 0} sessions
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {/* View Details */}
          <button
            onClick={() => onViewDetails(user)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Inspect User Details"
          >
            <Eye size={14} />
          </button>

          {/* Deactivate/Reactivate */}
          {isSuperAdmin || isSelf ? (
            <span
              className="p-1.5 text-slate-600 cursor-not-allowed"
              title={isSelf ? "Cannot suspend own account" : "SuperAdmin cannot be suspended"}
            >
              <Lock size={13} />
            </span>
          ) : user.isDeactivated ? (
            <button
              onClick={() => onReactivate(user._id)}
              className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-md text-[11px] font-medium transition-colors"
              title="Reactivate Account"
            >
              Reactivate
            </button>
          ) : (
            <button
              onClick={() => onDeactivate(user._id)}
              className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-md text-[11px] font-medium transition-colors"
              title="Suspend User Access"
            >
              Suspend
            </button>
          )}

          {/* Delete User */}
          {isSelf ? (
            <span
              className="p-1.5 text-slate-600 cursor-not-allowed"
              title="Cannot delete your own administrative account"
            >
              <Trash2 size={13} className="opacity-25" />
            </span>
          ) : isSuperAdmin ? (
            <span
              className="p-1.5 text-slate-600 cursor-not-allowed"
              title="The Super Administrator account is immutable"
            >
              <Trash2 size={13} className="opacity-25" />
            </span>
          ) : (
            <button
              onClick={() => onDeleteUser(user._id, user.email)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Delete User Permanently"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
