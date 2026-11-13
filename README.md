# Collaborative Skill Engine (CSE)

<p align="center">
  <strong>Connect. Learn. Teach. Grow.</strong>
</p>

<p align="center">
  A full‑stack platform connecting users for skill sharing, mentorship, course creation, AI career advising, and real‑time collaboration.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" alt="Vite 7">
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express 5">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb" alt="MongoDB Atlas">
  <img src="https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io" alt="Socket.io 4">
  <img src="https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase" alt="Firebase Auth">
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary" alt="Cloudinary">
  <img src="https://img.shields.io/badge/Tailwind-CSS_v4-06B6D4?logo=tailwindcss" alt="Tailwind CSS v4">
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain" alt="LangChain">
  <img src="https://img.shields.io/badge/Groq-LLM-f97316?logo=groq" alt="Groq LLM">
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License ISC">
</p>

---

## Table of Contents

- [Overview](#2-overview)
- [Screenshots](#3-screenshots)
- [Live Demo](#4-live-demo)
- [Features](#5-features)
- [Tech Stack](#6-tech-stack)
- [System Architecture](#7-system-architecture)
- [Folder Structure](#8-folder-structure)
- [Database Architecture](#9-database-architecture)
- [API Documentation](#10-api-documentation)
- [Authentication Flow](#11-authentication-flow)
- [Authorization](#12-authorization)
- [Project Architecture](#13-project-architecture)
- [State Management](#14-state-management)
- [Security](#15-security)
- [Performance Optimizations](#16-performance-optimizations)
- [Installation](#17-installation)
- [Environment Variables](#18-environment-variables)
- [Deployment](#19-deployment)
- [Development Workflow](#20-development-workflow)
- [Future Improvements](#21-future-improvements)
- [Troubleshooting](#22-troubleshooting)
- [FAQ](#23-faq)
- [Contributing](#24-contributing-guide)
- [License](#25-license)
- [Credits](#26-credits)

---

## 1. Project Banner

# 🚀 Collaborative Skill Engine

**Connect. Learn. Teach. Grow.**

A full‑stack, AI‑powered skill‑sharing ecosystem that connects learners, mentors, and instructors under one platform with real‑time messaging, course marketplace, and intelligent career guidance.

---

## 2. Overview

**Collaborative Skill Engine (CSE)** is a modern web application that transforms how people share knowledge and develop skills. It bridges the gap between those who want to learn and those who can teach by providing a unified platform for mentorship, courses, peer networking, and AI‑powered career advising.

**Why it exists:** Traditional learning platforms are one‑directional (consumers consume, creators create). CSE breaks this mold by letting every user simultaneously learn and teach, building a collaborative economy around skills.

**Main objective:** To become the definitive platform for peer‑to‑peer skill development, combining structured courses, one‑on‑one mentorship, real‑time collaboration, and intelligent career guidance.

**Target users:**
- **Learners** — individuals seeking to acquire or improve skills
- **Instructors / Mentors** — professionals who want to share their expertise and earn revenue
- **Administrators** — platform operators managing users, courses, and revenue

**Business value:**
- Revenue sharing (15% platform commission, 85% instructor earnings)
- Scalable course marketplace with approval workflow
- Integrated AI advisor reduces churn by providing instant career guidance
- Real‑time scheduling for mentorship sessions with video call support

---

## 3. Screenshots

<!-- Replace placeholder URLs with actual screenshots -->

| Page | Preview |
|---|---|
| **Landing Page** | ![Landing](https://via.placeholder.com/800x450?text=Landing+Page) |
| **Dashboard** | ![Dashboard](https://via.placeholder.com/800x450?text=Dashboard) |
| **Studio (Creator Workspace)** | ![Studio](https://via.placeholder.com/800x450?text=Studio) |
| **Profile** | ![Profile](https://via.placeholder.com/800x450?text=Profile) |
| **Admin Panel** | ![Admin](https://via.placeholder.com/800x450?text=Admin+Panel) |
| **Course Marketplace** | ![Courses](https://via.placeholder.com/800x450?text=Course+Marketplace) |
| **AI Advisor** | ![AI Advisor](https://via.placeholder.com/800x450?text=AI+Advisor) |
| **Messaging** | ![Messages](https://via.placeholder.com/800x450?text=Messaging) |
| **Mobile View** | ![Mobile](https://via.placeholder.com/300x600?text=Mobile+View) |

---

## 4. Live Demo

| Resource | URL |
|---|---|
| **Frontend (Production)** | [collaborative-skill-engine-client.vercel.app](https://collaborative-skill-engine-client.vercel.app) |
| **Backend API (Production)** | [collaborative-skill-engine-server-production.up.railway.app](https://collaborative-skill-engine-server-production.up.railway.app) |
| **Frontend (Local)** | `http://localhost:5173` (development) |
| **Backend API (Local)** | `http://localhost:3000` (development) |
| **Admin Panel** | `/admin/login` after starting frontend |
| **Health Check** | `GET /health` |
| **API Stats** | `GET /api/stats` |

---

## 5. Features

### 🔐 Authentication
- Firebase email/password registration and login
- Google OAuth single sign‑on (popup)
- Custom JWT exchange (`POST /auth/token` with Firebase ID token)
- Token‑based session with 7‑day expiry
- Automatic token refresh on 401 via Axios interceptor
- Account deactivation check at token exchange
- Admin‑only JWT authentication (httpOnly cookie)
- Rate‑limited admin login (5 attempts / 15 minutes)

### 👤 User Profile
- Full profile management (name, headline, bio, location, education)
- Skill management — teach skills and learn skills with levels
- Profile image upload with Canvas‑based compression (≤800px JPEG)
- Cloudinary signed upload flow (server‑side signature)
- Certificate upload (image/PDF to Cloudinary)
- Project portfolio management
- Social links (GitHub, LinkedIn, website, portfolio)
- 8‑criteria profile completion scoring (50% threshold for course creation)
- Cache‑busted profile images via `updatedAt` timestamp

### 🤝 Networking & Social
- **Find Partners Hub** — discover collaborators
- **Mentor Discovery** — search, filter, and sort mentors by skills
- **Expert Detail** — full mentor profile with skills, projects, certifications, reviews
- **Connection Requests** — send, accept, reject, cancel
- **Connection Management** — view network, see connection status
- **User Rating System** — rate connected users (1–5 stars with review)
- **Fuse.js Mentor Matching** — fuzzy search matching learnSkills × teachSkills

### 💬 Real‑time Messaging
- Socket.io instant messaging (WebSocket transport)
- Per‑conversation rooms with membership enforcement
- Message send, edit, delete, and seen receipts
- Image sharing in chat (base64, ≤2MB)
- Typing indicators
- Presence tracking (online/offline status)
- Conversation list with unread counts
- Floating chat widget across the platform

### 📅 Scheduling & Video Calls
- Schedule mentorship sessions within conversations
- Accept / reject scheduling invitations
- Automatic schedule expiry detection (30‑second scan interval)
- 10‑minute pre‑session activation notification
- WebRTC video call signalling overlay (`rtc:offer`, `rtc:answer`, `rtc:ice-candidate`, `rtc:end`)
- Schedule status lifecycle: `pending` → `accepted` → `expired`

### 🎓 Course Marketplace
- **Public course browsing** — view approved courses marketplace
- **Course detail** — full course page with description, price, curriculum
- **Enrollment** — one‑click enrollment with commission tracking
- **Course lifecycle:** `draft` → `pending_review` → `approved` / `rejected`
- 15% platform commission on all enrollments
- Duplicate enrollment prevention (unique compound index)

### 🎬 Creator Studio
- **Eligibility gateway** — profile completion ≥50% or mentoring session or permanent access
- **Studio access state machine:** `locked` → `onboarding` → `celebration` → `studio`
- **Dashboard** — revenue charts (recharts AreaChart/BarChart), stat cards, course list
- **Analytics** — 6‑month revenue trend, top courses, category distribution, ratings
- **Course CRUD** — create, edit, submit for review
- **Lesson Builder** — rich text content, video links, PDF resources, assignments, quizzes
- **Student Management** — ban, unban, suspend, restore, refund with audit trail
- **Reviews** — view and reply to student course reviews
- **Coupons** — create discount coupons with expiry and usage limits
- **Audit Logs** — full instructor action history
- **Profile & Settings** — studio‑specific configuration

### 📊 Instructor Dashboard
- Enrolled students list grouped by course
- Earnings overview (total, per‑course, 6‑month monthly breakdown)
- Student status management (ban, unban, suspend, unsuspend, refund)

### 🛡️ Admin Panel
- **Overview** — platform stats (total users, approved courses, enrollments, revenue)
- **User Management** — search, paginate, deactivate / reactivate accounts
- **Course Approval** — approve or reject courses with rejection reason
- **Revenue Dashboard** — total revenue, per‑course breakdown, date filtering, 6‑month chart
- **Platform Notifications** — compose and broadcast to all users
- **Course Deletion** — permanent deletion with cascade (lessons + enrollments)

### 🤖 AI Career Advisor
- Groq LLM (`llama-3.1-8b-instant`) powered career guidance
- RAG (Retrieval‑Augmented Generation) with FAISS vector store
- 8 knowledge base documents (roadmaps, career guides, skill learning)
- Google Gemini as embedding provider (`text-embedding-004`)
- Structured JSON output: career direction, skill gap analysis, learning roadmap, project suggestions, mentor matches
- User memory context from platform chats and advisor history
- Mentor matching with match percentage scoring
- Keyword fallback when LLM/embedding provider unavailable
- Historical advisor session retrieval

### 📄 CV / Resume Parsing
- Upload PDF, DOCX, or TXT files via multer
- Text extraction with `pdf-parse` and `mammoth`
- Groq LLM‑based skill extraction or keyword/alias fallback
- Fuzzy skill matching against 23 canonical platform skills
- Skill normalization (alias mapping)

### 🔔 Notification System
- **Platform‑wide broadcast** — notifications sent to all users (admin feature)
- **User notifications** — per‑recipient notifications with read/unread state
- **Real‑time delivery** — Socket.io `userNotification:new` events
- **Mark as read** — individual and bulk read status updates
- **Course status updates** — approval/rejection notifications to instructors
- **Lesson upload notifications** — enrolled learners notified when new video added
- **Connection updates** — real‑time notification on request send/accept/reject

### 📁 File & Image Handling
- **Client‑side validation** — type (JPEG/PNG/WEBP), size (≤5MB)
- **Canvas‑based compression** — resize to ≤800px longest side, JPEG quality 0.8
- **Server‑signed Cloudinary upload** — `POST /cloudinary/sign` returns SHA‑256 signature
- **Direct‑to‑CDN upload** — no file buffer passes through the application server
- **Cloudinary garbage collection** — old images deleted on profile update
- **Certificate upload** — images and PDFs to dedicated `certificates` Cloudinary folder
- **Cache busting** — `?v=timestamp` parameter appended to Cloudinary URLs

---

## 6. Tech Stack

### Frontend

| Category | Technology |
|---|---|
| **Framework** | React 19 (JSX, hooks, concurrent features) |
| **Build Tool** | Vite 7 |
| **Routing** | React Router 7 (createBrowserRouter, nested layouts) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| **Icons** | Lucide React + React Icons |
| **Animation** | Framer Motion 12, GSAP 3, AOS (Animate on Scroll) |
| **Charts** | Recharts 2 |
| **Forms** | React Hook Form 7 |
| **HTTP Client** | Axios (request/response interceptors, automatic JWT refresh) |
| **Auth (Client)** | Firebase SDK 12 (`firebase/auth`) |
| **Real‑time** | Socket.io Client 4 |
| **Markdown** | React Markdown 10 + remark-gfm |
| **Rich UI** | LottieFiles (dotLottie), SweetAlert2 |
| **PDF Parsing** | pdf‑parse (via server) |

### Backend

| Category | Technology |
|---|---|
| **Runtime** | Node.js (CommonJS modules) |
| **Framework** | Express 5 |
| **Database** | MongoDB 7 (native driver, no ODM) |
| **Real‑time** | Socket.io 4 (WebSocket transport) |
| **Auth (Server)** | Firebase Admin SDK 13, jsonwebtoken 9 |
| **AI / LLM** | LangChain.js, Groq (`llama-3.1-8b-instant`), Google Gemini |
| **Vector Store** | FAISS (`faiss-node`) |
| **File Upload** | Multer 2 (memory storage) |
| **Document Parsing** | pdf‑parse, mammoth |
| **Fuzzy Search** | Fuse.js 7 |
| **String Matching** | string‑similarity 4 |
| **Image Service** | Cloudinary SDK 2 |
| **Utilities** | cookie‑parser, dotenv, cors, crypto (built‑in) |

### Database

| Component | Details |
|---|---|
| **Database** | MongoDB Atlas (M10+ cluster) |
| **Driver** | Native MongoDB Node.js Driver v7 |
| **Database Name** | `skillEngineDB` |
| **Collections** | 13 collections (see [Database Architecture](#9-database-architecture)) |
| **Connection Pool** | maxPoolSize: 50, minPoolSize: 5 |
| **Timeouts** | connect: 30s, socket: 45s, server selection: 10s |

### Infrastructure & DevOps

| Category | Technology |
|---|---|
| **Auth Provider** | Firebase Authentication |
| **Image CDN** | Cloudinary |
| **AI LLM** | Groq Cloud |
| **Embeddings** | Google Generative AI (Gemini) |
| **Dev Server** | Nodemon (automatic restart) |

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (React SPA)                       │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Firebase │  │   Auth   │  │ Reactive │  │   Socket.io      │    │
│  │   Auth   │  │ Context  │  │   UI     │  │   Client         │    │
│  │ (SDK 12) │  │ (AuthCtx)│  │(Tailwind)│  │   (WebSocket)    │    │
│  └────┬─────┘  └──────────┘  └──────────┘  └────────┬─────────┘    │
│       │                                               │             │
└───────┼───────────────────────────────────────────────┼─────────────┘
        │                                               │
        │  Axios (REST)                                 │  Socket.io
        │  POST /auth/token                             │  Events
        │  GET/PATCH /users/:id                         │
        │  GET/POST /courses/*                          │
        │  etc.                                         │
        ▼                                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      API LAYER (Express 5)                           │
│                                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ Middleware  │  │   Routes     │  │   Socket.io Server            │ │
│  │            │  │              │  │                              │ │
│  │ verifyJWT  │  │ auth.routes  │  │  presence:join/leave         │ │
│  │ verifyAdmin│  │ courses.rts  │  │  message:send/edit/delete    │ │
│  │ verifyFBTok│  │ admin.routes │  │  conversation:join           │ │
│  │ CORS       │  │ studio.rts   │  │  message:seen                │ │
│  │ Body Parser│  │ dashboard.rts│  │  rtc:offer/answer/ice        │ │
│  │ CookiePar. │  │ aiAdvisor.rts│  │  connections:updated         │ │
│  │ Rate Limit │  │ cvParser.rts │  │  notification:new            │ │
│  │ (in-memory)│  │ notifs.rts   │  │  schedule:new/updated/expired│ │
│  └────────────┘  │ schedule.rts │  └──────────────────────────────┘ │
│                  └──────────────┘                                   │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER (Services)                    │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────────┐│
│  │  ai.service │  │ cvParser     │  │  profileCompletion.js        ││
│  │  (Groq LLM) │  │ .service     │  │  (8‑criteria scoring)        ││
│  └──────┬──────┘  └──────┬───────┘  └──────────────────────────────┘│
│         │                │                                          │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌──────────────────────────────┐│
│  │ vectorRetr. │  │ memory       │  │  mentorMatcher.service       ││
│  │ .service    │  │ .service     │  │  (Fuse.js)                   ││
│  │ (FAISS RAG) │  │              │  └──────────────────────────────┘│
│  └─────────────┘  └──────────────┘                                  │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER (MongoDB Atlas)                     │
│                                                                      │
│  skillEngineDB                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  user_list        │  conversations  │  messages               │    │
│  │  courses           │  lessons         │  course_enrollments   │    │
│  │  connection_requests │  user_ratings  │  schedules             │    │
│  │  notifications    │  user_notifications  │  ai_advisor_sessions│   │
│  │  course_reviews   │  course_coupons  │  studio_audit_logs     │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                 │
│                                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ Firebase   │  │  Cloudinary  │  │  Groq / Gemini (AI)          │ │
│  │ Auth +     │  │  Image CDN   │  │  LLM + Embeddings            │ │
│  │ Admin SDK  │  │  + Upload    │  └──────────────────────────────┘ │
│  └────────────┘  └──────────────┘                                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities:**

1. **Client Layer** — React SPA handles UI rendering, local state, Firebase auth, socket connections, and image compression. Direct Cloudinary upload avoids server file storage.

2. **API Layer** — Express 5 routes and middleware handle authentication, validation, authorization, and HTTP request routing. Socket.io manages real‑time bidirectional events.

3. **Business Logic Layer** — Services encapsulate AI advisor logic, CV parsing, vector retrieval, mentor matching, and profile completion scoring. Keeps route handlers thin.

4. **Data Layer** — MongoDB Atlas with native driver. Schema is enforced in application code (no Mongoose). Indexes are created programmatically on startup.

5. **External Services** — Firebase for authentication (client + server verification), Cloudinary for image hosting, Groq/Gemini for AI/embeddings.

---

## 8. Folder Structure

```
Collaboration-Skill-Engine/
│
├── cse-client/                        # Frontend — React 19 + Vite 7
│   ├── index.html                     # SPA entry point
│   ├── vite.config.js                 # Vite + Tailwind plugin + path alias
│   ├── eslint.config.js               # ESLint flat config
│   ├── src/
│   │   ├── main.jsx                   # React root with providers
│   │   ├── App.jsx                    # RouterProvider
│   │   ├── index.css                  # Tailwind v4 import + dark theme
│   │   ├── router/
│   │   │   └── router.jsx             # Full route tree (27+ routes)
│   │   ├── firebase/
│   │   │   └── firebase.init.js       # Firebase app initialization
│   │   ├── context/
│   │   │   ├── AuthContext/           # Auth state + session management
│   │   │   └── AdminContext/          # Admin auth state
│   │   ├── hooks/
│   │   │   └── useAuth.jsx            # Auth hook (consumer)
│   │   ├── lib/
│   │   │   ├── apiClient.js           # Axios + JWT interceptor + auto-refresh
│   │   │   ├── socket.js              # Socket.io client singleton
│   │   │   ├── profileApi.js          # Profile CRUD + Cloudinary upload + cache bust
│   │   │   ├── careerIntelligence.js  # Offline skill / career knowledge
│   │   │   ├── jwt.js                 # JWT localStorage helpers
│   │   │   └── profileCompletion.js   # Client-side completion calculator
│   │   ├── components/
│   │   │   ├── layout/                # RootLayout, AuthLayout
│   │   │   ├── shared/                # PrivateRoute, Navbar, Footer, etc.
│   │   │   ├── ui/                    # Design system (Button, Card, Dialog, Input, etc.)
│   │   │   ├── admin/                 # AdminRoute, StatCard, UserRow, CourseApprovalCard
│   │   │   ├── studio/                # Studio views and sub-components
│   │   │   ├── expert/                # Expert profile components
│   │   │   ├── courses/               # Course card and grid components
│   │   │   └── dashboard/             # Dashboard sidebar and panels
│   │   └── pages/
│   │       ├── Home/
│   │       ├── MyProfile/
│   │       ├── FindPartners/          # FindPartnersHub, Mentor/Expert
│   │       ├── Network/
│   │       ├── Message/
│   │       ├── Request/
│   │       ├── AiAdvisor/
│   │       ├── Courses/
│   │       ├── Studio/                # 10+ studio sub-pages
│   │       ├── Dashboard/
│   │       └── Admin/                 # Login, Overview, Users, Courses, Revenue
│   │
│   └── .env                           # Firebase + Cloudinary + API URL
│
├── cse-server/                        # Backend — Express 5 + MongoDB
│   ├── index.js                       # Entry point: server, IO, all routes
│   ├── middleware/
│   │   ├── verifyJWT.js               # Custom JWT verification (Bearer token)
│   │   ├── verifyFirebaseToken.js     # Firebase Admin ID token verification
│   │   ├── verifyAdminJWT.js          # Admin JWT from httpOnly cookie
│   │   └── verifyStudioAccess.js      # Thin wrapper around verifyJWT
│   ├── routes/
│   │   ├── auth.routes.js             # Firebase → custom JWT exchange
│   │   ├── admin.routes.js            # Admin login, CRUD, revenue, approvals
│   │   ├── courses.routes.js          # Course CRUD, enrollment, lessons
│   │   ├── studio.routes.js           # Studio access, analytics, students, etc.
│   │   ├── dashboard.routes.js        # Enrolled students, earnings, student actions
│   │   ├── aiAdvisor.routes.js        # AI advisor endpoints
│   │   ├── cvParser.routes.js         # Resume upload + parsing
│   │   ├── notifications.routes.js    # Platform broadcast
│   │   ├── schedule.routes.js         # Mentorship scheduling
│   │   └── userNotifications.routes.js# Per-user notification delivery
│   ├── services/
│   │   ├── ai.service.js              # Groq LLM + RAG + structured JSON output
│   │   ├── cvParser.service.js        # PDF/DOCX/TXT extraction + skill matching
│   │   ├── vectorRetrieval.service.js # FAISS vector store + embeddings
│   │   ├── memory.service.js          # User memory context builder
│   │   ├── knowledgeLoader.js         # Load markdown files for RAG
│   │   └── mentorMatcher.service.js   # Fuse.js fuzzy mentor matching
│   ├── controllers/
│   │   └── aiAdvisor.controller.js    # AI advisor request handler
│   ├── config/
│   │   └── firebaseAdmin.js           # Lazy Firebase Admin SDK singleton
│   ├── utils/
│   │   ├── profileCompletion.js       # 8-criteria profile scoring (50% threshold)
│   │   ├── skillNormalize.js          # Skill string normalization
│   │   └── userLookup.js              # Email-based user lookup
│   ├── data/
│   │   ├── initialSkills.js           # 23 canonical skills
│   │   └── knowledge/                 # 8 markdown RAG knowledge files
│   └── .env.example                   # Documented environment variables
│
└── README.md                          # This file (you are here)
```

---

## 9. Database Architecture

### Collections

CSE uses MongoDB (`skillEngineDB`) with 13 collections. No ODM — schema is enforced in route handlers.

| # | Collection Name | Purpose | Key Indexes |
|---|---|---|---|
| 1 | `user_list` | User profiles, auth metadata, skills, connections | Unique on `email` |
| 2 | `connection_requests` | Pending connection requests | Compound unique: `{senderEmail, receiverEmail, status}` |
| 3 | `conversations` | Chat conversations with participants and unread counts | Unique on `participantsKey`, index on `participants` |
| 4 | `messages` | Individual chat messages | `{conversationId, createdAt}`, `{receiverEmail, seenAt}` |
| 5 | `user_ratings` | Star ratings (1–5) between connected users | Compound unique: `{reviewerEmail, targetEmail}` |
| 6 | `ai_advisor_sessions` | AI advisor conversation history | `{userEmail, createdAt}` |
| 7 | `notifications` | Platform‑wide broadcast notifications | — |
| 8 | `schedules` | Mentorship session scheduling | `{conversationId, status}`, `{startTime, status}` |
| 9 | `user_notifications` | Per‑user notification inbox | `{recipientEmail, createdAt}`, `{recipientEmail, isRead}` |
| 10 | `courses` | Course listings with lifecycle status | `{instructorEmail, status}`, `{status}` |
| 11 | `course_enrollments` | Student enrollment records with commission | Compound unique: `{courseId, learnerEmail}` |
| 12 | `lessons` | Course lesson content | `{courseId, order}` |
| 13 | `course_reviews` | Student reviews on courses | `{courseId, createdAt}` |
| 14 | `course_coupons` | Instructor‑created discount coupons | `{instructorEmail, code}` |
| 15 | `studio_audit_logs` | Instructor action history | — |

### Key Relationships

```
user_list (email) ──────────── 1:N ──── connection_requests (senderEmail / receiverEmail)
user_list (email) ──────────── 1:N ──── conversations (participants[])
user_list (email) ──────────── 1:N ──── messages (senderEmail / receiverEmail)
user_list (email) ──────────── 1:N ──── user_ratings (reviewerEmail / targetEmail)
user_list (email) ──────────── 1:N ──── courses (instructorEmail)
user_list (email) ──────────── 1:N ──── course_enrollments (learnerEmail / instructorEmail)
user_list (email) ──────────── 1:N ──── ai_advisor_sessions (userEmail)
user_list (email) ──────────── 1:N ──── user_notifications (recipientEmail)
courses (_id) ──────────────── 1:N ──── lessons (courseId)
courses (_id) ──────────────── 1:N ──── course_enrollments (courseId)
courses (_id) ──────────────── 1:N ──── course_reviews (courseId)
conversations (_id) ────────── 1:N ──── messages (conversationId)
conversations (_id) ────────── 1:N ──── schedules (conversationId)
```

### Data Flow Examples

**User connects with another user:**
1. Client sends `POST /connections/requests` with sender + receiver emails
2. Server validates both users exist, no duplicate pending request, not already connected
3. Inserts document into `connection_requests` with status `"pending"`
4. Receiver sees incoming request, can `accept` or `reject`
5. On accept: both users' `connections` arrays updated, request deleted
6. Socket.io event emitted to both users for real‑time UI update

**Course enrollment flow:**
1. Instructor creates course → status `"draft"`
2. Instructor submits for review → status `"pending_review"`
3. Admin approves → status `"approved"`, instructor notified
4. Learner enrolls → `course_enrollments` record created with commission (15%) and instructor earnings (85%)
5. Unique compound index prevents duplicate enrollment

---

## 10. API Documentation

### Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/token` | Firebase ID Token | Exchange Firebase token for custom JWT (7d) |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/admin-api/login` | Rate‑limited | Admin login, sets httpOnly cookie |
| `POST` | `/admin-api/logout` | Admin JWT | Clears admin cookie |
| `GET` | `/admin-api/overview` | Admin JWT | Platform stats (users, courses, revenue, charts) |
| `GET` | `/admin-api/users?page=&search=` | Admin JWT | Paginated user list with ratings & session counts |
| `PATCH` | `/admin-api/users/:id/deactivate` | Admin JWT | Deactivate a user account |
| `PATCH` | `/admin-api/users/:id/reactivate` | Admin JWT | Reactivate a user account |
| `GET` | `/admin-api/courses/pending` | Admin JWT | Courses pending review |
| `PATCH` | `/admin-api/courses/:id/approve` | Admin JWT | Approve a course |
| `PATCH` | `/admin-api/courses/:id/reject` | Admin JWT | Reject a course (with reason) |
| `GET` | `/admin-api/revenue?startDate=&endDate=` | Admin JWT | Revenue overview with per‑course breakdown |
| `GET` | `/admin-api/revenue/chart` | Admin JWT | 6‑month revenue chart data |
| `DELETE` | `/admin-api/courses/:id` | Admin JWT | Permanently delete course + lessons + enrollments |

### Courses

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/courses/eligibility` | JWT | Course creation eligibility (profile %, topics) |
| `GET` | `/courses/earnings` | JWT | Total earnings for current user |
| `GET` | `/courses/mine` | JWT | Courses owned by current user |
| `GET` | `/courses/public` | Public | All approved courses |
| `GET` | `/courses/public/:id` | Public | Single course detail |
| `POST` | `/courses` | JWT | Create a draft course |
| `PATCH` | `/courses/:id` | JWT | Edit a course |
| `PATCH` | `/courses/:id/submit` | JWT | Submit course for admin review |
| `POST` | `/courses/:id/enroll` | JWT | Enroll in a course |
| `GET` | `/courses/:id/enrollment` | JWT | Check enrollment status |
| `GET` | `/courses/:id/lessons` | JWT | List lessons for a course |
| `POST` | `/courses/:id/lessons` | JWT | Create a lesson |
| `PATCH` | `/lessons/:lessonId` | JWT | Update a lesson |
| `DELETE` | `/lessons/:lessonId` | JWT | Delete a lesson |

### Studio

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/studio/access-status` | JWT | Check studio eligibility (profile %, sessions, ratings) |
| `POST` | `/studio/claim-access` | JWT | Grant studio access (if eligible) |
| `GET` | `/studio/analytics` | JWT | Creator analytics (revenue, trends, top courses) |
| `GET` | `/studio/students?search=&status=` | JWT | Student management list |
| `PATCH` | `/studio/students/:id/status` | JWT | Ban/unban/suspend/restore/refund student |
| `GET` | `/studio/reviews` | JWT | Course reviews for instructor |
| `POST` | `/studio/reviews/:id/reply` | JWT | Reply to a review |
| `GET` | `/studio/coupons` | JWT | List discount coupons |
| `POST` | `/studio/coupons` | JWT | Create discount coupon |
| `GET` | `/studio/audit-logs` | JWT | Instructor action history |

### Dashboard (Instructor)

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard/enrolled-students` | JWT | Enrolled students grouped by course |
| `GET` | `/dashboard/earnings` | JWT | Earnings (total, per‑course, monthly) |
| `PATCH` | `/dashboard/enrollments/:id/ban` | JWT | Ban a student |
| `PATCH` | `/dashboard/enrollments/:id/unban` | JWT | Unban a student |
| `PATCH` | `/dashboard/enrollments/:id/suspend` | JWT | Suspend a student |
| `PATCH` | `/dashboard/enrollments/:id/unsuspend` | JWT | Unsuspend a student |
| `PATCH` | `/dashboard/enrollments/:id/refund` | JWT | Refund and revoke access |

### AI Advisor

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/ai-advisor` | Firebase Token | Get AI career advice (chat) |
| `GET` | `/ai-advisor/history` | Firebase Token | Advisor session history |
| `GET` | `/ai-advisor/health` | Public | Warm up vector store |

### CV Parser

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/parse-cv` | JWT | Upload CV (PDF/DOCX/TXT) → extracted skills |
| `POST` | `/parse-cv/suggest-learn` | JWT | Upload CV → skill gap suggestions |

### Messaging & Social

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/connections/requests` | Public | Send connection request |
| `DELETE` | `/connections/requests/cancel` | Public | Cancel pending request |
| `PATCH` | `/connections/requests/respond` | Public | Accept or reject request |
| `GET` | `/connections/requests/incoming?email=` | Public | Incoming requests |
| `GET` | `/connections/requests/status?email=` | Public | Request statuses for user |
| `POST` | `/conversations/open` | Public | Open (or get) conversation |
| `GET` | `/conversations?email=` | Public | List conversations |
| `GET` | `/conversations/:id/messages?requesterEmail=` | Public | Get messages |
| `POST` | `/conversations/:id/messages` | Public | Send a message |
| `PATCH` | `/messages/:id` | Public | Edit a message |
| `DELETE` | `/messages/:id` | Public | Delete a message |
| `PATCH` | `/conversations/:id/seen` | Public | Mark messages as seen |
| `GET` | `/presence/online` | Public | Online users list |

### Profiles

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/users?email=` | Public | Get user profile by email |
| `PATCH` | `/users/:id` | JWT | Update own profile (blocklisted + allowlisted fields) |
| `POST` | `/ratings` | Public | Rate a connected user (1–5) |
| `POST` | `/cloudinary/sign` | JWT | Get signed upload params for Cloudinary |

### System

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `GET` | `/api/stats` | Public | Platform statistics |
| `POST` | `/delete-account` | Public | Delete user account |
| `GET` | `/notifications` | Public | Platform‑wide notifications |
| `POST` | `/notifications` | Public | Create notification |
| `DELETE` | `/notifications/:id` | Public | Delete notification |
| `GET` | `/user-notifications?email=` | Public | User notification inbox |
| `PATCH` | `/user-notifications/read` | Public | Mark all as read |
| `PATCH` | `/user-notifications/:id/read` | Public | Mark one notification as read |
| `POST` | `/conversations/:id/schedules` | Public | Create schedule |
| `GET` | `/conversations/:id/schedules` | Public | List schedules |
| `PATCH` | `/schedules/:id` | Public | Accept/reject schedule |

---

## 11. Authentication Flow

### User Authentication

```
1. Client                   2. Server                      3. External
   │                           │                              │
   ├── Firebase Login ────────►│                              │
   │  (email/password          │                              │
   │   or Google OAuth)        │                              │
   │                           │                              │
   │◄── Firebase ID Token ─────│                              │
   │                           │                              │
   ├── POST /auth/token ──────►│                              │
   │  { firebaseToken }        │                              │
   │                           ├── verifyIdToken() ──────────►│  Firebase
   │                           │◄── decoded {uid, email} ─────│  Admin SDK
   │                           │                              │
   │                           ├── Check isDeactivated        │
   │                           ├── Sign JWT {uid, email}      │
   │                           │   secret: JWT_SECRET         │
   │                           │   expiresIn: "7d"            │
   │                           │                              │
   │◄── { token, user } ───────│                              │
   │                           │                              │
   ├── Store JWT in localStorage                              │
   │                           │                              │
   ├── All subsequent API calls ──► verifyJWT middleware      │
   │   Authorization: Bearer <jwt>  ├── decode & verify       │
   │                              │   req.user = {uid, email} │
   │                              ├── route handler           │
   │◄─────────────────────────────│                              │
```

**Key points:**
- Firebase handles client‑side authentication (email/password, Google OAuth)
- Server never stores passwords — it receives a Firebase ID token verified by Firebase Admin SDK
- Custom JWT is minted server‑side with a 7‑day expiry
- JWT is stored in `localStorage` and sent as `Authorization: Bearer` header
- Axios interceptor auto‑refreshes the JWT if a 401 is received (exchange Firebase token → new JWT)
- Deactivated accounts are blocked at token exchange time

### Admin Authentication

```
1. Client                   2. Server
   │                           │
   ├── POST /admin-api/login ─►│
   │  { email, password }      │
   │                           ├── Rate limit check (5/15min per IP)
   │                           ├── Verify against ADMIN_EMAIL / ADMIN_PASSWORD
   │                           ├── Sign JWT { email, role: "admin" }
   │                           │   secret: ADMIN_JWT_SECRET
   │                           │   expiresIn: "24h"
   │                           ├── Set httpOnly cookie: admin_token
   │                           │   secure, sameSite: strict
   │◄── { message, token } ────│
```

### Socket.io Authentication

Socket.io does not use JWT for initial connection. Instead:
1. Client connects socket after JWT is obtained
2. Client emits `presence:join` with `{ email }`
3. Server joins socket room `user:${email}`
4. All subsequent real‑time events target `user:${email}` rooms
5. Conversation‑specific events additionally check membership via `conversation:join`

---

## 12. Authorization

### Permission Matrix

| Action | Guest | Learner | Instructor | Admin |
|---|---|---|---|---|
| Browse public courses | ✅ | ✅ | ✅ | ✅ |
| View expert profiles | ❌ | ✅ | ✅ | ✅ |
| Send/receive messages | ❌ | ✅ (connected only) | ✅ | ✅ |
| Create connection requests | ❌ | ✅ | ✅ | ✅ |
| Rate users | ❌ | ✅ (connected) | ✅ | ✅ |
| Create course | ❌ | ❌ | ✅ (≥50% profile) | ✅ |
| Access Creator Studio | ❌ | ❌ | ✅ (eligible) | ✅ |
| Manage students | ❌ | ❌ | ✅ (own only) | ✅ |
| Admin panel | ❌ | ❌ | ❌ | ✅ |
| Deactivate users | ❌ | ❌ | ❌ | ✅ |
| Approve/reject courses | ❌ | ❌ | ❌ | ✅ |
| Platform notifications | ❌ | ❌ | ❌ | ✅ |
| View revenue analytics | ❌ | ❌ | ✅ (own) | ✅ (all) |
| Edit own profile | ❌ | ✅ | ✅ | ✅ |
| Delete account | ❌ | ✅ | ✅ | ✅ |

### Authorization Enforcement

| Mechanism | Where | How |
|---|---|---|
| **JWT verification** | Express middleware | `verifyJWT` checks Bearer token, sets `req.user` |
| **Admin JWT** | Express middleware | `verifyAdminJWT` reads httpOnly cookie, sets `req.adminUser` |
| **Firebase token** | Express middleware | `verifyFirebaseToken` verifies Firebase ID token directly |
| **Ownership check** | Route handlers | `req.user.email` compared against document's `instructorEmail` / `senderEmail` |
| **Connection check** | Route handlers | Before messaging, verifies both users are connected |
| **Eligibility check** | Course/Studio routes | Profile completion ≥50% or mentoring session or permanent access |
| **Admin‑only routes** | Route tree | `AdminRoute` wrapper component on frontend + `verifyAdminJWT` on backend |

---

## 13. Project Architecture

### MVC Pattern (Server‑side)

- **Models** — No Mongoose models; MongoDB collections used directly via native driver. Document shape is enforced in route handlers.
- **Views** — Not applicable (REST API with JSON responses)
- **Controllers** — Only one dedicated controller (`aiAdvisor.controller.js`). Other route files are self‑contained (thin route handlers with inline logic).

### Modular Architecture (Client‑side)

- **Feature‑based** — Pages organized by domain (`pages/`, `components/`, `lib/`)
- **Shared UI System** — Reusable `components/ui/` design system primitives
- **Provider Pattern** — `AuthContext` wraps entire app; `AdminContext` wraps admin panel

### Dependency Flow

```
Pages ──► Components ──► lib/apiClient.js ──► Express API
  │                           │                      │
  ├── hooks/useAuth.jsx      lib/socket.js ────── Socket.io server
  ├── context/               lib/profileApi.js ─── Cloudinary
  └── components/            lib/careerIntelligence.js (offline)
```

### Request Lifecycle

```
1. User action (click, form submit)
2. React state update (useState, useReducer)
3. Optional: Firebase Auth call (login, register)
4. Axios request via apiClient
5. Request interceptor attaches JWT (auto‑refresh if expired)
6. Express receives request
7. Middleware chain: CORS → JSON body → Cookie parser → Auth middleware → Route
8. Route handler: validate → authorize → business logic → DB operation → format response
9. Response interceptor: 401 → auto‑retry with new token (once)
10. React component receives response → update state → re‑render
```

---

## 14. State Management

| Category | Mechanism | Used For |
|---|---|---|
| **Auth State** | React Context (`AuthContext`) | User object, loading state, auth methods |
| **Admin State** | React Context (`AdminContext`) | Admin auth token, login/logout methods |
| **Local State** | `useState`, `useReducer` | Component‑specific UI state |
| **Form State** | `react-hook-form` | Profile editing, course creation, lesson forms |
| **Server State** | Axios direct calls (no React Query / Redux) | All API data fetching |
| **Real‑time State** | Socket.io event listeners | Messages, notifications, presence, scheduling |
| **JWT Storage** | `localStorage` via `lib/jwt.js` | Custom JWT token persistence |
| **Cache Strategy** | Manual cache busting with `updatedAt` timestamp | Profile images |

**Note:** The project does not use React Query, Redux, or Zustand. Server state is fetched directly via Axios and managed with component‑level `useState`. Socket.io events are subscribed in relevant components for real‑time updates.

---

## 15. Security

| Feature | Implementation |
|---|---|
| **Password Hashing** | Handled entirely by Firebase Auth (not implemented server‑side) |
| **JWT Signing** | `jsonwebtoken` with HMAC‑SHA256 (`JWT_SECRET` environment variable) |
| **JWT Expiry** | 7 days for user tokens, 24 hours for admin tokens |
| **Admin httpOnly Cookie** | Admin JWT stored in httpOnly, secure, sameSite:strict cookie |
| **CORS** | Explicit origin allowlist (`http://localhost:5173`) |
| **Rate Limiting (Admin)** | In‑memory map: 5 failed login attempts per IP per 15 minutes |
| **Field Allowlist** | `PATCH /users/:id` only accepts fields in `PROFILE_ALLOWED_FIELDS` Set |
| **Field Blocklist** | 8 sensitive fields hard‑blocked (`_id`, `email`, `uid`, `connections`, `isDeactivated`, `role_system`, `createdAt`, `mongoId`) |
| **Ownership Enforcement** | All mutations verify `req.user.email` matches resource owner |
| **Connection‑Gated Messaging** | Messages only allowed between connected users |
| **Base64 Certificate Sanitization** | Base64 data stripped before MongoDB persistence (server‑side) |
| **Cloudinary Signature** | Uploads require server‑generated SHA‑256 signature (never expose API secret to client) |
| **Token Expiry Check** | JWT helper `isTokenExpired()` checks expiry client‑side |
| **401 Auto‑Refresh** | Axios response interceptor retries once with fresh JWT |
| **Account Deactivation** | `isDeactivated` flag checked at JWT exchange and admin authorization |
| **Request Body Size Limit** | Express JSON body parser limited to 10 MB |
| **Message Size Limit** | Images >2MB rejected server‑side |
| **No ORM Injection** | Native MongoDB driver with parameterized queries |
| **Environment Variables** | All secrets loaded from `.env` (never committed) |
| **Cascade Delete Safety** | Admin course deletion cascades to lessons and enrollments |

### Security Measures NOT Implemented (as of current version)
- Helmet.js (HTTP headers)
- CSRF protection
- Input sanitization library (e.g., DOMPurify) for rich text content
- Structured rate limiting on user endpoints (only admin login is rate‑limited)
- Audit logging for user actions (only studio actions are logged)
- API‑wide request validation library (Zod, Joi)

---

## 16. Performance Optimizations

| Optimization | Implementation |
|---|---|
| **Image Compression** | Client‑side Canvas API resize to ≤800px, JPEG quality 0.8 before upload |
| **Cloudinary CDN** | Images served directly from Cloudinary CDN, not through application server |
| **Direct‑to‑CDN Upload** | Files go from browser → Cloudinary (server only signs, never buffers the file) |
| **Cache‑Busted Images** | `?v=timestamp` parameter on Cloudinary URLs to force update only when profile changes |
| **Database Indexes** | 16 compound/single indexes created on startup (conversations, messages, enrollments, etc.) |
| **MongoDB Connection Pool** | Pool of 50 connections with 5 minimum, keepalive heartbeat every 10s |
| **Paginated Admin Queries** | User list in admin panel uses `skip`/`limit` pagination (20 per page) |
| **Selective Projection** | All DB queries use projection to fetch only needed fields |
| **Socket.io WebSocket Transport** | Favors WebSocket transport for lowest‑latency real‑time communication |
| **Fuse.js Fuzzy Search** | Efficient client‑side fuzzy matching with configurable threshold (0.4) |
| **FAISS Vector Search** | Approximate nearest neighbor search for RAG (faster than brute‑force) |
| **RecursiveCharacterTextSplitter** | LangChain text splitter for optimal chunking of RAG documents |
| **Lazy Socket.io Rooms** | Users join `user:${email}` room only after `presence:join` event |
| **Conditional RAG Fallback** | Vector store failure falls back to keyword retrieval without crashing |
| **LLM Fallback** | Groq failure falls back to rules‑based structured response |

---

## 17. Installation

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **MongoDB Atlas** account (or local MongoDB instance)
- **Firebase** project (with Authentication enabled)
- **Cloudinary** account
- **Groq** API key (free at https://console.groq.com/keys)
- **Google Gemini** API key (free at https://aistudio.google.com/apikey)

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/collaborative-skill-engine.git
cd collaborative-skill-engine

# Install server dependencies
cd cse-server
npm install

# Install client dependencies
cd ../cse-client
npm install
```

### Environment Variables

#### Server (`cse-server/.env`)

```bash
cp cse-server/.env.example cse-server/.env
# Then edit .env with your actual credentials
```

See the [Environment Variables](#18-environment-variables) section for details.

#### Client (`cse-client/.env`)

```bash
# Create .env in cse-client/
# Populate with:
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
```

### Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file as `cse-server/firebase-service-account.json`
4. Set `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json` in your `.env`

### Run with Docker (Recommended)

Run both client and server with a single command:

```bash
# Build and start all services in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop containers
docker compose down
```

The client will be running at `http://localhost:5173` and the server at `http://localhost:3000`.

### Run in Development (Manual)

```bash
# Terminal 1: Start the server
cd cse-server
npm run dev

# Terminal 2: Start the client
cd cse-client
npm run dev
```

The client will be available at `http://localhost:5173` and the server at `http://localhost:3000`.

### Build for Production

```bash
cd cse-client
npm run build
# Output in cse-client/dist/
```

---

## 18. Environment Variables

### Server (`cse-server/.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string | — |
| `PORT` | ❌ | Server port | `3000` |
| `JWT_SECRET` | ✅ | Secret key for signing user JWTs | — |
| `GROQ_API_KEY` | ❌ (see note) | Groq API key for LLM | — |
| `GROQ_MODEL` | ❌ | Groq model name | `llama-3.1-8b-instant` |
| `GOOGLE_API_KEY` | ❌ (see note) | Google Gemini API key for embeddings | — |
| `GEMINI_MODEL` | ❌ | Gemini model name | `gemini-1.5-flash-8b` |
| `GEMINI_EMBEDDING_MODEL` | ❌ | Embeddings model | `text-embedding-004` |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID | — |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ❌ | Path to service account JSON | — |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ❌ | Inline service account JSON (alternative to path) | — |
| `ADMIN_EMAIL` | ✅ | Admin login email | — |
| `ADMIN_PASSWORD` | ✅ | Admin login password | — |
| `ADMIN_JWT_SECRET` | ✅ | Secret key for signing admin JWTs | — |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name | — |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key | — |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret | — |

**Note on AI keys:** At least one of `GROQ_API_KEY` or `GOOGLE_API_KEY` must be set for the AI Advisor to function. If both are missing, the advisor falls back to rules‑based responses.

### Client (`cse-client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API URL (e.g., `http://localhost:3000`) |
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |

---

## 19. Deployment

### Frontend (Vite SPA)

1. Build the client:

```bash
cd cse-client
npm run build
```

2. Deploy the `dist/` directory to your static host (Vercel, Netlify, Cloudflare Pages, or any CDN).

3. Configure the SPA fallback: ensure all routes redirect to `index.html` (for client‑side routing).

4. Set environment variables in your hosting platform's dashboard.

### Backend (Express + Socket.io)

1. Ensure all environment variables are set in the production environment.

2. Choose a Node.js host that supports WebSocket connections (e.g., Railway, Render, Fly.io, or a VPS).

3. Start the server:

```bash
cd cse-server
NODE_ENV=production node index.js
```

4. Update `VITE_API_URL` in the client to point to the production server URL.

5. Update CORS `origin` in `cse-server/index.js` to allow your production frontend domain.

### Database

- Ensure your MongoDB Atlas cluster IP whitelist includes your production server's IP.
- Consider upgrading to an M10+ cluster for production workloads.

### Cloudinary

- Verify your Cloudinary plan supports the expected upload volume.
- The `cloudinary/sign` endpoint automatically uses your configured cloud name, API key, and API secret.

---

## 20. Development Workflow

### Git Branches

| Branch | Purpose |
|---|---|
| `main` | Production‑ready code |
| `develop` | Integration branch for features |
| `feature/*` | Feature branches (e.g., `feature/ai-advisor`) |
| `fix/*` | Bug fixes |
| `refactor/*` | Code refactoring |

### Commit Convention

Follow conventional commits:

```
feat: add mentor matching algorithm
fix: resolve socket.io reconnection loop
refactor: extract profile completion to shared utility
docs: update API documentation
chore: update dependencies
```

### Code Style

- **Frontend:** ESLint flat config (`eslint.config.js`) with React + Vite presets
- **Backend:** No formal linting configuration (follow existing patterns)
- **Formatting:** Consistent with project conventions (2‑space indentation, single or double quotes per file)

### Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| React components | PascalCase | `ExpertProfileHeader.jsx` |
| Hooks | camelCase with `use` prefix | `useAuth.jsx` |
| Utilities | camelCase | `profileApi.js` |
| Routes | dot‑separated | `auth.routes.js` |
| Services | dot‑separated | `ai.service.js` |
| CSS classes | Tailwind utility classes | Inline (no CSS modules) |
| MongoDB collections | snake_case | `user_list`, `course_enrollments` |

---

## 21. Future Improvements

The following enhancements are planned based on the current architecture:

| Priority | Feature | Description |
|---|---|---|
| 🔴 High | **Payment Integration** | Replace the current free enrollment model with Stripe/PayPal payment processing |
| 🔴 High | **Email Notification Service** | Add Nodemailer / SendGrid for transactional emails (welcome, course approved, etc.) |
| 🔴 High | **React Query / TanStack Query** | Replace manual Axios state management with a caching library for server state |
| 🟡 Medium | **Lesson Progress Tracking** | Track individual student progress through lessons (completed %, time spent) |
| 🟡 Medium | **Quiz & Assignment Engine** | Build out interactive quizzes (auto‑graded) and assignment submission workflow |
| 🟡 Medium | **Certificate Generation** | Generate PDF certificates on course completion with metadata |
| 🟡 Medium | **Multi‑language Support** | i18n integration for internationalization |
| 🟡 Medium | **API Rate Limiting (General)** | Extend rate limiting beyond admin login to all endpoints (e.g., express‑rate‑limit) |
| 🟡 Medium | **Zod / Joi Validation** | Add request validation schemas across all route handlers |
| 🟡 Medium | **Search Optimization** | Add full‑text search indexes on courses, skills, and user names |
| 🟢 Low | **Dark / Light Theme Toggle** | Support theme switching (currently dark‑only) |
| 🟢 Low | **Helmet.js** | Add security headers (CSP, X‑Frame‑Options, etc.) |
| 🟢 Low | **CSRF Protection** | Implement CSRF token for sensitive mutations |
| 🟢 Low | **Webhook System** | Outbound webhooks for course enrollment, completion events |
| 🟢 Low | **Mobile Native App** | React Native wrapper for the existing API |
| 🟢 Low | **CI/CD Pipeline** | GitHub Actions for lint, test, build, and deploy |
| 🟢 Low | **E2E Testing** | Playwright or Cypress test suite for critical user journeys |

---

## 22. Troubleshooting

### Common Issues

<details>
<summary><strong>Firebase Auth: "auth/operation-not-allowed"</strong></summary>

**Cause:** Email/password or Google sign‑in is not enabled in Firebase Console.

**Solution:** Go to Firebase Console → Authentication → Sign‑in method → Enable Email/Password and Google.

</details>

<details>
<summary><strong>Server: "MONGODB_URI not set"</strong></summary>

**Cause:** Environment variables not loaded.

**Solution:** Ensure `cse-server/.env` exists and contains `MONGODB_URI`. The server reads it with `dotenv` on startup.

</details>

<details>
<summary><strong>Client: "Failed to obtain upload signature from server"</strong></summary>

**Cause:** The server `/cloudinary/sign` endpoint returned an error, typically because Cloudinary environment variables are missing on the server.

**Solution:** Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set in the server `.env`.

</details>

<details>
<summary><strong>AI Advisor: No response / rules fallback</strong></summary>

**Cause:** Neither `GROQ_API_KEY` nor `GOOGLE_API_KEY` is configured.

**Solution:** Set at least one AI API key in the server `.env`. The advisor degrades gracefully to a rules‑based engine if neither is available.

</details>

<details>
<summary><strong>Socket.io: Messages not delivering in real‑time</strong></summary>

**Cause 1:** Socket not connected. Check browser console for connection errors.

**Cause 2:** User not in the correct Socket.io room. The room is `conversation:<conversationId>` and requires the `conversation:join` event to be emitted.

**Solution:** Verify the client calls `socket.emit("conversation:join", { conversationId, email })` when opening a conversation.

</details>

<details>
<summary><strong>Admin: "Too many failed attempts"</strong></summary>

**Cause:** 5 failed login attempts within 15 minutes from the same IP.

**Solution:** Wait 15 minutes or restart the server to clear the in‑memory rate limiter.

</details>

<details>
<summary><strong>Course Creation: "Profile completion must be at least 50%"</strong></summary>

**Cause:** The user's profile does not meet the minimum completeness threshold.

**Solution:** Complete 5 of the 8 profile criteria (photo, name, headline, bio, teachSkills, links, projects, certs/education) to reach 50%.

</details>

<details>
<summary><strong>Canvas Compression: "Canvas context unavailable"</strong></summary>

**Cause:** The browser does not support Canvas 2D context.

**Solution:** Use a modern browser (Chrome, Firefox, Safari, Edge). This is extremely rare and usually indicates a security restriction.

</details>

---

## 23. FAQ

<details>
<summary><strong>Can I use this project for my own platform?</strong></summary>

Yes! This is open‑source under the ISC license. Fork, modify, and deploy as you wish.

</details>

<details>
<summary><strong>How do I become an instructor?</strong></summary>

Complete your profile to at least 50% (photo, name, headline, bio, and skills/topics). Then visit `/studio` to unlock access. Alternatively, complete one mentoring session to unlock studio access.

</details>

<details>
<summary><strong>How do I earn money from courses?</strong></summary>

Set a price ($1–$9,999.99) when creating a course. When students enroll, you earn 85% of the price. The platform retains 15% as commission.

</details>

<details>
<summary><strong>How does the AI Advisor work?</strong></summary>

It uses Groq's `llama-3.1-8b-instant` model (free tier) to analyze your profile, skills, and goals. It then retrieves relevant documents from a knowledge base (FAISS vector store) and generates structured career advice, skill gap analysis, and personalized learning roadmaps.

</details>

<details>
<summary><strong>Can I upload a resume to fill my profile?</strong></summary>

Yes. Go to your profile page and use the CV upload feature. The system parses PDF, DOCX, and TXT files to extract skills and suggest what to learn next.

</details>

<details>
<summary><strong>How do I connect with other users?</strong></summary>

Search for mentors or partners on the Experts page, view their profile, and click "Connect." Once they accept your request, you can message, schedule sessions, and rate each other.

</details>

<details>
<summary><strong>Can I schedule video calls with mentors?</strong></summary>

Yes. After connecting, open a conversation and create a schedule. The platform supports WebRTC video calls that activate when the schedule enters its 10‑minute pre‑session window.

</details>

<details>
<summary><strong>Is there a mobile app?</strong></summary>

Not yet. The frontend is a responsive web application built with Tailwind CSS that works on mobile browsers. A React Native app is on the roadmap.

</details>

<details>
<summary><strong>How do I reset my password?</strong></summary>

Password reset is handled by Firebase Auth. Use the "Forgot Password" link on the login page to receive a reset email.

</details>

<details>
<summary><strong>Is there a test environment?</strong></summary>

Currently, the project has no automated test suite. Testing is manual during development.

</details>

---

## 24. Contributing Guide

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork:

```bash
git clone https://github.com/yourusername/collaborative-skill-engine.git
```

3. **Create a branch** for your feature or fix:

```bash
git checkout -b feature/your-feature-name
```

4. **Make your changes**, following the existing code style and conventions
5. **Test** your changes manually (no automated test suite available yet)
6. **Commit** using conventional commit messages:

```bash
git commit -m "feat: add your feature description"
```

7. **Push** to your fork:

```bash
git push origin feature/your-feature-name
```

8. **Open a Pull Request** against the `main` branch

### Guidelines

- Keep PRs focused on a single feature or fix
- Follow the existing file naming and folder structure
- Add environment variables to `.env.example` if you introduce new ones
- Update this README if you change functionality
- Avoid introducing non‑standard dependencies without clear justification

---

## 25. License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2026 Collaborative Skill Engine

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 26. Credits

### Frameworks & Libraries

| Library | Purpose |
|---|---|
| [React](https://react.dev) | UI framework |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [Express](https://expressjs.com) | HTTP server framework |
| [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) | Database access |
| [Socket.io](https://socket.io) | Real‑time bidirectional communication |
| [Firebase](https://firebase.google.com) | Authentication |
| [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) | Server‑side auth verification |
| [Cloudinary](https://cloudinary.com) | Image hosting & CDN |
| [Tailwind CSS](https://tailwindcss.com) | Utility‑first CSS framework |
| [Framer Motion](https://www.framer.com/motion/) | Animation library |
| [GSAP](https://gsap.com) | High‑performance web animations |
| [Recharts](https://recharts.org) | Charting library |
| [React Router](https://reactrouter.com) | Client‑side routing |
| [Axios](https://axios-http.com) | HTTP client |
| [LangChain.js](https://js.langchain.com) | LLM application framework |
| [Groq](https://groq.com) | Fast LLM inference |
| [FAISS](https://github.com/ankane/faiss-node) | Vector similarity search |
| [Fuse.js](https://fusejs.io) | Fuzzy string search |
| [Multer](https://github.com/expressjs/multer) | File upload middleware |
| [pdf‑parse](https://www.npmjs.com/package/pdf-parse) | PDF text extraction |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | DOCX text extraction |
| [Lucide React](https://lucide.dev) | Icon library |
| [react‑hook‑form](https://react-hook-form.com) | Form state management |
| [SweetAlert2](https://sweetalert2.github.io) | Alert dialogs |

### Tools

| Tool | Purpose |
|---|---|
| [Nodemon](https://nodemon.io) | Development server auto‑restart |
| [ESLint](https://eslint.org) | Code linting |
| [dotenv](https://www.npmjs.com/package/dotenv) | Environment variable loading |

### Contributors

- **Shuvo** — Lead developer & architect

---

<p align="center">
  <strong>Built with ❤️ for the global learning community</strong>
</p>
