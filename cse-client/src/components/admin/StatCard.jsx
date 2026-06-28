const StatCard = ({ icon, label, value, color = "text-indigo-600", bg = "bg-indigo-50" }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-black text-[#1B1B4B]">{value ?? "—"}</p>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
  </div>
);

export default StatCard;
