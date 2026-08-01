/**
 * careerIntelligence.js — Real-Data AI Career Intelligence Engine
 *
 * CRITICAL RULES:
 * - currentSkills = teachSkills ONLY (what user actually knows RIGHT NOW)
 * - learnSkills = future goals, NEVER used to determine what user "has"
 * - Skill gaps are dynamically computed by excluding currentSkills from knowledge base
 * - Roadmap is sequenced based on actual current skill level
 */

// ─── FULL SKILL KNOWLEDGE BASE ───────────────────────────────────────────────
const SKILL_KNOWLEDGE_BASE = [
  {
    skill: "TypeScript",
    category: "frontend",
    whyImportant: "TypeScript catches type errors at compile-time and is required in virtually every enterprise-grade React codebase. It prevents an entire class of runtime bugs.",
    usedIn: "Production React apps, Next.js projects, enterprise SaaS platforms.",
    roles: ["Frontend Engineer", "Full Stack Developer", "Software Engineer"],
    difficulty: "Medium",
    time: "2–3 weeks",
    priority: "High",
    prerequisites: ["JavaScript"],
    careerImpact: "Opens doors to 70%+ of senior frontend positions.",
    salaryImpact: "+15–25% average salary premium over plain JS developers.",
    dependents: ["Next.js", "NestJS", "Prisma"],
  },
  {
    skill: "Next.js",
    category: "frontend",
    whyImportant: "Next.js is the standard React framework for production web applications with SSR, SSG, file-based routing, and built-in API routes.",
    usedIn: "Production SaaS apps, e-commerce platforms, marketing sites.",
    roles: ["Frontend Engineer", "Full Stack Developer"],
    difficulty: "Medium",
    time: "2–3 weeks",
    priority: "High",
    prerequisites: ["React", "JavaScript"],
    careerImpact: "Required for most modern frontend job postings.",
    salaryImpact: "+10–20% for Next.js expertise.",
    dependents: ["Vercel deployment", "API Routes", "ISR"],
  },
  {
    skill: "Node.js",
    category: "backend",
    whyImportant: "Node.js allows you to write server-side JavaScript, enabling full-stack development with a single language and unlocking backend, APIs, and real-time systems.",
    usedIn: "REST APIs, real-time apps, microservices, serverless functions.",
    roles: ["Backend Developer", "Full Stack Developer", "API Engineer"],
    difficulty: "Medium",
    time: "3–4 weeks",
    priority: "High",
    prerequisites: ["JavaScript"],
    careerImpact: "Doubles your job market reach by enabling full-stack roles.",
    salaryImpact: "+20–30% for full-stack vs frontend-only developers.",
    dependents: ["Express", "NestJS", "Socket.io"],
  },
  {
    skill: "Express.js",
    category: "backend",
    whyImportant: "Express.js is the most widely used Node.js framework for building REST APIs. It is the backbone of the MERN stack.",
    usedIn: "REST API development, backend services, middleware integration.",
    roles: ["Backend Developer", "Full Stack Developer"],
    difficulty: "Low–Medium",
    time: "1–2 weeks",
    priority: "High",
    prerequisites: ["Node.js"],
    careerImpact: "Core skill for any Node.js backend developer.",
    salaryImpact: "Standard requirement for backend roles.",
    dependents: ["MongoDB", "JWT Auth", "Middleware"],
  },
  {
    skill: "MongoDB",
    category: "backend",
    whyImportant: "MongoDB is the leading NoSQL database for JavaScript/Node.js applications. It stores data as flexible JSON documents, ideal for rapid iteration.",
    usedIn: "MERN stack apps, real-time data storage, user profile systems.",
    roles: ["Backend Developer", "Full Stack Developer"],
    difficulty: "Low–Medium",
    time: "1–2 weeks",
    priority: "High",
    prerequisites: ["Node.js"],
    careerImpact: "Required for MERN stack mastery.",
    salaryImpact: "Database skills add $5–10K to annual packages.",
    dependents: ["Mongoose", "Aggregation pipelines", "Atlas"],
  },
  {
    skill: "PostgreSQL",
    category: "backend",
    whyImportant: "PostgreSQL is the industry standard SQL database for production applications. Mastering it makes you competitive for any backend engineering role.",
    usedIn: "Enterprise applications, financial systems, e-commerce backends.",
    roles: ["Backend Developer", "Full Stack Developer", "Data Engineer"],
    difficulty: "Medium",
    time: "3–4 weeks",
    priority: "Medium",
    prerequisites: ["SQL basics"],
    careerImpact: "Needed for most enterprise and startup backend positions.",
    salaryImpact: "+10–15% for SQL database expertise.",
    dependents: ["Prisma", "Drizzle ORM", "Supabase"],
  },
  {
    skill: "Docker",
    category: "devops",
    whyImportant: "Docker containerizes your application so it runs identically across every machine, team member's laptop, staging, and production. This is a non-negotiable skill in any professional development team.",
    usedIn: "CI/CD pipelines, microservices, team collaboration, production deployment.",
    roles: ["DevOps Engineer", "Full Stack Developer", "Backend Developer"],
    difficulty: "Medium",
    time: "1–2 weeks",
    priority: "High",
    prerequisites: ["Linux basics", "Git"],
    careerImpact: "Required in 80%+ of backend/full-stack job descriptions.",
    salaryImpact: "+15–20% for DevOps-capable developers.",
    dependents: ["Kubernetes", "Docker Compose", "CI/CD"],
  },
  {
    skill: "Testing (Jest/Vitest)",
    category: "engineering",
    whyImportant: "Writing automated tests is the difference between a junior and senior engineer. Companies measure code quality by test coverage. Untested code is considered unshippable.",
    usedIn: "All production codebases, CI pipelines, team collaboration.",
    roles: ["Frontend Engineer", "Backend Developer", "Full Stack Developer"],
    difficulty: "Medium",
    time: "2–3 weeks",
    priority: "High",
    prerequisites: ["JavaScript", "React"],
    careerImpact: "Mandatory for senior-level and staff engineer roles.",
    salaryImpact: "+10–15% for TDD-capable developers.",
    dependents: ["CI/CD", "Code coverage", "Integration testing"],
  },
  {
    skill: "Redux / Zustand",
    category: "frontend",
    whyImportant: "Complex React applications require centralized state management. Redux or Zustand prevents prop drilling and keeps state predictable at scale.",
    usedIn: "Large-scale React applications, dashboards, e-commerce platforms.",
    roles: ["Frontend Engineer", "Full Stack Developer"],
    difficulty: "Medium",
    time: "1–2 weeks",
    priority: "Medium",
    prerequisites: ["React", "JavaScript"],
    careerImpact: "Required for senior frontend roles at scale.",
    salaryImpact: "Differentiates mid from senior developers.",
    dependents: ["React Query", "Redux Toolkit"],
  },
  {
    skill: "REST API Design",
    category: "backend",
    whyImportant: "Understanding how to properly design RESTful APIs — with correct HTTP methods, status codes, versioning, and error handling — is foundational for any backend role.",
    usedIn: "All web applications, mobile apps, microservices.",
    roles: ["Backend Developer", "Full Stack Developer", "API Engineer"],
    difficulty: "Low–Medium",
    time: "1 week",
    priority: "High",
    prerequisites: ["HTTP basics"],
    careerImpact: "Core competency for any web developer.",
    salaryImpact: "Table stakes for backend/full-stack positions.",
    dependents: ["Express", "Swagger docs", "Postman"],
  },
  {
    skill: "GraphQL",
    category: "backend",
    whyImportant: "GraphQL is an alternative to REST that allows clients to request exactly the data they need. It powers APIs for companies like GitHub, Shopify, and Twitter.",
    usedIn: "Modern API development, React with Apollo Client, mobile apps.",
    roles: ["Full Stack Developer", "Backend Developer"],
    difficulty: "Medium–Hard",
    time: "3–4 weeks",
    priority: "Medium",
    prerequisites: ["REST API", "Node.js"],
    careerImpact: "Differentiates senior full-stack developers.",
    salaryImpact: "+10–15% for GraphQL expertise.",
    dependents: ["Apollo", "Hasura", "Federation"],
  },
  {
    skill: "Git & GitHub",
    category: "engineering",
    whyImportant: "Version control with Git is the absolute foundation of professional software development. Without it, you cannot work on any team or contribute to any open-source project.",
    usedIn: "All software projects, team collaboration, CI/CD pipelines.",
    roles: ["All software engineering roles"],
    difficulty: "Low",
    time: "1 week",
    priority: "Critical",
    prerequisites: [],
    careerImpact: "Required for literally every software job.",
    salaryImpact: "Non-negotiable baseline skill.",
    dependents: ["GitHub Actions", "CI/CD", "Open Source"],
  },
  {
    skill: "System Design",
    category: "engineering",
    whyImportant: "System design knowledge — covering scalability, load balancing, caching, databases, and distributed systems — is tested in senior engineering interviews at every top company.",
    usedIn: "Senior-level interviews, architectural decisions, scalable product design.",
    roles: ["Senior Engineer", "Staff Engineer", "Tech Lead"],
    difficulty: "Hard",
    time: "3–6 months",
    priority: "Medium",
    prerequisites: ["Backend basics", "Databases", "Networking basics"],
    careerImpact: "Required to pass senior engineer interviews at FAANG/top startups.",
    salaryImpact: "+30–50% salary increase for senior/staff roles.",
    dependents: ["Distributed systems", "Kafka", "Redis"],
  },
  {
    skill: "Redis",
    category: "backend",
    whyImportant: "Redis is an in-memory data store used for caching, session management, and rate limiting. It dramatically improves application performance.",
    usedIn: "High-traffic APIs, session storage, leaderboards, pub/sub systems.",
    roles: ["Backend Developer", "Full Stack Developer"],
    difficulty: "Medium",
    time: "1–2 weeks",
    priority: "Medium",
    prerequisites: ["Node.js", "Backend basics"],
    careerImpact: "Performance engineering skill for senior roles.",
    salaryImpact: "+10% for caching and performance expertise.",
    dependents: ["Caching strategies", "Rate limiting", "Pub/Sub"],
  },
  {
    skill: "AWS / Cloud",
    category: "devops",
    whyImportant: "Cloud platforms (AWS, GCP, Azure) are where all modern applications are deployed. Cloud skills let you deploy, scale, and monitor production applications professionally.",
    usedIn: "Production deployment, serverless functions, storage, databases.",
    roles: ["DevOps Engineer", "Cloud Engineer", "Full Stack Developer"],
    difficulty: "Hard",
    time: "2–3 months",
    priority: "Medium",
    prerequisites: ["Linux", "Docker", "Networking basics"],
    careerImpact: "High-demand skill adding significant career leverage.",
    salaryImpact: "+25–40% for cloud-certified engineers.",
    dependents: ["EC2", "S3", "Lambda", "RDS"],
  },
  {
    skill: "Python",
    category: "ai",
    whyImportant: "Python is the dominant language for data science, machine learning, and AI. If you want to work in AI/ML, Python is non-negotiable.",
    usedIn: "Machine learning, data analysis, automation, scripting, AI backends.",
    roles: ["Data Scientist", "ML Engineer", "AI Engineer", "Backend Developer"],
    difficulty: "Low–Medium",
    time: "3–4 weeks",
    priority: "Medium",
    prerequisites: ["Programming fundamentals"],
    careerImpact: "Opens the entire AI/ML career track.",
    salaryImpact: "+20–30% for Python + ML developers.",
    dependents: ["NumPy", "Pandas", "TensorFlow", "FastAPI"],
  },
  {
    skill: "Machine Learning",
    category: "ai",
    whyImportant: "Machine Learning is the foundation of modern AI products. Understanding ML principles allows you to build intelligent features and transition into AI engineering.",
    usedIn: "Recommendation systems, image recognition, NLP, predictive analytics.",
    roles: ["ML Engineer", "AI Engineer", "Data Scientist"],
    difficulty: "Hard",
    time: "3–6 months",
    priority: "Medium",
    prerequisites: ["Python", "Linear algebra", "Statistics"],
    careerImpact: "Gateway to the highest-paying engineering specialization.",
    salaryImpact: "ML engineers earn 40–70% above average software engineers.",
    dependents: ["TensorFlow", "PyTorch", "Scikit-Learn"],
  },
  {
    skill: "Prisma ORM",
    category: "backend",
    whyImportant: "Prisma is a modern TypeScript-first ORM that replaces raw SQL queries with type-safe database access. It is rapidly becoming the standard for Node.js + PostgreSQL stacks.",
    usedIn: "Next.js backends, Node.js APIs, full-stack TypeScript applications.",
    roles: ["Full Stack Developer", "Backend Developer"],
    difficulty: "Low–Medium",
    time: "1 week",
    priority: "Medium",
    prerequisites: ["TypeScript", "SQL basics"],
    careerImpact: "Differentiates modern full-stack developers.",
    salaryImpact: "Standard in modern startup tech stacks.",
    dependents: ["PostgreSQL", "TypeScript", "Next.js"],
  },
  {
    skill: "Tailwind CSS",
    category: "frontend",
    whyImportant: "Tailwind CSS is the fastest-growing utility-first CSS framework. It replaces traditional CSS with composable classes and is now the default in most modern React projects.",
    usedIn: "React apps, Next.js projects, component libraries.",
    roles: ["Frontend Engineer", "Full Stack Developer"],
    difficulty: "Low",
    time: "3–5 days",
    priority: "High",
    prerequisites: ["HTML", "CSS"],
    careerImpact: "Expected skill in most modern frontend roles.",
    salaryImpact: "Standard baseline for frontend positions.",
    dependents: ["shadcn/ui", "Radix UI", "Headless UI"],
  },
  {
    skill: "CI/CD Pipelines",
    category: "devops",
    whyImportant: "Continuous Integration and Deployment pipelines automate testing and deployment, reducing manual effort and preventing broken code from reaching production.",
    usedIn: "All professional software teams, automated deployment workflows.",
    roles: ["DevOps Engineer", "Full Stack Developer", "Backend Developer"],
    difficulty: "Medium",
    time: "1–2 weeks",
    priority: "Medium",
    prerequisites: ["Git", "Docker"],
    careerImpact: "Required for senior and staff engineering roles.",
    salaryImpact: "+10–15% for DevOps-capable engineers.",
    dependents: ["GitHub Actions", "Jenkins", "ArgoCD"],
  },
];

// ─── CATEGORY HELPERS ─────────────────────────────────────────────────────────
const FRONTEND_SKILLS_LIST = ["React", "JavaScript", "HTML", "CSS", "TypeScript", "Tailwind", "Tailwind CSS", "Next.js", "Vue", "Angular", "Redux", "Zustand"];
const BACKEND_SKILLS_LIST  = ["Node.js", "Node", "Express", "Express.js", "MongoDB", "Python", "SQL", "PostgreSQL", "Java", "REST API", "GraphQL", "Prisma", "Redis"];
const DEVOPS_SKILLS_LIST   = ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Git", "GitHub", "Nginx"];
const AI_SKILLS_LIST       = ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Data Analysis", "Pandas", "Scikit-Learn", "LLMs"];

export function generateCareerIntelligence(profile, latestResponse) {
  // Extract skills earned from certificates
  const certSkills = (profile?.certificates || [])
    .flatMap((c) => Array.isArray(c.skills) ? c.skills : String(c.skills || "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);

  // ── CRITICAL: Only use teachSkills + verified certSkills (what user CURRENTLY KNOWS) ──
  const currentSkills = Array.from(new Set([
    ...(profile?.teachSkills || []),
    ...certSkills,
  ]))
    .map((s) => String(s).trim())
    .filter(Boolean);

  // learnSkills are future goals — NEVER use for gap detection
  const learnGoals = (profile?.learnSkills || [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const teachLevel = profile?.teachLevel || "Beginner";

  // ── Skill matching — only against CURRENT skills ───────────────────────────
  const hasCurrentSkill = (name) =>
    currentSkills.some((s) =>
      s.toLowerCase().replace(/[.\s-]/g, "").includes(
        name.toLowerCase().replace(/[.\s-]/g, "")
      )
    );

  // Count category coverage
  const feCount     = FRONTEND_SKILLS_LIST.filter(hasCurrentSkill).length;
  const beCount     = BACKEND_SKILLS_LIST.filter(hasCurrentSkill).length;
  const devopsCount = DEVOPS_SKILLS_LIST.filter(hasCurrentSkill).length;
  const aiCount     = AI_SKILLS_LIST.filter(hasCurrentSkill).length;

  // ── 1. AI Career Summary ────────────────────────────────────────────────────
  let summary = "";
  if (currentSkills.length === 0) {
    summary = "Your profile does not list any current skills yet. Add the technologies you know to your 'Teach' section to unlock your personalized career intelligence report.";
  } else if (feCount >= 3 && beCount >= 3) {
    summary = `Based on your proficiency in ${currentSkills.slice(0, 4).join(", ")}, you have a strong Full-Stack engineering foundation. Strengthening areas like testing, Docker, and system design will accelerate your path to Senior Software Engineer roles.`;
  } else if (feCount >= 2) {
    summary = `Your profile shows a solid Frontend foundation with ${currentSkills.slice(0, 3).join(", ")}. The logical next step is expanding into Node.js, backend APIs, and TypeScript to unlock full-stack engineering opportunities.`;
  } else if (beCount >= 2) {
    summary = `You have a strong Backend development base with ${currentSkills.slice(0, 3).join(", ")}. Adding modern frontend skills like React and TypeScript will open full-stack positions at significantly higher salary bands.`;
  } else if (aiCount >= 2) {
    summary = `You are building toward an AI/ML engineering profile with ${currentSkills.slice(0, 3).join(", ")}. Deepening expertise in machine learning fundamentals and MLOps will unlock high-value AI engineering roles.`;
  } else {
    summary = `You have started with ${currentSkills.slice(0, 3).join(", ")}. Consistent project building and focused depth in one technology area will rapidly strengthen your engineering profile.`;
  }

  // ── 2. Industry Readiness Scores ────────────────────────────────────────────
  const feScore     = Math.min(100, Math.round((feCount / 5) * 100));
  const beScore     = Math.min(100, Math.round((beCount / 5) * 100));
  const fsScore     = Math.min(100, Math.round(((feCount + beCount) / 8) * 100));
  const aiScore     = Math.min(100, Math.round((aiCount / 4) * 100));
  const overallScore = Math.min(100, Math.round(
    feScore * 0.3 + beScore * 0.3 + fsScore * 0.2 + Math.min(devopsCount * 15, 30) * 0.2
  ));

  const readiness = {
    overall:   { score: Math.max(12, overallScore), label: "Overall Industry Readiness" },
    frontend:  { score: Math.max(8,  feScore),      explanation: `${feCount} of ${FRONTEND_SKILLS_LIST.length} core frontend skills detected in your profile.` },
    backend:   { score: Math.max(5,  beScore),      explanation: `${beCount} of ${BACKEND_SKILLS_LIST.length} core backend skills detected in your profile.` },
    fullstack: { score: Math.max(5,  fsScore),      explanation: "Weighted combination of your frontend + backend capability." },
    ai:        { score: Math.max(3,  aiScore),      explanation: `${aiCount} of ${AI_SKILLS_LIST.length} AI & data engineering skills detected.` },
  };

  // ── 3. Inferred Goal (from current skills, not learn goals) ─────────────────
  let inferredGoal = "Software Engineer";
  if      (feCount >= 3 && beCount >= 3) inferredGoal = "Full Stack Developer";
  else if (feCount >= beCount && feCount >= 2) inferredGoal = "Frontend Engineer";
  else if (beCount > feCount && beCount >= 2)  inferredGoal = "Backend Engineer";
  else if (aiCount >= 2)                        inferredGoal = "AI / ML Engineer";
  else if (devopsCount >= 2)                    inferredGoal = "DevOps / Cloud Engineer";

  // ── 4. Next Best Action (based on current skills gap) ───────────────────────
  let nextBestAction = {
    title: "Build & Deploy a Full-Stack Web Application",
    why: "Integrating frontend, backend, and a real database into one deployed project is the #1 proof of engineering capability for any job application.",
  };
  if (currentSkills.length === 0) {
    nextBestAction = {
      title: "Add your current skills to your profile",
      why: "Your profile lists no current skills. Adding what you already know unlocks your full personalized career intelligence analysis.",
    };
  } else if (!hasCurrentSkill("Git") && !hasCurrentSkill("GitHub")) {
    nextBestAction = {
      title: "Learn Git & GitHub Version Control",
      why: "Git is required in 100% of software jobs. Without it, no team can work with your code and you cannot contribute to any project.",
    };
  } else if (!hasCurrentSkill("React") && feCount > 0) {
    nextBestAction = {
      title: "Master React.js — The #1 Frontend Framework",
      why: "React is the most-demanded frontend skill. It appears in 68% of all frontend job listings globally and will immediately expand your job options.",
    };
  } else if (!hasCurrentSkill("TypeScript") && hasCurrentSkill("React")) {
    nextBestAction = {
      title: "Learn TypeScript for Production React Development",
      why: "TypeScript is now expected in virtually every serious React codebase. It prevents runtime bugs and is required for 70% of senior frontend positions.",
    };
  } else if (!hasCurrentSkill("Node") && !hasCurrentSkill("Node.js") && feCount >= 2) {
    nextBestAction = {
      title: "Learn Node.js & Build Your First REST API",
      why: "Adding Node.js unlocks full-stack development, doubles your job market reach, and enables you to build complete applications independently.",
    };
  } else if (!hasCurrentSkill("Docker") && (feCount + beCount) >= 4) {
    nextBestAction = {
      title: "Containerize Your Apps with Docker",
      why: "Docker appears in 80% of backend/full-stack job descriptions. It eliminates environment-related bugs and demonstrates professional deployment capability.",
    };
  } else if (!hasCurrentSkill("Testing") && !hasCurrentSkill("Jest") && !hasCurrentSkill("Vitest")) {
    nextBestAction = {
      title: "Write Automated Tests with Jest or Vitest",
      why: "Untested code is considered unshippable in professional teams. Testing skills are required for senior engineering roles and improve code reliability by 60%.",
    };
  }

  // ── 5. Dynamic Skill Gap Analysis ───────────────────────────────────────────
  // CRITICAL: Filter out skills the user already has
  const missingGaps = SKILL_KNOWLEDGE_BASE
    .filter((entry) => !hasCurrentSkill(entry.skill))
    .sort((a, b) => {
      // Prioritize based on user's current skill level and career direction
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const aPrio = priorityOrder[a.priority] ?? 2;
      const bPrio = priorityOrder[b.priority] ?? 2;
      // Boost relevance for detected career direction
      const aRelevant = a.category === (feCount >= beCount ? "frontend" : "backend") ? -0.5 : 0;
      const bRelevant = b.category === (feCount >= beCount ? "frontend" : "backend") ? -0.5 : 0;
      return (aPrio + aRelevant) - (bPrio + bRelevant);
    })
    // Skip skills whose prerequisites the user doesn't have yet
    .filter((entry) => {
      if (entry.prerequisites.length === 0) return true;
      // Show if user has at least one prerequisite (partial readiness)
      return entry.prerequisites.some((p) => hasCurrentSkill(p)) ||
        entry.prerequisites.length === 1 && entry.prerequisites[0] === "";
    })
    .slice(0, 6); // Top 6 relevant gaps

  // ── 6. Dynamic Learning Roadmap ─────────────────────────────────────────────
  const roadmap = [];

  // Phase 1: Foundation gaps
  if (!hasCurrentSkill("Git") && !hasCurrentSkill("GitHub")) {
    roadmap.push({
      phase: "Phase 1: Engineering Foundation",
      focus: "Git version control & GitHub collaboration workflow",
      whyNow: "Git is required before you can work on any real project with other developers.",
      solves: "Eliminates lost work, enables team collaboration, and unlocks open-source contribution.",
      unlocks: "Every software engineering role and collaboration opportunity.",
    });
  }

  // Phase 2: Core language depth
  if (!hasCurrentSkill("JavaScript") && !hasCurrentSkill("Python")) {
    roadmap.push({
      phase: roadmap.length === 0 ? "Phase 1: Core Language" : "Phase 2: Core Language",
      focus: "JavaScript ES6+ fundamentals — async/await, closures, modules, OOP",
      whyNow: "A deep understanding of JavaScript unlocks React, Node.js, and the entire web ecosystem.",
      solves: "Eliminates surface-level knowledge that blocks career growth.",
      unlocks: "React, Node.js, TypeScript, and all modern web frameworks.",
    });
  } else if (!hasCurrentSkill("TypeScript") && (hasCurrentSkill("JavaScript") || hasCurrentSkill("React"))) {
    roadmap.push({
      phase: roadmap.length === 0 ? "Phase 1: Type Safety" : "Phase " + (roadmap.length + 1) + ": Type Safety",
      focus: "TypeScript — type annotations, generics, interfaces, strict mode",
      whyNow: "You already know JavaScript. Adding TypeScript is the highest-leverage next step for landing senior roles.",
      solves: "Eliminates runtime type errors and makes large codebases maintainable.",
      unlocks: "70% of senior frontend positions, Next.js, NestJS, Prisma.",
    });
  }

  // Phase 3: Frontend framework
  if (!hasCurrentSkill("React") && !hasCurrentSkill("Vue") && !hasCurrentSkill("Angular")) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": Frontend Framework",
      focus: "React.js — components, hooks, state management, routing",
      whyNow: "React is the #1 demanded frontend skill and opens a massive job market.",
      solves: "Replaces raw HTML/JS with scalable component-based architecture.",
      unlocks: "Frontend Engineer and Full Stack Developer career paths.",
    });
  } else if (!hasCurrentSkill("Next.js") && hasCurrentSkill("React")) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": Production React",
      focus: "Next.js — SSR, SSG, App Router, API routes, Vercel deployment",
      whyNow: "Next.js is now the default for all serious React applications. Your React knowledge transfers directly.",
      solves: "Enables SEO-friendly apps, API integration, and production deployment in one framework.",
      unlocks: "Full-stack development, Vercel deployment, and modern SaaS building.",
    });
  }

  // Phase 4: Backend
  if (!hasCurrentSkill("Node") && !hasCurrentSkill("Node.js") && !hasCurrentSkill("Python") && feCount >= 1) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": Backend Development",
      focus: "Node.js & Express — REST API design, middleware, authentication, databases",
      whyNow: "You have frontend skills. Adding a backend layer makes you full-stack and doubles your job options.",
      solves: "Removes dependency on third-party APIs and enables you to build complete applications.",
      unlocks: "Full Stack Developer title, higher salary bands, and architectural ownership.",
    });
  }

  // Phase 5: Database
  if (!hasCurrentSkill("MongoDB") && !hasCurrentSkill("PostgreSQL") && beCount >= 1) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": Data Persistence",
      focus: hasCurrentSkill("Node") || hasCurrentSkill("Node.js")
        ? "MongoDB + Mongoose — schema design, CRUD operations, aggregation pipelines"
        : "PostgreSQL + SQL — relational modeling, queries, joins, transactions",
      whyNow: "No application is complete without a database. This is the missing piece to building real products.",
      solves: "Enables permanent data storage, user accounts, and product features.",
      unlocks: "Ability to build and ship complete, production-ready applications.",
    });
  }

  // Phase 6: DevOps / Deployment
  if (!hasCurrentSkill("Docker") && (feCount + beCount) >= 3) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": DevOps & Deployment",
      focus: "Docker containers, CI/CD pipelines, cloud deployment on Render/AWS",
      whyNow: "You have the skills to build full applications. Now learn to ship them reliably to production.",
      solves: "Environment inconsistencies, manual deployments, and production outages.",
      unlocks: "Senior engineer readiness and the ability to own production systems.",
    });
  }

  // Phase 7: Testing
  if (!hasCurrentSkill("Testing") && !hasCurrentSkill("Jest") && !hasCurrentSkill("Vitest") && (feCount + beCount) >= 2) {
    roadmap.push({
      phase: "Phase " + (roadmap.length + 1) + ": Engineering Quality",
      focus: "Automated testing with Jest/Vitest — unit tests, integration tests, TDD",
      whyNow: "Professional engineering teams require tests. This skill separates junior from senior developers.",
      solves: "Prevents regressions, enables confident refactoring, and demonstrates code quality.",
      unlocks: "Senior engineer positions, higher-quality codebases, and team trust.",
    });
  }

  // Fallback if user already has many skills
  if (roadmap.length === 0) {
    roadmap.push({
      phase: "Phase 1: Architecture Mastery",
      focus: "System Design — scalability, load balancing, caching, distributed systems",
      whyNow: "Your technical foundation is solid. System design is the next level that unlocks senior and staff engineering roles.",
      solves: "Architectural bottlenecks and scalability challenges in production systems.",
      unlocks: "Senior Engineer and Tech Lead positions at top companies.",
    });
  }

  // ── 7. Ranked Career Directions ─────────────────────────────────────────────
  const careerDirections = [
    {
      role: "Frontend Engineer",
      matchPercentage: Math.max(20, Math.min(96, Math.round(feScore * 0.9 + (hasCurrentSkill("TypeScript") ? 10 : 0)))),
      whyFit: `Your ${currentSkills.filter((s) => FRONTEND_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))).slice(0, 3).join(", ") || "web development"} background maps directly to this role.`,
      supportedSkills: currentSkills.filter((s) => FRONTEND_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))),
      missingSkills: ["TypeScript", "Next.js", "Testing"].filter((s) => !hasCurrentSkill(s)).slice(0, 3),
      readiness: feScore >= 70 ? "High" : feScore >= 40 ? "Medium" : "Building",
    },
    {
      role: "Full Stack Developer",
      matchPercentage: Math.max(15, Math.min(95, Math.round(fsScore * 0.85))),
      whyFit: "Full Stack requires both frontend UI skills and backend API/database knowledge.",
      supportedSkills: currentSkills.filter((s) => [...FRONTEND_SKILLS_LIST, ...BACKEND_SKILLS_LIST].some((f) => s.toLowerCase().includes(f.toLowerCase()))),
      missingSkills: ["Node.js", "MongoDB", "Docker"].filter((s) => !hasCurrentSkill(s)),
      readiness: fsScore >= 60 ? "High" : fsScore >= 30 ? "Medium" : "Building",
    },
    {
      role: "Backend Engineer",
      matchPercentage: Math.max(10, Math.min(93, Math.round(beScore * 0.9 + (hasCurrentSkill("Docker") ? 8 : 0)))),
      whyFit: `Your ${currentSkills.filter((s) => BACKEND_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))).slice(0, 2).join(" and ") || "server-side"} skills support this career path.`,
      supportedSkills: currentSkills.filter((s) => BACKEND_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))),
      missingSkills: ["PostgreSQL", "Docker", "Redis"].filter((s) => !hasCurrentSkill(s)).slice(0, 3),
      readiness: beScore >= 70 ? "High" : beScore >= 40 ? "Medium" : "Building",
    },
    {
      role: "AI / ML Engineer",
      matchPercentage: Math.max(5, Math.min(90, Math.round(aiScore * 0.85))),
      whyFit: "AI engineering requires Python, ML fundamentals, and data processing skills.",
      supportedSkills: currentSkills.filter((s) => AI_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))),
      missingSkills: ["Python", "Machine Learning", "TensorFlow"].filter((s) => !hasCurrentSkill(s)).slice(0, 3),
      readiness: aiScore >= 60 ? "High" : aiScore >= 25 ? "Medium" : "Building",
    },
    {
      role: "DevOps / Cloud Engineer",
      matchPercentage: Math.max(5, Math.min(88, Math.round((devopsCount / 5) * 100 * 0.85))),
      whyFit: "DevOps engineering focuses on CI/CD, containerization, and cloud infrastructure.",
      supportedSkills: currentSkills.filter((s) => DEVOPS_SKILLS_LIST.some((f) => s.toLowerCase().includes(f.toLowerCase()))),
      missingSkills: ["Docker", "Kubernetes", "AWS"].filter((s) => !hasCurrentSkill(s)).slice(0, 3),
      readiness: devopsCount >= 4 ? "High" : devopsCount >= 2 ? "Medium" : "Building",
    },
  ].sort((a, b) => b.matchPercentage - a.matchPercentage);

  // ── 8. Strengths ─────────────────────────────────────────────────────────────
  const strengths = [];
  if (currentSkills.length > 0) {
    strengths.push(`Proficiency in ${currentSkills.slice(0, 3).join(", ")} — a solid foundation for modern web development.`);
  }
  if (feCount >= 2) strengths.push("Strong frontend development capability — able to build modern, responsive user interfaces.");
  if (beCount >= 2) strengths.push("Backend engineering experience — comfortable with server-side logic and data persistence.");
  if (hasCurrentSkill("Git") || hasCurrentSkill("GitHub")) strengths.push("Professional version control workflow — collaboration-ready.");
  if (strengths.length === 0) strengths.push("Growth mindset — actively investing in skill development.");

  // ── 9. Weaknesses ────────────────────────────────────────────────────────────
  const weaknesses = [];
  if (!hasCurrentSkill("Testing") && !hasCurrentSkill("Jest")) weaknesses.push("No automated testing skills — critical gap for professional engineering roles.");
  if (!hasCurrentSkill("TypeScript") && hasCurrentSkill("JavaScript")) weaknesses.push("Missing TypeScript — blocks entry to most senior frontend positions.");
  if (!hasCurrentSkill("Docker") && (feCount + beCount) >= 3) weaknesses.push("No containerization experience — required by 80% of backend job descriptions.");
  if (!hasCurrentSkill("Git") && !hasCurrentSkill("GitHub")) weaknesses.push("Version control not detected — foundational skill needed before everything else.");
  if (weaknesses.length === 0) weaknesses.push("Consider deepening system design and architectural patterns for senior-level readiness.");

  // ── 10. Portfolio Suggestions ─────────────────────────────────────────────────
  const portfolioSuggestions = [
    {
      area: "GitHub Profile",
      suggestion: "Add comprehensive README.md files to every repository. Include project description, tech stack, installation steps, screenshots, and a live demo link.",
      impact: "Recruiters judge GitHub profiles in under 30 seconds. A well-documented repo signals professionalism.",
    },
    {
      area: "Deployed Projects",
      suggestion: "Deploy at least 2 projects on Vercel (frontend) or Render (backend) with live URLs on your profile. Include a MERN or Next.js full-stack project.",
      impact: "Deployed projects prove you can ship code to production — the most important hiring signal.",
    },
    {
      area: "Showcase a Real Problem",
      suggestion: "Build one project that solves a real problem you personally faced. Document the problem, your solution, and the technical decisions made.",
      impact: "Demonstrates product thinking and engineering judgment beyond just technical skills.",
    },
  ];

  return {
    summary,
    readiness,
    inferredGoal,
    nextBestAction,
    careerDirections,
    masteredSkills: currentSkills,
    missingGaps,
    roadmap,
    strengths,
    weaknesses,
    portfolioSuggestions,
    // Meta
    currentSkillCount: currentSkills.length,
    hasEnoughData: currentSkills.length >= 2,
  };
}
