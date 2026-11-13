import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios"; // used for public unauthenticated endpoints (ratings, courses)
import apiClient from "@/lib/apiClient";
import {
  validateImageFile,
  uploadProfileImageToCloudinary,
  uploadCertificateFileToCloudinary,
  withCacheBust,
  fetchProfile,
  updateProfile as patchUserProfile,
  buildDiffPayload,
  sanitizeCertificates,
} from "@/lib/profileApi";
import { formatBDT } from "@/lib/money";
import { useForm } from "react-hook-form";
import {
  Edit3,
  Mail,
  GraduationCap,
  Code,
  BookOpen,
  ShieldCheck,
  Calendar,
  Award,
  Settings,
  ArrowRight,
  Zap,
  LayoutGrid,
  Sparkles,
  Route,
  X,
  Save,
  User,
  Share2,
  Download,
  MapPin,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Layers,
  Activity,
  FileText,
  Star,
  ChevronRight,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Flame,
  FolderGit2,
  Terminal,
  Cpu,
  Cloud,
  Camera,
  Upload,
  RefreshCw,
  SlidersHorizontal,
  Link as LinkIcon,
  Search,
  Filter,
  FileCheck,
  FileCode,
  FileText as FileIcon,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import EngineLoadingComponent from "@/components/shared/loading/EngineLoadingComponent";
import { LoadingSpinner } from "@/components/shared/loading/LoadingSpinner";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { auth } from "@/firebase/firebase.init";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { generateCareerIntelligence } from "@/lib/careerIntelligence";
import { extractCertificateMetadata } from "@/lib/certificateParser";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── SKILL CATEGORIZATION CONFIG ───────────────────────────────────────────────
const CATEGORIES = {
  Frontend: {
    icon: LayoutGrid,
    color: "from-blue-500/20 to-indigo-500/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    keywords: ["react", "javascript", "js", "typescript", "ts", "html", "css", "tailwind", "next.js", "nextjs", "vue", "angular", "redux", "zustand"],
  },
  Backend: {
    icon: Terminal,
    color: "from-emerald-500/20 to-teal-500/20",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    keywords: ["node.js", "nodejs", "node", "express", "mongodb", "python", "sql", "postgresql", "postgres", "java", "rest api", "graphql", "prisma", "redis"],
  },
  "DevOps & Cloud": {
    icon: Cloud,
    color: "from-purple-500/20 to-pink-500/20",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    keywords: ["docker", "kubernetes", "aws", "ci/cd", "cicd", "linux", "git", "github", "nginx", "cloud"],
  },
  "Tools & Architecture": {
    icon: Cpu,
    color: "from-amber-500/20 to-orange-500/20",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    keywords: ["jest", "vitest", "testing", "vite", "webpack", "figma", "system design", "architecture"],
  },
};

const categorizeSkills = (teachSkills = [], learnSkills = []) => {
  const teachList = (teachSkills || []).map((s) => ({ name: String(s).trim(), type: "teach" })).filter((s) => s.name);
  const learnList = (learnSkills || []).map((s) => ({ name: String(s).trim(), type: "learn" })).filter((s) => s.name);
  const combined = [...teachList, ...learnList];

  const grouped = {
    Frontend: [],
    Backend: [],
    "DevOps & Cloud": [],
    "Tools & Architecture": [],
  };

  combined.forEach((item) => {
    const lower = item.name.toLowerCase();
    let placed = false;
    for (const [cat, meta] of Object.entries(CATEGORIES)) {
      if (meta.keywords.some((k) => lower.includes(k))) {
        grouped[cat].push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      grouped["Tools & Architecture"].push(item);
    }
  });

  return grouped;
};

// ─── PROFILE COMPLETION AUDITOR ───────────────────────────────────────────────
// Profile completion is calculated using centralized calculateProfileCompletion service

// ─── RADIAL SCORE GAUGE COMPONENT ─────────────────────────────────────────────
const CompletionRing = ({ percentage }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} className="stroke-slate-800" strokeWidth="6" fill="transparent" />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          className="stroke-indigo-500"
          strokeWidth="6"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black text-white">{percentage}%</span>
        <span className="text-[8px] font-extrabold uppercase text-slate-400">Score</span>
      </div>
    </div>
  );
};

const MyProfile = () => {
  const { user, updateUserData } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const certFileInputRef = useRef(null);
  // Prevents duplicate in-flight PATCH requests if the user clicks Save twice
  const updateAbortControllerRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("basic");
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ratingsSummary, setRatingsSummary] = useState({ averageRating: 5.0, totalRatings: 0 });
  const [userCourses, setUserCourses] = useState([]);       // courses the user created as instructor
  const [enrolledCourses, setEnrolledCourses] = useState([]); // courses the user purchased/enrolled in
  const [activeTab, setActiveTab] = useState("overview");
  const [canCreateCourse, setCanCreateCourse] = useState(false);

  // Profile Image Upload State
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Tracks the Cloudinary public_id of the pending (just-uploaded) image.
  // Sent to server PATCH so the server can delete the old image.
  const [pendingPublicId, setPendingPublicId] = useState(null);

  // Project Form State inside Edit Modal
  const [newProject, setNewProject] = useState({ title: "", description: "", techStack: "", githubUrl: "", demoUrl: "" });
  const [userProjects, setUserProjects] = useState([]);

  // ─── CERTIFICATES STATE ──────────────────────────────────────────────────────
  const [userCertificates, setUserCertificates] = useState([]);
  const [editingCertId, setEditingCertId] = useState(null);
  const [certSearch, setCertSearch] = useState("");
  const [certFilter, setCertFilter] = useState("all");
  const [extractingCert, setExtractingCert] = useState(false);

  const [newCert, setNewCert] = useState({
    id: "",
    name: "",
    organization: "",
    credentialId: "",
    credentialUrl: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    doesNotExpire: true,
    skills: "",
    description: "",
    fileUrl: "",
    fileType: "",
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      fullName: "",
      username: "",
      profileImage: "",
      headline: "",
      bio: "",
      role: "",
      education: "",
      location: "",
      website: "",
      github: "",
      linkedin: "",
      portfolio: "",
      teachSkills: "",
      learnSkills: "",
      teachLevel: "Intermediate",
      learnLevel: "Growth",
    },
  });

  const watchProfileImage = watch("profileImage");

  const fetchUserData = useCallback(async () => {
    if (!user?.email) {
      // Provide an attractive demo profile for preview if not signed in yet
      const defaultData = {
        fullName: "Alex Morgan",
        username: "alexmorgan",
        headline: "Lead Software Architect & Tech Contributor",
        bio: "Passionate software engineer building modern scalable web systems, collaborating with global peers, and expanding core computer science fundamentals.",
        role: "Senior Full Stack Engineer",
        education: "B.Sc. in Computer Science & Engineering",
        location: "Dhaka, Bangladesh / Remote Global",
        website: "https://skillengine.dev",
        github: "https://github.com",
        linkedin: "https://linkedin.com",
        portfolio: "https://skillengine.dev",
        teachSkills: ["React 19", "Node.js", "Docker", "Tailwind CSS", "MongoDB"],
        learnSkills: ["LangChain", "Vector Embeddings", "Kubernetes", "Next.js"],
        teachLevel: "Advanced",
        learnLevel: "Intermediate",
        projects: [
          {
            title: "Collaborative Skill Engine",
            description: "Scalable peer-to-peer skill exchange platform with AI career advising, real-time messaging, and interactive workspaces.",
            techStack: ["React 19", "Node.js", "Socket.io", "FAISS", "Docker"],
            githubUrl: "https://github.com",
            demoUrl: "http://localhost:5173",
          },
          {
            title: "Distributed Vector Retrieval Pipeline",
            description: "Low-latency semantic search engine powered by LangChain and FAISS vector indices for developer mentorship matching.",
            techStack: ["Node.js", "FAISS", "LangChain", "Express"],
            githubUrl: "https://github.com",
            demoUrl: "http://localhost:3000",
          },
        ],
        certificates: [
          {
            id: "cert-1",
            name: "Cloud Native Architecture Specialist",
            organization: "Collaborative Skill Engine Academy",
            credentialId: "CSE-2026-ARC-994",
            credentialUrl: "https://skillengine.dev/verify",
            issueDate: "2026-01-15",
            doesNotExpire: true,
            skills: ["Docker", "Microservices", "React", "MongoDB"],
            description: "Mastery of end-to-end full stack deployment and containerized cloud services.",
          },
        ],
      };
      setData(defaultData);
      setUserProjects(defaultData.projects);
      setUserCertificates(defaultData.certificates);
      setPhotoPreview("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80");
      reset({
        fullName: defaultData.fullName,
        username: defaultData.username,
        profileImage: "",
        headline: defaultData.headline,
        bio: defaultData.bio,
        role: defaultData.role,
        education: defaultData.education,
        location: defaultData.location,
        website: defaultData.website,
        github: defaultData.github,
        linkedin: defaultData.linkedin,
        portfolio: defaultData.portfolio,
        teachSkills: defaultData.teachSkills.join(", "),
        learnSkills: defaultData.learnSkills.join(", "),
        teachLevel: defaultData.teachLevel,
        learnLevel: defaultData.learnLevel,
      });
      setLoading(false);
      return;
    }

    try {
      const uData = await fetchProfile(user.email);
      setData(uData);
      setUserProjects(uData?.projects || []);
      setUserCertificates(uData?.certificates || []);
      setPhotoPreview(uData?.profileImage || user.photoURL || "");

      reset({
        fullName: uData?.fullName || user.displayName || "",
        username: uData?.username || user.email?.split("@")[0] || "",
        profileImage: uData?.profileImage || user.photoURL || "",
        headline: uData?.headline || `${uData?.role || "Software Engineer"} & Tech Contributor`,
        bio: uData?.bio || "Passionate software engineer building modern scalable web systems, collaborating with global peers, and expanding core computer science fundamentals.",
        role: uData?.role || "Software Engineer",
        education: uData?.education || "Computer Science",
        location: uData?.location || "Remote / Global",
        website: uData?.website || "",
        github: uData?.github || "",
        linkedin: uData?.linkedin || "",
        portfolio: uData?.portfolio || "",
        teachSkills: uData?.teachSkills?.join(", ") || "",
        learnSkills: uData?.learnSkills?.join(", ") || "",
        teachLevel: uData?.teachLevel || "Intermediate",
        learnLevel: uData?.learnLevel || "Growth",
      });
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  }, [user, reset]);

  const fetchExtraData = useCallback(async () => {
    if (!user?.email) return;
    try {
      const ratRes = await axios.get(`${API_URL}/ratings/summary?targetEmail=${encodeURIComponent(user.email)}`);
      if (ratRes.data) {
        setRatingsSummary({
          averageRating: ratRes.data.averageRating || 5.0,
          totalRatings: ratRes.data.totalRatings || 0,
        });
      }
    } catch {
      // silent fallback
    }

    try {
      const cRes = await axios.get(`${API_URL}/courses/public`);
      if (Array.isArray(cRes.data)) {
        const mine = cRes.data.filter((c) => c.instructorEmail?.toLowerCase() === user.email.toLowerCase());
        setUserCourses(mine);
      }
    } catch {
      // silent fallback
    }

    // Fetch courses the user has enrolled in (purchased)
    try {
      const enrollRes = await apiClient.get("/courses/my-enrollments");
      if (Array.isArray(enrollRes.data)) {
        setEnrolledCourses(enrollRes.data);
      }
    } catch {
      // silent fallback — enrolled courses section stays empty
    }

    // Check course creation / studio eligibility
    try {
      const eligRes = await apiClient.get("/courses/eligibility");
      setCanCreateCourse(Boolean(eligRes.data?.canCreateCourse));
    } catch {
      setCanCreateCourse(false);
    }
  }, [user?.email]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchUserData();
    fetchExtraData();
  }, [fetchUserData, fetchExtraData]);

  // NOTE: We intentionally do NOT sync data.certificates → userCertificates via a
  // useEffect here. Doing so creates a destructive race condition: when handleSaveCertificate
  // calls setData() after a successful PATCH, the effect would immediately overwrite the
  // optimistic local state set in line 507 with whatever the DB returned (which may be
  // stale or differently-shaped). Instead, userCertificates is authoritative locally and
  // is only reset from the DB response inside the .then() handlers below.

  // ─── PROFILE IMAGE UPLOAD HANDLERS ─────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate file type and size before touching Cloudinary
    try {
      validateImageFile(file);
    } catch (err) {
      toast.error(err.message || "Invalid image format.");
      return;
    }

    setUploadingPhoto(true);
    try {
      // 2. Compress + upload directly to Cloudinary
      // If Cloudinary env vars are missing this throws a clear error.
      const { secure_url, public_id } = await uploadProfileImageToCloudinary(file);

      // 3. Show the new image immediately (cache-busted)
      setPhotoPreview(withCacheBust(secure_url, new Date().toISOString()));

      // 4. Store values for use in onSubmit
      setValue("profileImage", secure_url);
      setPendingPublicId(public_id);
      toast.success("Profile photo uploaded!");
    } catch (err) {
      console.error("[Profile] Cloudinary upload failed:", err.message);
      toast.error(err.message || "Could not upload image. Please try again.");
      // Old image remains untouched
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview("");
    setValue("profileImage", "");
    setPendingPublicId(null);
  };

  // ─── CERTIFICATE FILE UPLOAD & OCR EXTRACTION HANDLER ────────────────────────
  const handleCertFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "text/plain",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
      toast.error("Allowed formats: PDF, JPG, PNG, WEBP, or TXT.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Certificate files must be under 5MB.");
      return;
    }

    setExtractingCert(true);

    // Instant local preview URL
    const localPreviewUrl = URL.createObjectURL(file);
    const initialFileType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/png");

    setNewCert((prev) => ({
      ...prev,
      fileUrl: localPreviewUrl,
      fileType: initialFileType,
    }));

    try {
      // 1. Upload to Cloudinary CDN
      const { secure_url, public_id, fileType } = await uploadCertificateFileToCloudinary(file);

      // 2. Extract OCR / metadata if needed
      let extracted = {};
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise((res) => { reader.onloadend = res; });
        extracted = await extractCertificateMetadata(file, reader.result);
      } catch (ocrErr) {
        console.warn("[OCR extraction skipped]:", ocrErr);
      }

      // 3. Update form state with real Cloudinary HTTPS URL and public_id
      setNewCert((prev) => ({
        ...prev,
        name: extracted.name || prev.name || file.name.replace(/\.[^/.]+$/, ""),
        organization: extracted.organization || prev.organization,
        credentialId: extracted.credentialId || prev.credentialId,
        issueDate: extracted.issueDate || prev.issueDate,
        skills: extracted.skills || prev.skills,
        description: extracted.description || prev.description,
        fileUrl: secure_url,
        public_id,
        fileType: fileType || initialFileType,
      }));

      toast.success("Certificate uploaded to CDN & metadata parsed!");
    } catch (err) {
      console.error("[Cert Upload Error]:", err);
      // Revert preview on failure
      setNewCert((prev) => ({
        ...prev,
        fileUrl: "",
        public_id: null,
      }));
      toast.error(err.message || "Failed to upload certificate file.");
    } finally {
      setExtractingCert(false);
    }
  };

  const handleSaveCertificate = () => {
    if (!newCert.name.trim() || !newCert.organization.trim()) {
      toast.warning("Please enter Certificate Name and Issuing Organization.");
      return;
    }

    const certItem = {
      id: editingCertId || Date.now().toString(),
      name: newCert.name.trim(),
      organization: newCert.organization.trim(),
      credentialId: newCert.credentialId.trim(),
      credentialUrl: newCert.credentialUrl.trim(),
      issueDate: newCert.issueDate,
      expiryDate: newCert.doesNotExpire ? "" : newCert.expiryDate,
      doesNotExpire: newCert.doesNotExpire,
      skills: typeof newCert.skills === "string" ? newCert.skills.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(newCert.skills) ? newCert.skills : [],
      description: newCert.description.trim(),
      fileUrl: newCert.fileUrl,
      public_id: newCert.public_id || null,
      fileType: newCert.fileType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedCerts;
    if (editingCertId) {
      updatedCerts = userCertificates.map((c) => (c.id === editingCertId ? certItem : c));
      setEditingCertId(null);
    } else {
      updatedCerts = [certItem, ...userCertificates];
    }

    // ── Optimistic local update — cert appears instantly ──────────────────────
    setUserCertificates(updatedCerts);

    // ── Persist to DB immediately via auto-sync PATCH ─────────────────────────
    const safeCerts = sanitizeCertificates(updatedCerts);
    const targetId = data?._id || user?.email;
    if (targetId) {
      patchUserProfile(targetId, { certificates: safeCerts })
        .then((response) => {
          // The API returns { success, message, data: { ...userDoc } }
          // We must check success and extract the nested data field.
          if (!response?.success) {
            throw new Error(response?.message || "Certificate save failed. Please try again.");
          }

          // response.data is the actual updated user document from MongoDB.
          const updatedUserDoc = response.data;

          if (updatedUserDoc) {
            // Update global data state with only the fields from the server response.
            // Do NOT spread the whole updatedUserDoc into data blindly — instead merge
            // only what the server returned so we don't clobber unrelated local state.
            setData((prev) => ({
              ...prev,
              ...updatedUserDoc,
            }));

            // Authoritative cert list from DB — replace local optimistic state.
            if (Array.isArray(updatedUserDoc.certificates)) {
              setUserCertificates(updatedUserDoc.certificates);
            }

            // Propagate to global AuthContext (navbar avatar, etc.)
            if (updateUserData) updateUserData(updatedUserDoc);
          }
        })
        .catch((err) => {
          console.error("[Certificates] Auto-sync failed:", err.message);
          // Revert the optimistic update so the UI matches reality
          setUserCertificates(userCertificates);
          toast.error(err.message || "Could not save the certificate. Please try again.");
        });
    }

    toast.success(editingCertId ? "Certificate updated!" : "Certificate added to profile!");

    // Reset Form
    setNewCert({
      id: "",
      name: "",
      organization: "",
      credentialId: "",
      credentialUrl: "",
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      doesNotExpire: true,
      skills: "",
      description: "",
      fileUrl: "",
      public_id: null,
      fileType: "",
    });
  };

  const handleEditCertInit = (cert) => {
    setEditingCertId(cert.id);
    setNewCert({
      id: cert.id,
      name: cert.name || "",
      organization: cert.organization || "",
      credentialId: cert.credentialId || "",
      credentialUrl: cert.credentialUrl || "",
      issueDate: cert.issueDate || new Date().toISOString().split("T")[0],
      expiryDate: cert.expiryDate || "",
      doesNotExpire: cert.doesNotExpire ?? true,
      skills: Array.isArray(cert.skills) ? cert.skills.join(", ") : cert.skills || "",
      description: cert.description || "",
      fileUrl: cert.fileUrl || "",
      public_id: cert.public_id || null,
      fileType: cert.fileType || "",
    });
    setModalTab("certificates");
    setIsModalOpen(true);
  };

  const handleDeleteCert = (id) => {
    const previousCerts = userCertificates;
    const updatedCerts = userCertificates.filter((c) => c.id !== id);

    // ── Optimistic local update ───────────────────────────────────────────────
    setUserCertificates(updatedCerts);

    // ── Persist deletion to DB immediately via auto-sync PATCH ────────────────
    const safeCerts = sanitizeCertificates(updatedCerts);
    const targetId = data?._id || user?.email;
    if (targetId) {
      patchUserProfile(targetId, { certificates: safeCerts })
        .then((response) => {
          // The API returns { success, message, data: { ...userDoc } }
          if (!response?.success) {
            throw new Error(response?.message || "Certificate deletion failed. Please try again.");
          }

          const updatedUserDoc = response.data;

          if (updatedUserDoc) {
            setData((prev) => ({ ...prev, ...updatedUserDoc }));
            if (Array.isArray(updatedUserDoc.certificates)) {
              setUserCertificates(updatedUserDoc.certificates);
            }
            if (updateUserData) updateUserData(updatedUserDoc);
          }
          toast.success("Certificate deleted successfully.");
        })
        .catch((err) => {
          console.error("[Certificates] Delete auto-sync failed:", err.message);
          // Revert the optimistic delete so the cert re-appears
          setUserCertificates(previousCerts);
          toast.error(err.message || "Could not delete the certificate. Please try again.");
        });
    }
  };

  const handleReorderCert = (id, direction) => {
    const idx = userCertificates.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= userCertificates.length) return;

    const copy = [...userCertificates];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setUserCertificates(copy);
  };

  const normalizeSkills = (value) => {
    if (Array.isArray(value)) return value;
    return String(value || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  };

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.warning("Please provide a project title.");
      return;
    }
    const item = {
      id: Date.now().toString(),
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      techStack: newProject.techStack.split(",").map((s) => s.trim()).filter(Boolean),
      githubUrl: newProject.githubUrl.trim(),
      demoUrl: newProject.demoUrl.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setUserProjects((prev) => [...prev, item]);
    setNewProject({ title: "", description: "", techStack: "", githubUrl: "", demoUrl: "" });
    toast.success("Project added to list!");
  };

  const handleRemoveProject = (id) => {
    setUserProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project removed.");
  };

  const onSubmit = async (formValues) => {
    if (!user?.email) {
      toast.info("Preview Mode: Changes applied to current view. Sign in to sync permanently with your account.");
      const updatedFields = {
        ...formValues,
        teachSkills: normalizeSkills(formValues.teachSkills),
        learnSkills: normalizeSkills(formValues.learnSkills),
      };
      setData((prev) => ({ ...prev, ...updatedFields }));
      setIsModalOpen(false);
      return;
    }

    // ── Prevent duplicate in-flight requests ────────────────────────────────
    if (updateAbortControllerRef.current) {
      updateAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    updateAbortControllerRef.current = abortController;

    setUpdating(true);
    try {
      // ── Normalize skill arrays ──────────────────────────────────────────
      const updatedFields = {
        ...formValues,
        teachSkills: normalizeSkills(formValues.teachSkills),
        learnSkills: normalizeSkills(formValues.learnSkills),
      };

      // ── Safely update Firebase display name (non-blocking) ────────────
      if (auth?.currentUser) {
        try {
          const fbUpdate = { displayName: updatedFields.fullName || auth.currentUser.displayName };
          const imageVal = updatedFields.profileImage;
          // Only set photoURL if it's a real HTTP URL (not base64)
          if (
            imageVal &&
            typeof imageVal === "string" &&
            (imageVal.startsWith("http://") || imageVal.startsWith("https://")) &&
            imageVal.length < 2048
          ) {
            fbUpdate.photoURL = imageVal;
          }
          await updateFirebaseProfile(auth.currentUser, fbUpdate);
        } catch (fbErr) {
          // Firebase profile update is non-critical — log and continue
          console.warn("[Profile] Firebase updateProfile warning:", fbErr.message);
        }
      }

      // ── Resolve the target identifier ─────────────────────────────────
      const targetIdentifier = data?._id || user?.email;
      if (!targetIdentifier) {
        throw new Error("No valid user identifier found. Please sign out and sign back in.");
      }

      // ── Sanitize certificates (strip base64 fileUrls) ─────────────────────
      const safeCertificates = sanitizeCertificates(userCertificates);

      // ── Build diff payload — only changed fields + always-send arrays ─
      // Pass pendingPublicId so the server knows to delete the old Cloudinary image
      const diffPayload = buildDiffPayload(
        data,
        updatedFields,
        userProjects,
        safeCertificates,
        pendingPublicId
      );

      // ── Send PATCH (JWT auto-attached by apiClient interceptor) ───────
      const result = await patchUserProfile(targetIdentifier, diffPayload, abortController.signal);

      if (!result.success) {
        throw new Error(result.message || "Profile update failed. Please try again.");
      }

      // ── Update local state & global AuthContext (source of truth) ─────
      const freshUser = result.data;
      if (freshUser) {
        setData((prev) => ({ ...prev, ...freshUser }));
        setUserProjects(freshUser.projects || userProjects);
        setUserCertificates(freshUser.certificates || userCertificates);
        if (freshUser.profileImage) {
          // Apply cache buster using the freshly updated updatedAt timestamp
          setPhotoPreview(withCacheBust(freshUser.profileImage, freshUser.updatedAt));
        }
        // Clear pending public_id now that it's committed to DB
        setPendingPublicId(null);
        if (updateUserData) {
          // Propagate cache-busted URL to navbar, avatar, and all consumers
          updateUserData({
            ...freshUser,
            profileImage: freshUser.profileImage
              ? withCacheBust(freshUser.profileImage, freshUser.updatedAt)
              : freshUser.profileImage,
          });
        }
      }

      toast.success(result.message || "Your profile has been updated successfully.");
      setIsModalOpen(false);
    } catch (error) {
      // Ignore aborted requests (user clicked Save again)
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;

      console.error("[Profile] Update failed:", error);

      // Surface a meaningful, context-aware error message
      const status = error.response?.status;
      let errorMessage;

      if (status === 401) {
        errorMessage = "Your session has expired. Please sign out and sign back in.";
      } else if (status === 403) {
        errorMessage = "Access denied. You can only update your own profile.";
      } else if (status === 404) {
        errorMessage = "Profile not found. Please refresh the page and try again.";
      } else if (status === 400) {
        errorMessage = error.response?.data?.message || "Some fields contain invalid data. Please review and try again.";
      } else if (error.message?.includes("Network Error") || error.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else {
        errorMessage = error.response?.data?.message || error.message || "Failed to update profile. Please try again.";
      }

      toast.error(errorMessage);
    } finally {
      updateAbortControllerRef.current = null;
      setUpdating(false);
    }
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Profile link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Certificate Search & Filter Query
  const filteredCertificates = useMemo(() => {
    return userCertificates.filter((cert) => {
      const q = certSearch.toLowerCase();
      const nameMatch = (cert.name || "").toLowerCase().includes(q);
      const orgMatch = (cert.organization || "").toLowerCase().includes(q);
      const skillMatch = (cert.skills || []).some((s) => String(s).toLowerCase().includes(q));
      const matchesSearch = !q || nameMatch || orgMatch || skillMatch;

      if (certFilter === "verified") {
        return matchesSearch && Boolean(cert.credentialUrl);
      }
      if (certFilter === "no-expire") {
        return matchesSearch && Boolean(cert.doesNotExpire);
      }
      return matchesSearch;
    });
  }, [userCertificates, certSearch, certFilter]);

  // Aggregate cert stats
  const certStats = useMemo(() => {
    const total = userCertificates.length;
    const verified = userCertificates.filter((c) => c.credentialUrl).length;
    const allCertSkills = Array.from(
      new Set(userCertificates.flatMap((c) => Array.isArray(c.skills) ? c.skills : []))
    );
    const recentCert = userCertificates[0]?.name || "None";
    return { total, verified, skillsCount: allCertSkills.length, recentCert };
  }, [userCertificates]);

  const intel = useMemo(() => generateCareerIntelligence(data, null), [data]);
  const completion = useMemo(() => calculateProfileCompletion(data), [data]);
  const categorizedSkills = useMemo(
    () => categorizeSkills(data?.teachSkills, data?.learnSkills),
    [data?.teachSkills, data?.learnSkills]
  );

  const teachSkillsValue = watch("teachSkills") || "";
  const learnSkillsValue = watch("learnSkills") || "";

  if (loading) return <EngineLoadingComponent />;

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-indigo-500/30 pb-28 relative overflow-x-hidden">
      {/* Ambient Mesh Spotlights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/10 blur-[180px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[700px] h-[700px] bg-indigo-950/20 blur-[200px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 relative z-10 space-y-8">
        {/* ─── 1. HERO PROFILE BANNER CARD ──────────────────────────────────── */}
        <section aria-label="Profile Header">
          <Card className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0b101d] backdrop-blur-2xl shadow-2xl">
            {/* Mesh Cover Graphic */}
            <div className="h-48 sm:h-60 w-full relative bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 overflow-hidden border-b border-slate-800/90">
              <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
              <div className="absolute -top-10 left-1/3 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              {/* Top Right Status Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Identity
                </span>
              </div>
            </div>

            {/* Profile Overlay Content */}
            <div className="px-6 pb-8 pt-0 relative">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
                
                {/* Profile Avatar Frame */}
                <div className="relative group shrink-0">
                  <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl p-1 bg-[#0b101d] ring-4 ring-slate-900 shadow-2xl overflow-hidden relative">
                    <img
                      src={photoPreview || data?.profileImage || user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                      alt={data?.fullName || "User Avatar"}
                      className="h-full w-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setModalTab("photo"); setIsModalOpen(true); }}
                    className="absolute bottom-1 right-1 p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl transition-all hover:scale-110 flex items-center justify-center"
                    title="Change profile photo"
                    aria-label="Change profile photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>

                {/* Header Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-10 px-4 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                  >
                    <Edit3 size={14} className="mr-1.5" /> Edit Profile
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopyProfileLink}
                    className="bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold text-xs rounded-xl h-10 px-3.5"
                  >
                    {copied ? <Check size={14} className="text-emerald-400 mr-1.5" /> : <Share2 size={14} className="mr-1.5" />}
                    {copied ? "Copied!" : "Share"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate("/message")}
                    className="bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 font-bold text-xs rounded-xl h-10 px-3.5"
                  >
                    <MessageSquare size={14} className="mr-1.5" /> Message
                  </Button>
                </div>
              </div>

              {/* Name & Headline */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {data?.fullName || user?.displayName || "Skill Engine Engineer"}
                  </h1>
                  
                  <Badge variant="default" className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-extrabold text-[11px] px-3 py-0.5">
                    <ShieldCheck size={13} className="mr-1 text-indigo-400" />
                    {data?.role || "Software Developer"}
                  </Badge>

                  {canCreateCourse && (
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-extrabold text-[11px] px-3 py-0.5">
                      <Sparkles size={13} className="mr-1 text-emerald-400" />
                      Course Creator Eligible
                    </Badge>
                  )}

                  {data?.username && (
                    <span className="text-xs font-semibold text-slate-400 font-mono">
                      @{data.username}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-indigo-300/90 leading-snug">
                  {data?.headline || `${data?.role || "Developer"} · ${data?.education || "Tech Enthusiast"}`}
                </p>

                <p className="text-xs sm:text-sm text-slate-300/90 font-medium max-w-3xl leading-relaxed">
                  {data?.bio || "Passionate software developer focused on web engineering, system design, collaborative development, and continuous technical growth."}
                </p>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-y-2.5 gap-x-6 text-xs text-slate-400 font-medium pt-3 border-t border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={15} className="text-indigo-400" />
                    {data?.education || "Computer Science"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-indigo-400" />
                    {data?.location || "Global"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-amber-400" />
                    {userCertificates.length} Certified License{userCertificates.length !== 1 ? "s" : ""}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-indigo-400" />
                    Joined {new Date(data?.createdAt || Date.now()).getFullYear()}
                  </span>

                  {data?.website && (
                    <a
                      href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-indigo-400 hover:underline font-semibold"
                    >
                      <Globe size={15} /> Website <ExternalLink size={11} />
                    </a>
                  )}

                  {data?.github && (
                    <a
                      href={data.github.startsWith("http") ? data.github : `https://${data.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold"
                    >
                      <Github size={15} /> GitHub <ExternalLink size={11} />
                    </a>
                  )}

                  {data?.linkedin && (
                    <a
                      href={data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sky-400 hover:underline font-semibold"
                    >
                      <Linkedin size={15} /> LinkedIn <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ─── 2. ENTERPRISE METRICS CARDS ROW ───────────────────────────────── */}
        <section aria-label="Platform Statistics" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 p-4.5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-indigo-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Projects</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FolderGit2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {userProjects.length}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Portfolio builds showcase</p>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 p-4.5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-amber-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Certificates</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Award size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                {userCertificates.length}
                <span className="text-xs font-semibold text-emerald-400">({certStats.verified} Verified)</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Licenses & Credentials</p>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 p-4.5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Skills Matrix</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Code size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {(data?.teachSkills?.length || 0) + (data?.learnSkills?.length || 0) + certStats.skillsCount}
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                {data?.teachSkills?.length || 0} Teach · {certStats.skillsCount} Certified
              </p>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 p-4.5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-purple-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Peer Rating</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Star size={16} className="fill-purple-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-1.5">
                {ratingsSummary.averageRating}
                <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {ratingsSummary.totalRatings} peer reviews
              </p>
            </Card>
          </motion.div>
        </section>

        {/* ─── 3. MAIN WORKSPACE GRID (8 COLS LEFT, 4 COLS RIGHT) ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN WORKSPACE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Animated Tab Selector Bar */}
            <div className="flex gap-1.5 p-1.5 rounded-2xl bg-[#0b101d] border border-slate-800/90 overflow-x-auto shadow-md">
              {[
                { id: "overview", label: "Overview & About", icon: User },
                { id: "certificates", label: `Certificates (${userCertificates.length})`, icon: Award },
                { id: "skills", label: "Skills Matrix", icon: Code },
                { id: "projects", label: "Projects", icon: FolderGit2 },
                { id: "learning", label: "Learning & Courses", icon: GraduationCap },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & ABOUT */}
            {activeTab === "overview" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-6 shadow-xl">
                  <CardHeader className="p-0 mb-4 bg-transparent border-none">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <FileText size={18} className="text-indigo-400" />
                      About & Professional Summary
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0 space-y-5">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                      {data?.bio || "No summary provided. Edit your profile to detail your software engineering background."}
                    </p>

                    <Separator className="my-4 bg-slate-800/80" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Current Primary Focus
                        </span>
                        <p className="text-xs font-bold text-indigo-300">
                          {data?.teachSkills?.[0] ? `Building with ${data.teachSkills[0]}` : "Full-Stack Software Development"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Growth Target
                        </span>
                        <p className="text-xs font-bold text-purple-300">
                          {data?.learnSkills?.[0] ? `Learning ${data.learnSkills[0]}` : "System Architecture"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* TAB 2: CERTIFICATES SECTION */}
            {activeTab === "certificates" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Certificate Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award size={18} className="text-amber-400" />
                      Licenses & Certifications
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Verified credentials, technical licenses, and earned course certificates.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => { setModalTab("certificates"); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl self-start sm:self-auto"
                  >
                    <Plus size={14} className="mr-1" /> Add Certificate
                  </Button>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0b101d] border border-slate-800/90 p-3 rounded-2xl shadow-xl">
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={certSearch}
                      onChange={(e) => setCertSearch(e.target.value)}
                      placeholder="Search certificates by name, organization, or skill..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={14} className="text-slate-400 shrink-0" />
                    <select
                      value={certFilter}
                      onChange={(e) => setCertFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Certificates ({userCertificates.length})</option>
                      <option value="verified">Verified Only ({certStats.verified})</option>
                      <option value="no-expire">Non-Expiring</option>
                    </select>
                  </div>
                </div>

                {/* Certificates Grid */}
                {filteredCertificates.length === 0 ? (
                  <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-10 text-center">
                    <Award size={40} className="mx-auto text-amber-400/50 mb-3" />
                    <h4 className="text-sm font-bold text-white">No certificates found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 font-medium">
                      {certSearch || certFilter !== "all"
                        ? "No certificate matches your current search/filter parameters."
                        : "Upload your professional certificates or credentials to boost your peer trust score and AI career recommendations."}
                    </p>
                    <Button
                      onClick={() => { setModalTab("certificates"); setIsModalOpen(true); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                    >
                      <Plus size={14} className="mr-1" /> Upload Your First Certificate
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredCertificates.map((cert) => {
                      const isVerified = Boolean(cert.credentialUrl);

                      return (
                        <Card
                          key={cert.id || cert.name}
                          className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-2xl p-5 shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between group"
                        >
                          <div className="space-y-3">
                            {/* Card Header & Verification Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                  {cert.fileType?.includes("pdf") ? <FileIcon size={18} /> : <Award size={18} />}
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                                    {cert.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-semibold">{cert.organization}</p>
                                </div>
                              </div>
                            </div>

                            {/* Verification Pill */}
                            <div>
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold">
                                  <CheckCircle2 size={12} /> Verified Credential
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-semibold">
                                  <Info size={12} /> Credential Not Available
                                </span>
                              )}
                            </div>

                            {/* Dates & Credential ID */}
                            <div className="space-y-1 text-[11px] text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-slate-500" />
                                <span>Issued: {cert.issueDate}</span>
                                {cert.doesNotExpire ? (
                                  <span className="text-emerald-400 font-bold ml-1">· No Expiration</span>
                                ) : cert.expiryDate ? (
                                  <span className="text-slate-500 ml-1">· Expires: {cert.expiryDate}</span>
                                ) : null}
                              </div>

                              {cert.credentialId && (
                                <p className="font-mono text-[10px] text-slate-400">
                                  ID: <strong className="text-slate-300">{cert.credentialId}</strong>
                                </p>
                              )}
                            </div>

                            {/* Skills Badges */}
                            {cert.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {cert.skills.map((skill) => (
                                  <span key={skill} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {cert.description && (
                              <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">
                                {cert.description}
                              </p>
                            )}
                          </div>

                          {/* Action Footer */}
                          <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold gap-2">
                            <div className="flex items-center gap-2">
                              {isVerified && (
                                <a
                                  href={cert.credentialUrl.startsWith("http") ? cert.credentialUrl : `https://${cert.credentialUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  <ExternalLink size={12} /> View Credential
                                </a>
                              )}

                              {cert.fileUrl && (
                                <a
                                  href={cert.fileUrl}
                                  download={`${cert.name}.png`}
                                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                                >
                                  <Download size={12} /> File
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditCertInit(cert)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                                title="Edit Certificate"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCert(cert.id)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Delete Certificate"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: SKILLS MATRIX */}
            {activeTab === "skills" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-6 shadow-xl">
                  <CardHeader className="p-0 mb-6 bg-transparent border-none">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Code size={18} className="text-indigo-400" />
                      Categorized Technical Skill Matrix
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Grouped by technical domain based on your actual experience and learning goals.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 space-y-6">
                    {Object.entries(categorizedSkills).map(([catName, skills]) => {
                      const meta = CATEGORIES[catName] || CATEGORIES["Tools & Architecture"];
                      const CatIcon = meta.icon;

                      return (
                        <div key={catName} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${meta.color} ${meta.textColor}`}>
                              <CatIcon size={14} />
                            </div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                              {catName} ({skills.length})
                            </h4>
                          </div>

                          {skills.length === 0 ? (
                            <p className="text-xs text-slate-500 italic pl-3">No skills listed in this category.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2.5">
                              {skills.map((item, idx) => (
                                <motion.div
                                  key={idx}
                                  whileHover={{ scale: 1.04, y: -2 }}
                                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                                    item.type === "teach"
                                      ? "bg-slate-950 border-indigo-500/30 text-indigo-200 hover:border-indigo-500"
                                      : "bg-slate-950 border-purple-500/30 text-purple-200 hover:border-purple-500"
                                  }`}
                                >
                                  <span>{item.name}</span>
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                      item.type === "teach"
                                        ? "bg-indigo-500/20 text-indigo-300"
                                        : "bg-purple-500/20 text-purple-300"
                                    }`}
                                  >
                                    {item.type === "teach" ? "Expertise" : "Goal"}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* TAB 4: PROJECTS */}
            {activeTab === "projects" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FolderGit2 size={18} className="text-indigo-400" />
                    Featured Portfolio Projects
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => { setModalTab("projects"); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                  >
                    <Plus size={14} className="mr-1" /> Add Project
                  </Button>
                </div>

                {userProjects.length === 0 ? (
                  <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-10 text-center">
                    <FolderGit2 size={36} className="mx-auto text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-white">No projects added yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 font-medium">
                      Showcase your work to potential collaborators. Click 'Add Project' to list your GitHub repositories and live demos.
                    </p>
                    <Button onClick={() => { setModalTab("projects"); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl">
                      Add Your First Project
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userProjects.map((project) => (
                      <Card key={project.id || project.title} className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-2xl p-5 shadow-xl hover:border-indigo-500/40 transition-all group">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{project.title}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-3 line-clamp-2">
                          {project.description || "Production web application built with modern architecture."}
                        </p>

                        {(Array.isArray(project.techStack)
                          ? project.techStack.length > 0
                          : Boolean(project.techStack)) && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {(Array.isArray(project.techStack)
                              ? project.techStack
                              : String(project.techStack).split(/[,/|;\n]+/)
                            ).map((tech) => (
                              <span key={tech} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                                {typeof tech === "string" ? tech.trim() : tech}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-3 border-t border-slate-800/80 text-xs font-bold">
                          {project.githubUrl && (
                            <a href={project.githubUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1">
                              <Github size={13} /> Code
                            </a>
                          )}
                          {project.demoUrl && (
                            <a href={project.demoUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                              <ExternalLink size={13} /> Live Demo
                            </a>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: LEARNING & COURSES */}
            {activeTab === "learning" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Active Synced Career Roadmap */}
                {data?.activeRoadmap && (
                  <Card className="bg-[#0b101d] border-emerald-500/30 text-slate-100 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <CardHeader className="p-0 mb-4 bg-transparent border-none flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Route size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <span>Active Career Roadmap</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              AI Synced
                            </span>
                          </CardTitle>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Target Goal: <span className="text-slate-200 font-medium">{data.activeRoadmap.goal}</span>
                          </p>
                        </div>
                      </div>
                      <NavLink
                        to="/ai-advisor"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition"
                      >
                        <Sparkles size={13} />
                        <span>AI Advisor</span>
                      </NavLink>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3 pt-2">
                      {Array.isArray(data.activeRoadmap.roadmap) && data.activeRoadmap.roadmap.map((step, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                                {step.phase || `Phase ${idx + 1}`}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-0.5">{step.focus}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              {step.action || step.whyNow}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Enrolled (Purchased) Courses */}
                <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-6 shadow-xl">
                  <CardHeader className="p-0 mb-4 bg-transparent border-none">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <GraduationCap size={18} className="text-purple-400" />
                      My Enrolled Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {enrolledCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-xs font-bold text-white">No enrolled courses yet</p>
                        <p className="text-xs text-slate-400 mt-1 mb-3">Browse the marketplace and enroll in a course to start learning.</p>
                        <NavLink to="/courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:underline">
                          Explore Courses Marketplace <ArrowRight size={13} />
                        </NavLink>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {enrolledCourses.map((c) => (
                          <div key={c._id} className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center gap-4">
                            {c.thumbnailUrl && (
                              <img src={c.thumbnailUrl} alt={c.title} className="w-14 h-12 rounded-xl object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{c.title}</h4>
                              <p className="text-[11px] text-slate-400 font-medium">
                                Topic: {c.topic}
                                {c.enrolledAt && (
                                  <> · Enrolled {new Date(c.enrolledAt).toLocaleDateString()}</>
                                )}
                              </p>
                            </div>
                            <NavLink
                              to={`/courses/${c._id}`}
                              className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all"
                            >
                              View Course
                            </NavLink>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Courses Created as Instructor */}
                {userCourses.length > 0 && (
                  <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-6 shadow-xl">
                    <CardHeader className="p-0 mb-4 bg-transparent border-none">
                      <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <BookOpen size={18} className="text-indigo-400" />
                        Courses I Created
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                      {userCourses.map((c) => (
                        <div key={c._id} className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white">{c.title}</h4>
                            <p className="text-[11px] text-slate-400 font-medium">Topic: {c.topic} · Price: {formatBDT(c.price)}</p>
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

              </motion.div>
            )}

          </div>

          {/* RIGHT SIDEBAR (4 COLS) */}
          <aside aria-label="Sidebar Widgets" className="lg:col-span-4 space-y-6">
            
            {/* ─── PROFILE COMPLETION RING CARD ─────────────────────────────────── */}
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <CompletionRing percentage={completion.completion} />
                <div>
                  <h3 className="text-sm font-bold text-white">Profile Readiness</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {completion.remainingItems === 0 ? "Profile 100% complete!" : `${completion.remainingItems} item(s) remaining`}
                  </p>
                </div>
              </div>

              {completion.remainingItems === 0 ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Maximum profile trust score achieved!
                </div>
              ) : (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                    Actionable Improvements:
                  </span>
                  {completion.missingItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>+ Add {item.title}</span>
                        <span className="text-indigo-400 text-[10px]">+{item.points}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        {item.why || item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ─── AI CAREER RADAR ─────────────────────────────────────────────── */}
            <Card className="bg-gradient-to-br from-indigo-950/70 via-[#0b101d] to-purple-950/50 border-indigo-500/30 text-slate-100 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-extrabold uppercase tracking-wider">
                  <Sparkles size={14} className="animate-pulse" />
                  AI Career Intelligence
                </div>
                <NavLink to="/ai-advisor" className="text-[10px] font-extrabold text-indigo-300 hover:underline">
                  Full Workspace →
                </NavLink>
              </div>

              <p className="text-xs font-medium text-slate-200 leading-relaxed mb-3">
                {intel.summary}
              </p>

              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Target Vector:</span>
                  <span className="text-indigo-300 font-bold">{intel.inferredGoal}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Readiness Rating:</span>
                  <span className="text-emerald-400 font-bold">{intel.readiness.overall.score}%</span>
                </div>
              </div>
            </Card>

            {/* ─── QUICK ACTIONS ───────────────────────────────────────────────── */}
            <Card className="bg-[#0b101d] border-slate-800/90 text-slate-100 rounded-3xl p-5 shadow-xl">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Quick Actions
              </h4>
              <div className="space-y-2">
                {canCreateCourse && (
                  <Button
                    onClick={() => navigate("/studio/courses")}
                    className="w-full justify-start bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold h-10 rounded-xl shadow-md shadow-indigo-600/25"
                  >
                    <PlusCircle size={14} className="mr-2" /> Creator Studio & Courses
                  </Button>
                )}
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="outline"
                  className="w-full justify-start bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 text-xs font-bold h-10 rounded-xl"
                >
                  <Edit3 size={14} className="mr-2 text-indigo-400" /> Edit Profile & Skills
                </Button>
                <Button
                  onClick={() => navigate("/ai-advisor")}
                  variant="outline"
                  className="w-full justify-start bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 text-xs font-bold h-10 rounded-xl"
                >
                  <Sparkles size={14} className="mr-2 text-purple-400" /> Open AI Career Coach
                </Button>
                <Button
                  onClick={() => navigate("/experts")}
                  variant="outline"
                  className="w-full justify-start bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 text-xs font-bold h-10 rounded-xl"
                >
                  <User size={14} className="mr-2 text-emerald-400" /> Find Mentors & Partners
                </Button>
              </div>
            </Card>

          </aside>
        </div>
      </main>

      {/* ─── 4. EDIT PROFILE MODAL (MULTI-TAB DIALOG) ─────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col z-10 text-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0 sticky top-0 z-20">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit3 size={18} className="text-indigo-400" /> Edit Professional Profile
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Manage basic details, avatar photo, certificates, social links, skills, and portfolio
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Tabs Header */}
              <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 overflow-x-auto shrink-0">
                {[
                  { id: "basic", label: "Basic Details", icon: User },
                  { id: "photo", label: "Profile Photo", icon: Camera },
                  { id: "certificates", label: `Certificates (${userCertificates.length})`, icon: Award },
                  { id: "links", label: "Social Links", icon: LinkIcon },
                  { id: "skills", label: "Skills & Level", icon: Code },
                  { id: "projects", label: "Projects Portfolio", icon: FolderGit2 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id)}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                      modalTab === tab.id
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* TAB: BASIC DETAILS */}
                {modalTab === "basic" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Full Name</label>
                        <input
                          {...register("fullName")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Username</label>
                        <input
                          {...register("username")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="johndoe_dev"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Headline</label>
                      <input
                        {...register("headline")}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="Full-Stack Engineer | React, Node.js, AI Enthusiast"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">About Summary / Bio</label>
                      <textarea
                        {...register("bio")}
                        rows={3}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white outline-none focus:border-indigo-500 transition-all resize-none"
                        placeholder="Detail your engineering background and goals..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Current Role</label>
                        <input
                          {...register("role")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Education</label>
                        <input
                          {...register("education")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="B.Sc Computer Science"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Location</label>
                        <input
                          {...register("location")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="San Francisco, CA"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: PROFILE PHOTO */}
                {modalTab === "photo" && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <Avatar className="h-28 w-28 ring-4 ring-indigo-500/30">
                        <AvatarImage src={photoPreview || watchProfileImage || data?.profileImage || user?.photoURL} />
                        <AvatarFallback className="bg-indigo-600 font-extrabold text-white text-xl">
                          {data?.fullName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <h4 className="text-sm font-bold text-white">Profile Photo Preview</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                          Supported formats: <strong className="text-slate-200">JPG, PNG, WEBP</strong>. Max size: <strong className="text-slate-200">5MB</strong>.
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-3.5"
                          >
                            <Upload size={13} className="mr-1.5" />
                            {uploadingPhoto ? "Processing..." : "Upload Local Photo"}
                          </Button>

                          {photoPreview && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemovePhoto}
                              className="bg-slate-900 hover:bg-rose-500/20 text-rose-400 border-slate-800 hover:border-rose-500/40 font-bold text-xs rounded-xl h-9 px-3"
                            >
                              <Trash2 size={13} className="mr-1.5" /> Remove Photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Or Paste Direct Photo Image URL</label>
                      <input
                        {...register("profileImage")}
                        value={watchProfileImage}
                        onChange={(e) => {
                          setValue("profileImage", e.target.value);
                          setPhotoPreview(e.target.value);
                        }}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                )}

                {/* TAB: CERTIFICATES MANAGEMENT */}
                {modalTab === "certificates" && (
                  <div className="space-y-6">
                    {/* Reorder / List existing certificates */}
                    {userCertificates.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-slate-300 block">Existing Certificates ({userCertificates.length})</span>
                        {userCertificates.map((cert, index) => (
                          <div key={cert.id || index} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-extrabold text-amber-400">{index + 1}.</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">{cert.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {cert.organization} · {cert.issueDate} {cert.credentialUrl ? "· (Verified)" : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleReorderCert(cert.id, "up")}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                title="Move Up"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorderCert(cert.id, "down")}
                                disabled={index === userCertificates.length - 1}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                title="Move Down"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditCertInit(cert)}
                                className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCert(cert.id)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add / Edit Form */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Award size={15} className="text-amber-400" />
                          {editingCertId ? "Edit Certificate" : "Add New Certificate"}
                        </span>

                        {editingCertId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCertId(null);
                              setNewCert({
                                id: "",
                                name: "",
                                organization: "",
                                credentialId: "",
                                credentialUrl: "",
                                issueDate: new Date().toISOString().split("T")[0],
                                expiryDate: "",
                                doesNotExpire: true,
                                skills: "",
                                description: "",
                                fileUrl: "",
                                fileType: "",
                              });
                            }}
                            className="text-[10px] font-bold text-rose-400 hover:underline"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      {/* OCR File Upload Dropzone */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-dashed border-slate-700 text-center space-y-3 relative overflow-hidden">
                        <input
                          ref={certFileInputRef}
                          type="file"
                          accept=".pdf,image/jpeg,image/jpg,image/png,image/webp,text/plain"
                          onChange={handleCertFileUpload}
                          className="hidden"
                        />

                        {extractingCert ? (
                          <div className="py-4 space-y-2">
                            <LoadingSpinner size="md" label="Uploading to Cloudinary CDN & parsing metadata..." />
                          </div>
                        ) : newCert.fileUrl ? (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 size={14} /> File Ready / Preview
                              </span>
                              <button
                                type="button"
                                onClick={() => setNewCert((prev) => ({ ...prev, fileUrl: "", public_id: null }))}
                                className="text-rose-400 hover:underline text-[11px]"
                              >
                                Remove File
                              </button>
                            </div>

                            {newCert.fileType?.includes("pdf") || newCert.fileUrl.includes(".pdf") ? (
                              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                                  <FileIcon size={18} />
                                  <span>PDF Document Ready</span>
                                </div>
                                <a
                                  href={newCert.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink size={12} /> Open PDF
                                </a>
                              </div>
                            ) : (
                              <div className="relative rounded-lg overflow-hidden border border-slate-800">
                                <img
                                  src={newCert.fileUrl}
                                  alt="Certificate Preview"
                                  className="max-h-40 mx-auto object-contain rounded-lg"
                                />
                              </div>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => certFileInputRef.current?.click()}
                              className="bg-slate-900 border-slate-700 text-slate-300 font-bold text-[11px] h-7 px-2.5 rounded-lg mt-2"
                            >
                              Replace File
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className="mx-auto text-amber-400/80" />
                            <div>
                              <p className="text-xs font-bold text-white">Upload Certificate File (PDF / JPG / PNG / WEBP)</p>
                              <p className="text-[10px] text-slate-400">
                                Uploads directly to secure Cloudinary CDN & pre-fills fields via text extraction. Max: 5MB.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => certFileInputRef.current?.click()}
                              className="bg-slate-950 border-slate-700 text-amber-300 font-bold text-xs h-8 px-3 rounded-lg"
                            >
                              Select Certificate File
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Certificate Name *</label>
                          <input
                            value={newCert.name}
                            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                            placeholder="e.g. AWS Certified Solutions Architect"
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Issuing Organization *</label>
                          <input
                            value={newCert.organization}
                            onChange={(e) => setNewCert({ ...newCert, organization: e.target.value })}
                            placeholder="e.g. Amazon Web Services, Coursera, Meta"
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Credential ID (Optional)</label>
                          <input
                            value={newCert.credentialId}
                            onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                            placeholder="e.g. AWS-839201"
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Credential URL (Verification Link)</label>
                          <input
                            value={newCert.credentialUrl}
                            onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                            placeholder="https://credly.com/certs/..."
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Issue Date *</label>
                          <input
                            type="date"
                            value={newCert.issueDate}
                            onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Expiration Date</label>
                          <input
                            type="date"
                            disabled={newCert.doesNotExpire}
                            value={newCert.expiryDate}
                            onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="noExpire"
                          checked={newCert.doesNotExpire}
                          onChange={(e) => setNewCert({ ...newCert, doesNotExpire: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-800"
                        />
                        <label htmlFor="noExpire" className="text-xs text-slate-300 font-medium">This certificate does not expire</label>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Skills Related to Certificate (comma separated)</label>
                        <input
                          value={newCert.skills}
                          onChange={(e) => setNewCert({ ...newCert, skills: e.target.value })}
                          placeholder="AWS, Cloud, System Design, DevOps"
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Description (Optional)</label>
                        <textarea
                          rows={2}
                          value={newCert.description}
                          onChange={(e) => setNewCert({ ...newCert, description: e.target.value })}
                          placeholder="Details about curriculum covered or specialized focus..."
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-white outline-none resize-none"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleSaveCertificate}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 rounded-xl"
                      >
                        {editingCertId ? "Save Certificate Edits" : "Save Certificate Entry"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* TAB: SOCIAL LINKS */}
                {modalTab === "links" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Add your web links to increase trust scores with collaborators.</p>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">GitHub Profile URL</label>
                      <input
                        {...register("github")}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">LinkedIn Profile URL</label>
                      <input
                        {...register("linkedin")}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="https://linkedin.com/in/yourusername"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Personal Portfolio Website</label>
                      <input
                        {...register("website")}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        placeholder="https://myportfolio.dev"
                      />
                    </div>
                  </div>
                )}

                {/* TAB: SKILLS & LEVEL */}
                {modalTab === "skills" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Teach Skills (comma separated)</label>
                        <textarea
                          {...register("teachSkills")}
                          rows={4}
                          value={teachSkillsValue}
                          onChange={(e) => setValue("teachSkills", e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white outline-none focus:border-indigo-500 transition-all resize-none"
                          placeholder="React, Node.js, MongoDB, JavaScript"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Learn Skills (comma separated)</label>
                        <textarea
                          {...register("learnSkills")}
                          rows={4}
                          value={learnSkillsValue}
                          onChange={(e) => setValue("learnSkills", e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white outline-none focus:border-indigo-500 transition-all resize-none"
                          placeholder="TypeScript, Docker, AWS, System Design"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Teach Level</label>
                        <select
                          {...register("teachLevel")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Learn Goal Level</label>
                        <select
                          {...register("learnLevel")}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
                        >
                          <option value="Newbie">Newbie</option>
                          <option value="Growth">Growth</option>
                          <option value="Mastery">Mastery</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: PROJECTS PORTFOLIO */}
                {modalTab === "projects" && (
                  <div className="space-y-4">
                    {userProjects.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 block">Existing Portfolio Items:</span>
                        {userProjects.map((p) => (
                          <div key={p.id || p.title} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">{p.title}</p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {Array.isArray(p.techStack)
                                  ? p.techStack.join(", ")
                                  : p.techStack || "No stack specified"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProject(p.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                              title="Remove project"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-white block">Add New Project</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          placeholder="Project Title"
                          className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                        />
                        <input
                          value={newProject.techStack}
                          onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value })}
                          placeholder="Tech Stack (comma separated)"
                          className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <input
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        placeholder="Short Description"
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={newProject.githubUrl}
                          onChange={(e) => setNewProject({ ...newProject, githubUrl: e.target.value })}
                          placeholder="GitHub Code URL"
                          className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                        />
                        <input
                          value={newProject.demoUrl}
                          onChange={(e) => setNewProject({ ...newProject, demoUrl: e.target.value })}
                          placeholder="Live Demo URL"
                          className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddProject}
                        variant="outline"
                        className="w-full bg-slate-900 hover:bg-slate-800 border-slate-700 text-indigo-300 text-xs font-bold h-9 rounded-xl"
                      >
                        <Plus size={14} className="mr-1" /> Add Project to Portfolio
                      </Button>
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-950 border-slate-800 text-slate-300 font-bold text-xs rounded-xl h-10 px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-10 px-6 shadow-lg shadow-indigo-600/20"
                  >
                    {updating ? "Saving Changes..." : "Save Profile Updates"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyProfile;
