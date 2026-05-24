import React, { useState } from "react";
import { NavLink } from "react-router";
import {
  Github,
  Twitter,
  Linkedin,
  ArrowRight,
  Globe,
  Shield,
  Sparkles,
  Check,
  Activity,
  Heart,
} from "lucide-react";
import logoImg from "../../../assets/images/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail("");
    }, 4000);
  };

  const footerNavigation = [
    {
      title: "Platform",
      links: [
        { label: "Find Partners", path: "/find-partners" },
        { label: "Experts Directory", path: "/experts" },
        { label: "AI Advisor 2.0", path: "/ai-advisor" },
        { label: "Courses Marketplace", path: "/courses" },
        { label: "Creator Studio", path: "/studio" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Global Squads", path: "/teams" },
        { label: "Skill Requests", path: "/requests" },
        { label: "Messages Hub", path: "/message" },
      ],
    },
    {
      title: "Company & Trust",
      links: [
        { label: "About Platform", path: "/" },
        { label: "Verified Credentials", path: "/experts" },
        { label: "Security Protocol", path: "/register" },
        { label: "System Status", path: "/" },
      ],
    },
  ];

  return (
    <footer className="relative mt-20 pt-16 pb-12 bg-slate-950 border-t border-slate-800/80 text-slate-400 font-sans select-none overflow-hidden">
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800/70">
          {/* Brand & Newsletter Column */}
          <div className="lg:col-span-2 space-y-6">
            <NavLink
              to="/"
              className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 blur-md rounded-xl opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="relative z-10 w-full h-full p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center">
                  <img
                    src={logoImg}
                    alt="CSE Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-white leading-none">
                  Skill<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Engine</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mt-0.5">
                  Collaborative
                </span>
              </div>
            </NavLink>

            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
              The AI-powered skill sharing platform connecting developers, designers, and creators worldwide for 1-on-1 growth.
            </p>

            {/* Newsletter Input */}
            <form onSubmit={handleSubscribe} className="space-y-2 max-w-sm">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Stay updated with platform features
              </span>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email..."
                  required
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-xs"
                >
                  {subscribed ? <Check size={14} className="text-emerald-400" /> : <ArrowRight size={14} />}
                </button>
              </div>
              {subscribed && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Thank you for subscribing!
                </span>
              )}
            </form>
          </div>

          {/* Navigation Links Columns */}
          {footerNavigation.map((group) => (
            <div key={group.title} className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {group.title}
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <NavLink
                      to={link.path}
                      className="text-slate-400 hover:text-indigo-400 transition-colors duration-200 inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-indigo-400 group-hover:scale-125 transition-all" />
                      <span>{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar & Operational Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Shield size={12} className="text-indigo-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>

          {/* Social Icon Links */}
          <div className="flex items-center gap-2">
            {[
              { icon: <Twitter size={15} />, href: "https://twitter.com", label: "Twitter" },
              { icon: <Github size={15} />, href: "https://github.com", label: "GitHub" },
              { icon: <Linkedin size={15} />, href: "https://linkedin.com", label: "LinkedIn" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 flex items-center justify-center transition-all duration-200 hover:border-indigo-500/40"
              >
                {s.icon}
              </a>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-medium text-center sm:text-right">
            © {currentYear} Collaborative Skill Engine. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
