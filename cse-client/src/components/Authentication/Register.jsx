"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  User,
  Mail,
  Lock,
  Upload,
  ArrowRight,
  Sparkles,
  Plus,
  GraduationCap,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  BookOpen,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router";
import Swal from "sweetalert2";
import axios from "axios";
import { updateProfile } from "firebase/auth";
import LoginButton from "../shared/LoginButton/LoginButton";
import useAuth from "@/hooks/useAuth";
import LogoImg from "@/assets/images/logo.png";

const INITIAL_SKILLS = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express.js",
  "MongoDB",
  "MySQL",
  "Python",
  "Django",
  "Figma",
  "Canva",
  "UI Design",
  "UX Design",
  "Graphic Design",
  "Video Editing",
  "Digital Marketing",
  "SEO",
  "AI",
  "Machine Learning",
].sort();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);
const MAX_CV_SIZE = 5_242_880;

/**
 * Validates a CV file for upload.
 * @param {File} file
 * @returns {string|null} null if valid, error string if invalid
 */
const validateCvFile = (file) => {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk && !extOk) {
    return "Only PDF, DOCX, and TXT files are accepted.";
  }

  if (file.size > MAX_CV_SIZE) {
    return "File exceeds the 5 MB size limit.";
  }

  return null;
};

/**
 * Normalises a skill string for case-insensitive deduplication.
 * @param {string} s
 * @returns {string}
 */
const normaliseSkill = (s) =>
  s.toLowerCase().replace(/\.js/g, "").replace(/\s+/g, "").replace(/[^a-z]/g, "");

/**
 * Merges AI-detected skills into the current skill selection state.
 *
 * Matching priority for each skill in aiSkills:
 *  1. Exact case-insensitive match against INITIAL_SKILLS → select existing canonical entry
 *  2. Normalised match against INITIAL_SKILLS → select existing canonical entry
 *  3. Case-insensitive match against currentCustom → skip (already exists)
 *  4. None of the above → create new custom skill and select it
 *
 * @param {"teach"|"learn"} _type - The skill type
 * @param {string[]} currentSelected - Currently selected skills
 * @param {string[]} currentCustom - Currently defined custom skills
 * @param {string[]} aiSkills - Skill names returned by AI
 * @returns {{ newSelected: string[], newCustom: string[] }}
 */
const mergeAiSkills = (_type, currentSelected, currentCustom, aiSkills) => {
  const newSelected = [...currentSelected];
  const newCustom = [...currentCustom];

  const initialSkillsLower = INITIAL_SKILLS.map((s) => s.toLowerCase());
  const initialSkillsNormalised = INITIAL_SKILLS.map((s) => normaliseSkill(s));
  const currentCustomLower = currentCustom.map((s) => s.toLowerCase());

  for (const aiSkill of aiSkills) {
    const aiSkillLower = aiSkill.toLowerCase();
    const aiSkillNormalised = normaliseSkill(aiSkill);

    // Step 1: Exact case-insensitive match against INITIAL_SKILLS
    const exactIdx = initialSkillsLower.indexOf(aiSkillLower);
    if (exactIdx !== -1) {
      const canonical = INITIAL_SKILLS[exactIdx];
      if (!newSelected.includes(canonical)) {
        newSelected.push(canonical);
      }
      continue;
    }

    // Step 2: Normalised match against INITIAL_SKILLS
    const normIdx = initialSkillsNormalised.indexOf(aiSkillNormalised);
    if (normIdx !== -1) {
      const canonical = INITIAL_SKILLS[normIdx];
      if (!newSelected.includes(canonical)) {
        newSelected.push(canonical);
      }
      continue;
    }

    // Step 3: Case-insensitive match against currentCustom → skip
    if (currentCustomLower.includes(aiSkillLower)) {
      const existingCustom = currentCustom[currentCustomLower.indexOf(aiSkillLower)];
      if (!newSelected.includes(existingCustom)) {
        newSelected.push(existingCustom);
      }
      continue;
    }

    // Step 4: New custom skill
    const newCustomLower = newCustom.map((s) => s.toLowerCase());
    if (!newCustomLower.includes(aiSkillLower)) {
      newCustom.push(aiSkill);
    }
    const addedCustomIdx = newCustom.map((s) => s.toLowerCase()).indexOf(aiSkillLower);
    const addedCustom = newCustom[addedCustomIdx];
    if (!newSelected.includes(addedCustom)) {
      newSelected.push(addedCustom);
    }
  }

  return { newSelected, newCustom };
};

const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const TARGET_IMAGE_MAX_DIMENSION = 1280;
const TARGET_IMAGE_QUALITY = 0.8;

const compressImageFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const { width, height } = image;
      const scale = Math.min(
        1,
        TARGET_IMAGE_MAX_DIMENSION / Math.max(width, height)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image processing failed"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          resolve(
            new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
        },
        "image/jpeg",
        TARGET_IMAGE_QUALITY
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    image.src = objectUrl;
  });

const getFirebaseAuthMessage = (error) => {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use")
    return "This email is already registered.";
  if (code === "auth/invalid-email")
    return "Please provide a valid email address.";
  if (code === "auth/weak-password") return "Password is too weak.";
  return error?.message || "Registration failed.";
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createUser, signInWithGoogle } = useAuth();

  const [step, setStep] = useState(1);
  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  const [googleUid, setGoogleUid] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState({
    teach: false,
    learn: false,
  });
  const [otherSkill, setOtherSkill] = useState({ teach: "", learn: "" });
  const [searchQuery, setSearchQuery] = useState({ teach: "", learn: "" });
  const [customSkills, setCustomSkills] = useState({ teach: [], learn: [] });
  const [cvText, setCvText] = useState("");
  const [isCvParsing, setIsCvParsing] = useState(false);
  const [isLearnSuggesting, setIsLearnSuggesting] = useState(false);
  const [cvError, setCvError] = useState("");
  const [learnError, setLearnError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    teachSkills: [],
    learnSkills: [],
    teachLevel: "Intermediate",
    learnLevel: "Beginner",
    education: "",
    profileImage: "",
    termsAccepted: false,
  });

  // If redirected from Login with Google data, pre-fill and jump to step 2
  useEffect(() => {
    const state = location.state;
    if (state?.fromGoogle && state?.googleUser) {
      const { fullName, email, profileImage, uid } = state.googleUser;
      setFormData((prev) => ({
        ...prev,
        fullName: fullName || "",
        email: email || "",
        password: "GOOGLE_AUTH_NO_PASSWORD",
        profileImage: profileImage || "",
      }));
      setIsGoogleFlow(true);
      setGoogleUid(uid);
      setStep(2);
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setIsUploading(true);
    try {
      const compressedFile = await compressImageFile(file);
      const data = new FormData();
      data.append("file", compressedFile);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        data
      );
      setFormData((prev) => ({ ...prev, profileImage: res.data.secure_url }));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Could not upload profile picture. Please try again.",
        background: "#0f172a",
        color: "#f8fafc",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSkill = (type, skill) => {
    const key = type === "teach" ? "teachSkills" : "learnSkills";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(skill)
        ? prev[key].filter((s) => s !== skill)
        : [...prev[key], skill],
    }));
  };

  const addOtherSkill = (type) => {
    const val = otherSkill[type].trim();
    if (
      val &&
      !INITIAL_SKILLS.includes(val) &&
      !customSkills[type].includes(val)
    ) {
      setCustomSkills((prev) => ({ ...prev, [type]: [val, ...prev[type]] }));
      toggleSkill(type, val);
      setOtherSkill((prev) => ({ ...prev, [type]: "" }));
      setShowOtherInput((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleCvUpload = async (e) => {
    setCvError("");
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateCvFile(file);
    if (validationError) {
      setCvError(validationError);
      e.target.value = "";
      return;
    }

    setIsCvParsing(true);
    const data = new FormData();
    data.append("cv", file);
    data.append("suggestLearn", "false");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/parse-cv`,
        data,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const { teachSkills: detected = [], cvText: extractedText = "" } = res.data;

      const { newSelected, newCustom } = mergeAiSkills(
        "teach",
        formData.teachSkills,
        customSkills.teach,
        detected
      );

      setFormData((prev) => ({ ...prev, teachSkills: newSelected }));
      setCustomSkills((prev) => ({ ...prev, teach: newCustom }));
      setCvText(extractedText);

      if (detected.length === 0) {
        setCvError("No skills were detected in your CV.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "CanceledError" || err.name === "AbortError" || err.code === "ERR_CANCELED") {
        setCvError("CV upload timed out. Please try again.");
      } else if (err.response) {
        setCvError(err.response.data?.message || "CV parsing failed. Please try again.");
      } else {
        setCvError("CV upload failed due to a network error. Please check your connection.");
      }
    } finally {
      setIsCvParsing(false);
    }
  };

  const handleSuggestLearn = async () => {
    setLearnError("");
    if (!cvText) {
      setLearnError("Please upload your CV first to use AI suggestions.");
      return;
    }

    setIsLearnSuggesting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/parse-cv/suggest-learn`,
        { cvText, teachSkills: formData.teachSkills },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const { suggestedLearnSkills: suggested = [] } = res.data;

      if (suggested.length === 0) {
        setLearnError("No learning suggestions could be generated from your CV.");
      } else {
        const { newSelected, newCustom } = mergeAiSkills(
          "learn",
          formData.learnSkills,
          customSkills.learn,
          suggested
        );
        setFormData((prev) => ({ ...prev, learnSkills: newSelected }));
        setCustomSkills((prev) => ({ ...prev, learn: newCustom }));
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "CanceledError" || err.name === "AbortError" || err.code === "ERR_CANCELED") {
        setLearnError("Suggestion request timed out. Please try again.");
      } else if (err.response) {
        setLearnError(err.response.data?.message || "Could not generate suggestions. Please try again.");
      } else {
        setLearnError("Suggestion failed due to a network error. Please check your connection.");
      }
    } finally {
      setIsLearnSuggesting(false);
    }
  };

  const isStepValid = (checkStep = step) => {
    if (checkStep === 1)
      return (
        formData.fullName.trim() !== "" &&
        formData.email.includes("@") &&
        (isGoogleFlow || formData.password.length >= 6)
      );
    if (checkStep === 2)
      return formData.teachSkills.length > 0 && formData.learnSkills.length > 0;
    if (checkStep === 3) return formData.termsAccepted && !isUploading;
    return false;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (step < 3) {
      if (isStepValid()) {
        setStep(step + 1);
      }
      return;
    }

    if (isSubmitting || !isStepValid(3)) return;

    setIsSubmitting(true);
    try {
      let uid = googleUid;

      if (!isGoogleFlow) {
        const userCredential = await createUser(formData.email, formData.password);
        const firebaseUser = userCredential.user;
        uid = firebaseUser.uid;

        await updateProfile(firebaseUser, {
          displayName: formData.fullName,
          photoURL: formData.profileImage || null,
        });
      }

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        teachSkills: formData.teachSkills,
        learnSkills: formData.learnSkills,
        teachLevel: formData.teachLevel,
        learnLevel: formData.learnLevel,
        education: formData.education,
        profileImage: formData.profileImage,
        uid: uid,
        role: "user",
        createdAt: new Date(),
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/users`, payload);

      Swal.fire({
        icon: "success",
        title: "Profile Built!",
        text: `Welcome ${formData.fullName}! Your Skill Engine profile is live.`,
        confirmButtonColor: "#6366f1",
        background: "#0f172a",
        color: "#f8fafc",
      });
      navigate("/");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: getFirebaseAuthMessage(error),
        confirmButtonColor: "#4f46e5",
        background: "#0f172a",
        color: "#f8fafc",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-10 flex items-center justify-center font-sans">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-[#0b0d19]/80 border border-slate-800/80 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
        {/* LEFT PANEL: Enterprise Brand Experience */}
        <div className="lg:col-span-4 hidden lg:flex flex-col justify-between p-10 bg-gradient-to-b from-[#0e1022] via-[#090b17] to-[#0d0f20] border-r border-slate-800/60 relative overflow-hidden">
          {/* Ambient Orbs */}
          <div className="absolute top-[-20%] left-[-20%] w-[250px] h-[250px] bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[220px] h-[220px] bg-purple-600/20 rounded-full blur-[90px] pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <img src={LogoImg} alt="Logo" className="w-8 h-auto" />
              <span className="text-lg font-black text-white">
                Skill<span className="text-indigo-400">Engine</span>
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Join the Engine.{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent block">
                Elevate Your Skills.
              </span>
            </h2>

            <p className="text-slate-400 text-xs leading-relaxed mt-3 font-medium">
              Create your account to match with verified experts, swap skills, and build your professional portfolio.
            </p>
          </div>

          {/* Center Lottie Animation */}
          <div className="relative z-10 my-4 flex items-center justify-center">
            <div className="w-full scale-110 max-w-[260px]">
              <DotLottieReact
                src="https://lottie.host/0ec79e5f-00b0-4c44-9e2b-b74411463f29/EdvUjo1hyx.lottie"
                autoplay
                loop
              />
            </div>
          </div>

          {/* Footer Quote */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 text-center">
            <p className="text-slate-400 text-[11px] italic font-medium">
              "Your skills are your currency. Trade them wisely."
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Multi-step Form */}
        <form onSubmit={handleFormSubmit} className="lg:col-span-8 p-6 sm:p-10 lg:p-12 bg-[#090b16]/90 relative flex flex-col justify-between">
          {/* Header Step Progress */}
          <div className="mb-8 flex justify-between items-end border-b border-slate-800/60 pb-6">
            <div>
              <span className="text-indigo-400 text-[10px] font-extrabold uppercase tracking-[0.25em]">
                Phase 0{step} of 03
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
                {step === 1 && "Create Your Identity"}
                {step === 2 && "Skill Protocol & Matrix"}
                {step === 3 && "Final Verification"}
              </h2>
            </div>
            <div className="flex gap-2 mb-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-500 ${step >= i ? "w-8 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30" : "w-3 bg-slate-800"}`}
                />
              ))}
            </div>
          </div>

          {/* Form Step Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <InputField
                  icon={<User size={18} />}
                  label="Full Name"
                  name="fullName"
                  placeholder="Enter Your Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
                <InputField
                  icon={<Mail size={18} />}
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="Enter Your Valid Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <InputField
                  icon={<Lock size={18} />}
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                />

                <button
                  type="button"
                  disabled={!isStepValid(1)}
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mt-6 shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Configure Skills & CV</span> <ArrowRight size={16} />
                </button>

                <div className="flex items-center gap-4 py-4">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Quick Register With
                  </span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <LoginButton
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                      // Check if flagged as new user by signInWithGoogle in AuthProvider
                      const stored = sessionStorage.getItem("googleNewUser");
                      if (stored) {
                        sessionStorage.removeItem("googleNewUser");
                        const { fullName, email, profileImage, uid } = JSON.parse(stored);
                        setFormData((prev) => ({
                          ...prev,
                          fullName: fullName || "",
                          email: email || "",
                          password: "GOOGLE_AUTH_NO_PASSWORD",
                          profileImage: profileImage || "",
                        }));
                        setIsGoogleFlow(true);
                        setGoogleUid(uid);
                        setStep(2);
                      } else {
                        // Existing user — go home
                        navigate("/");
                      }
                    } catch (error) {
                      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
                        return;
                      }
                      console.error("[Google Sign-in Error]", error.code, error.message);
                      Swal.fire({
                        icon: "error",
                        title: "Google Sign-in Failed",
                        text: error.message || "Could not sign in with Google.",
                        confirmButtonColor: "#4f46e5",
                        background: "#0f172a",
                        color: "#f8fafc",
                      });
                    }
                  }}
                />

                <p className="text-center text-xs font-semibold text-slate-400 mt-4">
                  Already have an account?{" "}
                  <NavLink
                    to="/login"
                    className="text-indigo-400 font-extrabold hover:text-indigo-300 hover:underline transition-colors"
                  >
                    Access Portal
                  </NavLink>
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* CV Upload Zone */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Optionally Upload CV for AI Skill Extraction
                  </span>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                      isCvParsing
                        ? "border-indigo-500/50 bg-indigo-500/10 cursor-not-allowed"
                        : "border-slate-800 hover:border-indigo-500/40 bg-slate-900/60 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      {isCvParsing ? (
                        <Loader2 className="animate-spin text-indigo-400" size={18} />
                      ) : (
                        <Upload className="text-indigo-400" size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200">
                        {isCvParsing ? "Analysing your CV with AI..." : "Upload CV / Resume"}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">
                        PDF, DOCX, or TXT · Max 5 MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleCvUpload}
                      disabled={isCvParsing}
                      className="hidden"
                    />
                  </label>
                  {cvError && (
                    <p
                      className={`text-[11px] font-bold px-1 ${
                        cvError.startsWith("No skills") ? "text-amber-400" : "text-rose-400"
                      }`}
                    >
                      {cvError}
                    </p>
                  )}
                </div>

                <SkillSelector
                  label="Skills I Can Teach"
                  selected={formData.teachSkills}
                  custom={customSkills.teach}
                  onToggle={(s) => toggleSkill("teach", s)}
                  onOther={() =>
                    setShowOtherInput((p) => ({ ...p, teach: true }))
                  }
                  showOther={showOtherInput.teach}
                  otherVal={otherSkill.teach}
                  setOtherVal={(v) =>
                    setOtherSkill((p) => ({ ...p, teach: v }))
                  }
                  addOther={() => addOtherSkill("teach")}
                  query={searchQuery.teach}
                  setQuery={(v) => setSearchQuery((p) => ({ ...p, teach: v }))}
                  activeColor="bg-[#5D5FEF]"
                />

                <SkillSelector
                  label="Skills I Want to Learn"
                  selected={formData.learnSkills}
                  custom={customSkills.learn}
                  onToggle={(s) => toggleSkill("learn", s)}
                  onOther={() =>
                    setShowOtherInput((p) => ({ ...p, learn: true }))
                  }
                  showOther={showOtherInput.learn}
                  otherVal={otherSkill.learn}
                  setOtherVal={(v) =>
                    setOtherSkill((p) => ({ ...p, learn: v }))
                  }
                  addOther={() => addOtherSkill("learn")}
                  query={searchQuery.learn}
                  setQuery={(v) => setSearchQuery((p) => ({ ...p, learn: v }))}
                  activeColor="bg-purple-600"
                  onAiSuggest={handleSuggestLearn}
                  isAiLoading={isLearnSuggesting}
                  aiDisabled={isCvParsing || !cvText}
                />

                {learnError && (
                  <p
                    className={`text-[11px] font-bold px-1 -mt-3 ${
                      learnError.startsWith("No learning") ? "text-amber-400" : "text-rose-400"
                    }`}
                  >
                    {learnError}
                  </p>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      if (isGoogleFlow) {
                        setIsGoogleFlow(false);
                        setGoogleUid(null);
                        setFormData((prev) => ({
                          ...prev,
                          fullName: "",
                          email: "",
                          password: "",
                          profileImage: "",
                        }));
                      }
                    }}
                    className="flex-1 py-3.5 border border-slate-800 rounded-2xl font-bold text-slate-300 hover:bg-slate-900 transition-all cursor-pointer text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!isStepValid(2)}
                    onClick={() => setStep(3)}
                    className="flex-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/25 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  >
                    Finalize Profile
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Profile Image Avatar Upload */}
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Profile Avatar
                  </span>
                  <div className="relative group cursor-pointer">
                    <div className="w-28 h-28 rounded-3xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden bg-slate-900 group-hover:border-indigo-500/50 transition-all shadow-xl">
                      {isUploading ? (
                        <Loader2 className="animate-spin text-indigo-400" size={24} />
                      ) : formData.profileImage ? (
                        <img
                          src={formData.profileImage}
                          className="w-full h-full object-cover"
                          alt="Profile preview"
                        />
                      ) : (
                        <Upload className="text-slate-500" size={28} />
                      )}
                      <input
                        type="file"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/*"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border border-indigo-400/30">
                      <Plus size={14} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Click to upload photo</span>
                </div>

                <InputField
                  icon={<GraduationCap size={18} />}
                  label="Education / Institute"
                  name="education"
                  placeholder="University, College, or Self-Taught"
                  value={formData.education}
                  onChange={handleInputChange}
                />

                {/* Terms Checkbox */}
                <label className="flex items-start gap-3 p-4 bg-slate-900/70 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-all">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                    className="mt-0.5 accent-indigo-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-300 leading-snug">
                    I agree to the{" "}
                    <span className="text-indigo-400 font-bold hover:underline">
                      Terms of Participation
                    </span>{" "}
                    and Platform Governance rules.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3.5 border border-slate-800 rounded-2xl font-bold text-xs text-slate-300 hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Review Skills
                  </button>
                  <button
                    type="submit"
                    disabled={!isStepValid(3) || isSubmitting}
                    className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-2xl font-bold text-xs shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      "Launch Profile"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
};

const SkillSelector = ({
  label,
  selected,
  custom,
  onToggle,
  onOther,
  showOther,
  otherVal,
  setOtherVal,
  addOther,
  query,
  setQuery,
  activeColor,
  onAiSuggest,
  isAiLoading = false,
  aiDisabled = false,
}) => (
  <div className="space-y-2.5">
    <div className="flex justify-between items-center px-0.5">
      <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-400" /> {label}
      </h3>
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Filter..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-7 pr-2 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-200 outline-none w-24 focus:w-32 transition-all focus:border-indigo-500/40"
        />
      </div>
    </div>

    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl custom-scrollbar">
      {showOther ? (
        <div className="flex gap-1.5 w-full">
          <input
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 outline-none focus:border-indigo-500"
            value={otherVal}
            onChange={(e) => setOtherVal(e.target.value)}
            placeholder="New skill..."
          />
          <button
            type="button"
            onClick={addOther}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Add
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOther}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all cursor-pointer"
          >
            + Add Custom
          </button>
          {onAiSuggest !== undefined && (
            <button
              type="button"
              onClick={onAiSuggest}
              disabled={isAiLoading || aiDisabled}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
                isAiLoading || aiDisabled
                  ? "border-slate-800 text-slate-600 cursor-not-allowed"
                  : "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer"
              }`}
            >
              {isAiLoading ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <>
                  <Sparkles size={12} />
                  AI Suggest
                </>
              )}
            </button>
          )}
        </div>
      )}

      {[...custom, ...INITIAL_SKILLS]
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        .map((skill) => {
          const isSelected = selected.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(skill)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isSelected
                  ? `${activeColor} text-white shadow-md shadow-indigo-500/20`
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {skill}
            </button>
          );
        })}
    </div>
  </div>
);

const InputField = ({ icon, label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
      {label}
    </label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
        {icon}
      </div>
      <input
        {...props}
        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl focus:bg-slate-900 focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-100 placeholder:text-slate-500 font-medium text-sm"
      />
    </div>
  </div>
);

export default Register;
