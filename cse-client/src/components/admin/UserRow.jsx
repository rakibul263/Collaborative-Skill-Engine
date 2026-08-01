import { Star, UserCheck, UserX } from "lucide-react";

const UserRow = ({ user, onDeactivate, onReactivate }) => {
  const regDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—";

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-800">{user.fullName || "Unknown"}</p>
          <p className="text-xs text-slate-400 font-bold">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-slate-500">{regDate}</td>
      <td className="px-4 py-3">
        {user.isDeactivated ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black">
            Deactivated
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black">
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-black text-slate-700">{user.averageRating?.toFixed(1) || "0.0"}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs font-black text-slate-700">{user.sessionCount || 0}</td>
      <td className="px-4 py-3">
        {user.isDeactivated ? (
          <button
            onClick={() => onReactivate(user._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-black transition-all"
          >
            <UserCheck size={13} />
            Reactivate
          </button>
        ) : (
          <button
            onClick={() => onDeactivate(user._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-black transition-all"
          >
            <UserX size={13} />
            Deactivate
          </button>
        )}
      </td>
    </tr>
  );
};

export default UserRow;
