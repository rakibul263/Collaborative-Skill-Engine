import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router";
import {
  Users,
  Globe,
  Star,
  Target,
  ArrowRight,
  Zap,
  Sparkles,
  ChevronRight,
  Brain,
  Network,
  UserCheck,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FindPartnersHub = () => {
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".reveal-card").forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            delay: i * 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          },
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const partnerTypes = [
    {
      icon: <Star size={28} />,
      label: "Experts & Mentors",
      desc: "Connect with seasoned professionals who teach skills you want to master. Get guidance, feedback, and mentorship from domain experts.",
      path: "/experts",
      gradient: "from-[#5D5FEF] to-[#8B8DFF]",
      bg: "bg-[#F4F3FF]",
      border: "border-[#C7C4FF]",
      textColor: "text-[#5D5FEF]",
      badge: "Most Popular",
      badgeColor: "bg-[#5D5FEF]/10 text-[#5D5FEF]",
      stats: [
        { label: "Mentors", value: "500+" },
        { label: "Avg Rating", value: "4.8★" },
        { label: "Domains", value: "40+" },
      ],
      features: ["Skill-based matching", "1-on-1 sessions", "Real-time chat", "Rating system"],
    },
    {
      icon: <Target size={28} />,
      label: "Project Teams",
      desc: "Find collaborators for your side projects, hackathons, or startup ideas. Build teams with complementary skill sets.",
      path: "/teams",
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      textColor: "text-emerald-600",
      badge: "Coming Soon",
      badgeColor: "bg-emerald-100 text-emerald-700",
      stats: [
        { label: "Teams", value: "200+" },
        { label: "Projects", value: "150+" },
        { label: "Skills", value: "30+" },
      ],
      features: ["Team formation", "Project boards", "Skill gap analysis", "Progress tracking"],
    },
  ];

  const howItWorks = [
    {
      step: "01",
      icon: <Brain size={22} />,
      title: "Set Your Skills",
      desc: "Define what you teach and what you want to learn in your profile.",
      color: "text-[#5D5FEF] bg-[#F4F3FF]",
    },
    {
      step: "02",
      icon: <Zap size={22} />,
      title: "AI Matches You",
      desc: "Our engine finds partners with complementary skill sets automatically.",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      step: "03",
      icon: <UserCheck size={22} />,
      title: "Connect & Grow",
      desc: "Send connection requests, chat in real-time, and start learning.",
      color: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen pb-24 font-sans selection:bg-indigo-100">
      {/* Background orbs */}
      <div className="fixed top-0 right-[-5%] w-[500px] h-[500px] bg-indigo-200/20 blur-[140px] rounded-full pointer-events-none -z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-100/20 blur-[120px] rounded-full pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-6 pt-6 relative z-10">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#5D5FEF]/8 border border-[#5D5FEF]/15 text-[#5D5FEF] text-[10px] font-black uppercase tracking-[0.25em] mb-8">
            <Sparkles size={12} /> Your Collaboration Hub
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-[#1A1A3F] tracking-tighter leading-[0.9] mb-8">
            Find Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5D5FEF] via-[#8B8DFF] to-blue-400">
              Perfect Partner
            </span>
          </h1>

          <p className="text-slate-500 font-medium text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            Whether you're looking for a mentor, a co-founder, or a teammate —
            the Collaborative Skill Engine connects you with the right people
            at the right time.
          </p>

          {/* Quick-access pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Explore Experts", path: "/experts", icon: <Star size={14} /> },
              { label: "My Profile", path: "/profile", icon: <Users size={14} /> },
            ].map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[#1A1A3F] font-black text-[11px] uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all"
              >
                {p.icon} {p.label}
              </NavLink>
            ))}
          </div>
        </motion.div>

        {/* ── Partner Type Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          {partnerTypes.map((type, idx) => (
            <motion.div
              key={idx}
              className="reveal-card group"
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`relative h-full ${type.bg} border ${type.border} rounded-[3rem] p-8 overflow-hidden flex flex-col`}>
                {/* Glow blob */}
                <div className={`absolute top-[-20%] right-[-20%] w-40 h-40 bg-gradient-to-br ${type.gradient} opacity-10 blur-3xl rounded-full`} />

                {/* Badge */}
                <div className={`inline-flex items-center self-start px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-6 ${type.badgeColor}`}>
                  {type.badge}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${type.gradient} text-white flex items-center justify-center mb-6 shadow-lg`}>
                  {type.icon}
                </div>

                <h2 className={`text-2xl font-black ${type.textColor} mb-3`}>
                  {type.label}
                </h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 flex-1">
                  {type.desc}
                </p>

                {/* Stats row */}
                <div className="flex gap-4 mb-8">
                  {type.stats.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[#1A1A3F] font-black text-lg">{s.value}</p>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-8">
                  {type.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${type.gradient}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <NavLink
                  to={type.path}
                  className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${type.gradient} text-white rounded-2xl font-black text-[11px] uppercase tracking-widest group-hover:shadow-xl transition-all`}
                >
                  Explore {type.label.split(" ")[0]}
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </NavLink>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── How It Works ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-[#1B1B4B] rounded-[3rem] p-12 md:p-16 mb-24 relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-indigo-400/20 blur-[80px] rounded-full" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/10">
                <Network size={12} /> How It Works
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Three Steps to
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300"> Your Match</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-1/2 z-0" />
                  )}
                  <div className="relative bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/60 mb-4">
                      Step {step.step}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-5`}>
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-black text-white mb-3">{step.title}</h3>
                    <p className="text-indigo-200/60 text-sm font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <button
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#1B1B4B] rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-indigo-50 transition-all shadow-2xl"
              >
                Set Up My Profile <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Skill Match CTA Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="reveal-card"
        >
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[3rem] p-10 md:p-14 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-lg shadow-indigo-100/20">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#5D5FEF] to-blue-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 shrink-0">
                <Sparkles size={36} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#1A1A3F] mb-2">AI Skill Advisor</h3>
                <p className="text-slate-500 font-medium max-w-md">
                  Get a personalized career roadmap and skill recommendations
                  tailored to your unique profile and market demands.
                </p>
              </div>
            </div>
            <NavLink
              to="/ai-advisor"
              className="shrink-0 flex items-center gap-3 px-10 py-5 bg-[#1A1A3F] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
            >
              Try AI Advisor <ArrowRight size={16} />
            </NavLink>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FindPartnersHub;
