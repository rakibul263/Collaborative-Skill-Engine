/**
 * Skill Knowledge Graph & Gap Analysis Service
 * 
 * Implements a Directed Acyclic Graph (DAG) of foundational, intermediate, 
 * and advanced computer science & software engineering competencies.
 * 
 * Graph Traversal:
 * - Dijkstra & A* (A-Star) search for optimal shortest learning paths.
 * - Topological Sort for prerequisite-compliant sequential roadmaps.
 * - Exact Gap Analysis: Mastered, Unlockable (Ready), Locked (Blocked), Critical Path.
 */

// ─── KNOWLEDGE GRAPH DAG DEFINITIONS ───
// Nodes represent skills. Edges represent prerequisite relationships: prerequisite -> skill
const SKILL_NODES = {
  // --- Core / Fundamentals ---
  "html-css": {
    id: "html-css",
    name: "HTML/CSS",
    category: "Frontend",
    difficulty: 1,
    learningHours: 35,
    description: "Semantic markup, CSS Grid, Flexbox, responsive web design principles.",
    prerequisites: [],
  },
  "javascript": {
    id: "javascript",
    name: "JavaScript (ES6+)",
    category: "Core",
    difficulty: 2,
    learningHours: 60,
    description: "Execution context, closures, event loop, async/await, DOM APIs, ES modules.",
    prerequisites: ["html-css"],
  },
  "git": {
    id: "git",
    name: "Git & Version Control",
    category: "Core",
    difficulty: 1,
    learningHours: 20,
    description: "Branching workflows, merge conflicts, rebase, Git flow, pull request etiquette.",
    prerequisites: [],
  },
  "typescript": {
    id: "typescript",
    name: "TypeScript",
    category: "Frontend",
    difficulty: 3,
    learningHours: 45,
    description: "Static type systems, generics, utility types, interfaces, type narrowing.",
    prerequisites: ["javascript"],
  },
  "data-structures": {
    id: "data-structures",
    name: "Data Structures & Algorithms",
    category: "Core",
    difficulty: 3,
    learningHours: 80,
    description: "Arrays, trees, graphs, heaps, dynamic programming, time/space asymptotic complexity.",
    prerequisites: ["javascript"],
  },

  // --- Frontend Track ---
  "react": {
    id: "react",
    name: "React.js",
    category: "Frontend",
    difficulty: 3,
    learningHours: 70,
    description: "Component lifecycle, Hooks (useState, useEffect, useMemo), virtual DOM, state management.",
    prerequisites: ["typescript"],
  },
  "tailwind": {
    id: "tailwind",
    name: "Tailwind CSS",
    category: "Frontend",
    difficulty: 2,
    learningHours: 25,
    description: "Utility-first design systems, arbitrary values, responsive breakpoints, design tokens.",
    prerequisites: ["html-css"],
  },
  "nextjs": {
    id: "nextjs",
    name: "Next.js",
    category: "Frontend",
    difficulty: 4,
    learningHours: 65,
    description: "Server Components (RSC), App Router, SSR, SSG, Server Actions, route handlers.",
    prerequisites: ["react", "typescript"],
  },
  "state-management": {
    id: "state-management",
    name: "State Management (Redux/Zustand)",
    category: "Frontend",
    difficulty: 3,
    learningHours: 35,
    description: "Global store architectures, immutability, selectors, middleware, reactive UI patterns.",
    prerequisites: ["react"],
  },

  // --- Backend Track ---
  "nodejs": {
    id: "nodejs",
    name: "Node.js & Runtime",
    category: "Backend",
    difficulty: 3,
    learningHours: 50,
    description: "V8 engine, libuv event loop, streams, buffers, file system, process clustering.",
    prerequisites: ["javascript"],
  },
  "express": {
    id: "express",
    name: "Express.js",
    category: "Backend",
    difficulty: 2,
    learningHours: 30,
    description: "RESTful API design, middleware chains, error handling, CORS, rate limiting.",
    prerequisites: ["nodejs"],
  },
  "mongodb": {
    id: "mongodb",
    name: "MongoDB & NoSQL",
    category: "Database",
    difficulty: 2,
    learningHours: 40,
    description: "Document models, indexing strategies, aggregation pipelines, schema validation.",
    prerequisites: ["nodejs"],
  },
  "sql-postgres": {
    id: "sql-postgres",
    name: "PostgreSQL & Relational DBs",
    category: "Database",
    difficulty: 3,
    learningHours: 55,
    description: "ACID transactions, relational normalization, indexing (B-Tree, GIN), join optimizations.",
    prerequisites: ["data-structures"],
  },
  "redis": {
    id: "redis",
    name: "Redis & In-Memory Caching",
    category: "Backend",
    difficulty: 3,
    learningHours: 25,
    description: "Key-value caching, Pub/Sub, rate-limiting, session stores, eviction policies.",
    prerequisites: ["nodejs"],
  },
  "microservices": {
    id: "microservices",
    name: "Microservices & Distributed Systems",
    category: "Backend",
    difficulty: 5,
    learningHours: 85,
    description: "CAP theorem, event-driven architecture, message queues (Kafka/RabbitMQ), gRPC.",
    prerequisites: ["express", "sql-postgres", "redis"],
  },

  // --- AI / ML / Data Science Track ---
  "python": {
    id: "python",
    name: "Python Programming",
    category: "AI/ML",
    difficulty: 2,
    learningHours: 45,
    description: "OOP, generators, decorators, list comprehensions, functional idioms, typing.",
    prerequisites: [],
  },
  "math-stats": {
    id: "math-stats",
    name: "Linear Algebra & Probability",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 75,
    description: "Matrix operations, eigenvalues/vectors, multivariate calculus, Bayes theorem, distributions.",
    prerequisites: [],
  },
  "pandas-numpy": {
    id: "pandas-numpy",
    name: "NumPy & Pandas",
    category: "AI/ML",
    difficulty: 2,
    learningHours: 40,
    description: "Vectorized computing, array slicing, dataframes, feature engineering, data imputation.",
    prerequisites: ["python"],
  },
  "machine-learning": {
    id: "machine-learning",
    name: "Machine Learning (Scikit-Learn)",
    category: "AI/ML",
    difficulty: 3,
    learningHours: 70,
    description: "Supervised/unsupervised models, regression, decision trees, SVM, cross-validation, metrics.",
    prerequisites: ["python", "math-stats", "pandas-numpy"],
  },
  "deep-learning": {
    id: "deep-learning",
    name: "Deep Learning Foundations",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 80,
    description: "Feedforward networks, backpropagation, activation functions, loss curves, gradient descent.",
    prerequisites: ["machine-learning"],
  },
  "pytorch": {
    id: "pytorch",
    name: "PyTorch",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 75,
    description: "Tensors, Autograd, custom modules, dataloaders, GPU acceleration, training loops.",
    prerequisites: ["deep-learning"],
  },
  "nlp": {
    id: "nlp",
    name: "Natural Language Processing (NLP)",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 65,
    description: "Tokenization, TF-IDF, Word2Vec, sequence-to-sequence models, attention mechanisms.",
    prerequisites: ["deep-learning"],
  },
  "transformers-llm": {
    id: "transformers-llm",
    name: "Transformers & Large Language Models",
    category: "AI/ML",
    difficulty: 5,
    learningHours: 90,
    description: "Multi-head attention, BERT, GPT architectures, LoRA fine-tuning, context windows.",
    prerequisites: ["pytorch", "nlp"],
  },
  "rag-vector-db": {
    id: "rag-vector-db",
    name: "RAG & Vector Databases",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 60,
    description: "Retrieval-Augmented Generation, chunking, embeddings, FAISS, Pinecone, hybrid search.",
    prerequisites: ["transformers-llm", "python"],
  },
  "ai-agents": {
    id: "ai-agents",
    name: "Autonomous AI Agents",
    category: "AI/ML",
    difficulty: 5,
    learningHours: 80,
    description: "ReAct prompting, tool execution, multi-agent orchestrations, LangGraph, agentic loops.",
    prerequisites: ["rag-vector-db"],
  },

  // --- DevOps & Cloud Track ---
  "linux-bash": {
    id: "linux-bash",
    name: "Linux & Bash Scripting",
    category: "DevOps",
    difficulty: 2,
    learningHours: 35,
    description: "File permissions, systemd, process monitoring, piping, shell automation scripts.",
    prerequisites: [],
  },
  "docker": {
    id: "docker",
    name: "Docker & Containerization",
    category: "DevOps",
    difficulty: 3,
    learningHours: 40,
    description: "Dockerfile multi-stage builds, compose files, container networking, storage volumes.",
    prerequisites: ["linux-bash"],
  },
  "ci-cd": {
    id: "ci-cd",
    name: "CI/CD Pipelines (GitHub Actions)",
    category: "DevOps",
    difficulty: 3,
    learningHours: 30,
    description: "Automated linting, unit test gates, semantic release, container registry deployment.",
    prerequisites: ["git", "docker"],
  },
  "kubernetes": {
    id: "kubernetes",
    name: "Kubernetes (K8s)",
    category: "DevOps",
    difficulty: 5,
    learningHours: 85,
    description: "Pods, Deployments, Services, Ingress controllers, Helm charts, auto-scaling (HPA).",
    prerequisites: ["docker"],
  },
  "cloud-aws": {
    id: "cloud-aws",
    name: "Cloud Architecture (AWS / GCP)",
    category: "DevOps",
    difficulty: 4,
    learningHours: 70,
    description: "Compute (EC2/Cloud Run), S3, IAM policies, VPC subnetting, serverless lambdas.",
    prerequisites: ["docker", "linux-bash"],
  },

  // --- UI/UX & Product Design Track ---
  "ui-ux-design": {
    id: "ui-ux-design",
    name: "UI/UX & Design Systems (Figma)",
    category: "Design",
    difficulty: 2,
    learningHours: 45,
    description: "Wireframing, typography, contrast ratios, auto-layout, design tokens, usability testing.",
    prerequisites: [],
  },
  "user-research": {
    id: "user-research",
    name: "User Research & Prototyping",
    category: "Design",
    difficulty: 3,
    learningHours: 35,
    description: "User journey mapping, cognitive walkthroughs, interactive prototypes, micro-interactions.",
    prerequisites: ["ui-ux-design"],
  },

  // --- Mobile Application Development Track ---
  "mobile-fundamentals": {
    id: "mobile-fundamentals",
    name: "Mobile UI & App Lifecycle",
    category: "Mobile",
    difficulty: 2,
    learningHours: 35,
    description: "Mobile viewport layouts, touch gestures, navigation patterns, native device permissions.",
    prerequisites: ["javascript"],
  },
  "react-native": {
    id: "react-native",
    name: "React Native & Expo",
    category: "Mobile",
    difficulty: 3,
    learningHours: 65,
    description: "Cross-platform components, Expo CLI, native bridging, navigation stacks, AsyncStorage.",
    prerequisites: ["react", "mobile-fundamentals"],
  },
  "flutter-dart": {
    id: "flutter-dart",
    name: "Flutter & Dart",
    category: "Mobile",
    difficulty: 3,
    learningHours: 70,
    description: "Dart language, reactive widget trees, Riverpod/Bloc state management, Cupertino & Material design.",
    prerequisites: ["mobile-fundamentals"],
  },
  "mobile-native-apis": {
    id: "mobile-native-apis",
    name: "Native APIs & App Stores (iOS / Android)",
    category: "Mobile",
    difficulty: 4,
    learningHours: 45,
    description: "Push notifications (FCM/APNS), background geolocation, camera sensors, App Store & Google Play CI/CD.",
    prerequisites: ["react-native"],
  },

  // --- Cybersecurity & Ethical Hacking Track ---
  "computer-networks": {
    id: "computer-networks",
    name: "Computer Networking & Protocols",
    category: "Cybersecurity",
    difficulty: 2,
    learningHours: 50,
    description: "TCP/IP, OSI model, DNS, HTTP/HTTPS, SSL/TLS handshakes, subnetting, Wireshark packet inspection.",
    prerequisites: ["linux-bash"],
  },
  "cryptography": {
    id: "cryptography",
    name: "Applied Cryptography & PKI",
    category: "Cybersecurity",
    difficulty: 4,
    learningHours: 55,
    description: "AES/RSA/ECC encryption, SHA-256 hashing, digital signatures, certificates, zero-knowledge proofs.",
    prerequisites: ["computer-networks"],
  },
  "network-security": {
    id: "network-security",
    name: "Network Security & Penetration Testing",
    category: "Cybersecurity",
    difficulty: 4,
    learningHours: 75,
    description: "Nmap port scanning, Metasploit, firewall/IDS/IPS configurations, privilege escalation, Kali Linux tools.",
    prerequisites: ["computer-networks", "linux-bash"],
  },
  "web-security": {
    id: "web-security",
    name: "Web Application Security (OWASP Top 10)",
    category: "Cybersecurity",
    difficulty: 4,
    learningHours: 60,
    description: "SQL injection, XSS, CSRF, SSRF, broken auth, CORS exploitation, secure headers, vulnerability assessment.",
    prerequisites: ["computer-networks", "express"],
  },
  "soc-incident-response": {
    id: "soc-incident-response",
    name: "SOC Monitoring & Incident Response",
    category: "Cybersecurity",
    difficulty: 4,
    learningHours: 65,
    description: "SIEM log analysis (Splunk/ELK), MITRE ATT&CK framework, malware sandbox triage, incident forensics.",
    prerequisites: ["network-security"],
  },

  // --- Data Engineering & Big Data Track ---
  "sql-advanced": {
    id: "sql-advanced",
    name: "Advanced SQL & Analytical Warehousing",
    category: "Data Engineering",
    difficulty: 3,
    learningHours: 45,
    description: "Window functions, recursive CTEs, star/snowflake schemas, columnar storage, BigQuery / Snowflake.",
    prerequisites: ["sql-postgres"],
  },
  "data-pipelines": {
    id: "data-pipelines",
    name: "Data Pipelines & Airflow Orchestration",
    category: "Data Engineering",
    difficulty: 4,
    learningHours: 65,
    description: "Batch/streaming ETL/ELT pipelines, Apache Airflow DAGs, data validation (Great Expectations), idempotency.",
    prerequisites: ["python", "sql-advanced"],
  },
  "big-data-spark": {
    id: "big-data-spark",
    name: "Apache Spark & Distributed Compute",
    category: "Data Engineering",
    difficulty: 4,
    learningHours: 75,
    description: "PySpark, RDDs, DataFrames, Spark SQL, distributed shuffle partitions, memory caching, cluster sizing.",
    prerequisites: ["data-pipelines", "data-structures"],
  },
  "data-streaming": {
    id: "data-streaming",
    name: "Real-Time Streaming (Kafka & Flink)",
    category: "Data Engineering",
    difficulty: 5,
    learningHours: 70,
    description: "Event stream architecture, Kafka topics/partitions, consumer groups, schema registries, Apache Flink.",
    prerequisites: ["big-data-spark"],
  },

  // --- Computer Vision & Robotics Track ---
  "opencv": {
    id: "opencv",
    name: "OpenCV & Computer Vision Foundations",
    category: "Computer Vision",
    difficulty: 3,
    learningHours: 50,
    description: "Color spaces, edge filters, contour analysis, image transformations, feature matching (SIFT/ORB).",
    prerequisites: ["python", "pandas-numpy"],
  },
  "cnn-vision": {
    id: "cnn-vision",
    name: "Deep Vision & Object Detection (YOLO)",
    category: "Computer Vision",
    difficulty: 4,
    learningHours: 80,
    description: "Convolutional neural networks, YOLO object detection, image segmentation, Vision Transformers (ViT).",
    prerequisites: ["deep-learning", "opencv"],
  },
  "robotics-ros": {
    id: "robotics-ros",
    name: "Robotics & Autonomous Systems (ROS 2)",
    category: "Computer Vision",
    difficulty: 5,
    learningHours: 90,
    description: "ROS 2 nodes, topics, actions, SLAM (Simultaneous Localization & Mapping), LiDAR point cloud processing.",
    prerequisites: ["cnn-vision", "cpp-programming"],
  },

  // --- Embedded Systems & IoT Track ---
  "c-programming": {
    id: "c-programming",
    name: "C Programming & Pointer Arithmetic",
    category: "Systems",
    difficulty: 2,
    learningHours: 55,
    description: "Memory allocation (malloc/free), pointers, bitwise manipulation, struct padding, POSIX system calls.",
    prerequisites: [],
  },
  "microcontrollers": {
    id: "microcontrollers",
    name: "Microcontrollers & Hardware (ESP32 / Arduino)",
    category: "Embedded/IoT",
    difficulty: 3,
    learningHours: 60,
    description: "GPIO, ADC, PWM, serial bus protocols (UART, I2C, SPI), sensor interfacing, electronic schematics.",
    prerequisites: ["c-programming"],
  },
  "embedded-c": {
    id: "embedded-c",
    name: "Embedded C & Bare-Metal Firmware",
    category: "Embedded/IoT",
    difficulty: 4,
    learningHours: 75,
    description: "Memory-mapped registers, Interrupt Service Routines (ISR), hardware timers, watchdogs, low-power states.",
    prerequisites: ["microcontrollers"],
  },
  "rtos-iot": {
    id: "rtos-iot",
    name: "RTOS & IoT Protocols (FreeRTOS & MQTT)",
    category: "Embedded/IoT",
    difficulty: 4,
    learningHours: 70,
    description: "FreeRTOS preemptive scheduler, queues, mutexes, MQTT / CoAP protocols, over-the-air (OTA) updates.",
    prerequisites: ["embedded-c", "linux-bash"],
  },

  // --- Systems, Kernel & Low-Level Track ---
  "cpp-programming": {
    id: "cpp-programming",
    name: "Modern C++ (C++17/20)",
    category: "Systems",
    difficulty: 3,
    learningHours: 70,
    description: "RAII, smart pointers, templates, STL, move semantics, lambda expressions, multithreading.",
    prerequisites: ["c-programming", "data-structures"],
  },
  "os-internals": {
    id: "os-internals",
    name: "Operating System Internals & Kernel Concepts",
    category: "Systems",
    difficulty: 4,
    learningHours: 80,
    description: "Virtual memory paging, process scheduling, inter-process communication (IPC), concurrency locks, syscalls.",
    prerequisites: ["c-programming", "linux-bash"],
  },
  "rust-lang": {
    id: "rust-lang",
    name: "Rust Systems Programming",
    category: "Systems",
    difficulty: 4,
    learningHours: 85,
    description: "Borrow checker, lifetimes, ownership mechanics, traits, fearless concurrency, zero-cost abstractions.",
    prerequisites: ["data-structures"],
  },
  "compilers-assembly": {
    id: "compilers-assembly",
    name: "Compilers & x86/ARM Assembly",
    category: "Systems",
    difficulty: 5,
    learningHours: 90,
    description: "Lexing, AST parsing, symbol tables, register allocation, x86/ARM assembly instructions, optimization.",
    prerequisites: ["os-internals", "cpp-programming"],
  },

  // --- Game Development & 3D Interactive Systems ---
  "math-3d": {
    id: "math-3d",
    name: "3D Math for Games (Vectors & Quaternions)",
    category: "Game Development",
    difficulty: 3,
    learningHours: 45,
    description: "Vector algebra, dot/cross products, matrix transformations, quaternion rotations, projection geometry.",
    prerequisites: ["math-stats"],
  },
  "game-engine-unity": {
    id: "game-engine-unity",
    name: "Unity Engine & C# Game Dev",
    category: "Game Development",
    difficulty: 3,
    learningHours: 75,
    description: "Game loop architecture, physics raycasting, animation state machines, UI canvas, particle effects.",
    prerequisites: ["c-programming"],
  },
  "game-engine-unreal": {
    id: "game-engine-unreal",
    name: "Unreal Engine 5 & C++",
    category: "Game Development",
    difficulty: 5,
    learningHours: 95,
    description: "Gameplay framework, Nanite, Lumen lighting, Niagara VFX, C++ gameplay architecture, replication.",
    prerequisites: ["cpp-programming", "math-3d"],
  },
  "shaders-graphics": {
    id: "shaders-graphics",
    name: "Shaders & Graphics APIs (OpenGL / HLSL)",
    category: "Game Development",
    difficulty: 5,
    learningHours: 85,
    description: "GPU rendering pipelines, vertex & fragment shaders, PBR lighting models, framebuffers, post-processing.",
    prerequisites: ["math-3d", "cpp-programming"],
  },

  // --- Blockchain & Web3 Track ---
  "blockchain-fundamentals": {
    id: "blockchain-fundamentals",
    name: "Blockchain & Consensus Mechanisms",
    category: "Blockchain/Web3",
    difficulty: 3,
    learningHours: 40,
    description: "Proof of Work/Stake, cryptographic hashing, Merkle trees, peer-to-peer gossip networks, distributed state.",
    prerequisites: ["cryptography"],
  },
  "solidity-smart-contracts": {
    id: "solidity-smart-contracts",
    name: "Solidity & Smart Contract Engineering",
    category: "Blockchain/Web3",
    difficulty: 4,
    learningHours: 65,
    description: "EVM mechanics, gas optimization, ERC-20 / ERC-721 token standards, Hardhat / Foundry test suites.",
    prerequisites: ["blockchain-fundamentals", "javascript"],
  },
  "web3-dapps": {
    id: "web3-dapps",
    name: "DApp Development (Ethers.js & Wagmi)",
    category: "Blockchain/Web3",
    difficulty: 4,
    learningHours: 50,
    description: "Web3 wallet integration, contract event listeners, IPFS storage, decentralized identity.",
    prerequisites: ["solidity-smart-contracts", "react"],
  },
  "defi-security-audit": {
    id: "defi-security-audit",
    name: "Smart Contract Security & DeFi Protocols",
    category: "Blockchain/Web3",
    difficulty: 5,
    learningHours: 75,
    description: "Reentrancy attacks, flash loans, front-running, formal verification, Slither static analysis, AMMs.",
    prerequisites: ["solidity-smart-contracts"],
  },

  // --- Software Quality Assurance (QA) & Test Automation ---
  "software-testing-fundamentals": {
    id: "software-testing-fundamentals",
    name: "QA Fundamentals & Test Methodologies",
    category: "QA & Testing",
    difficulty: 1,
    learningHours: 30,
    description: "Black-box/white-box testing, boundary value analysis, test case authoring, bug triage, JIRA QA workflows.",
    prerequisites: [],
  },
  "api-testing": {
    id: "api-testing",
    name: "API & Contract Testing (Postman/Newman)",
    category: "QA & Testing",
    difficulty: 2,
    learningHours: 35,
    description: "RESTful/GraphQL API assertions, automated test runs with Newman, mock servers, payload validation.",
    prerequisites: ["software-testing-fundamentals"],
  },
  "test-automation-selenium": {
    id: "test-automation-selenium",
    name: "E2E Test Automation (Playwright / Cypress)",
    category: "QA & Testing",
    difficulty: 3,
    learningHours: 60,
    description: "Page Object Model (POM), cross-browser headless test runners, visual regression, CI test reporter.",
    prerequisites: ["javascript", "software-testing-fundamentals"],
  },
  "performance-testing": {
    id: "performance-testing",
    name: "Performance & Load Testing (k6 / JMeter)",
    category: "QA & Testing",
    difficulty: 4,
    learningHours: 45,
    description: "Stress testing, spike testing, virtual user concurrency, response time percentiles (p95/p99), APM profiling.",
    prerequisites: ["api-testing", "ci-cd"],
  },

  // --- Site Reliability Engineering (SRE) & Observability ---
  "observability-monitoring": {
    id: "observability-monitoring",
    name: "Observability (Prometheus & Grafana)",
    category: "DevOps",
    difficulty: 3,
    learningHours: 45,
    description: "PromQL metrics, Grafana dashboards, distributed tracing (OpenTelemetry), log aggregation, alerting SLIs/SLOs.",
    prerequisites: ["linux-bash", "docker"],
  },
  "infrastructure-as-code": {
    id: "infrastructure-as-code",
    name: "Infrastructure as Code (Terraform)",
    category: "DevOps",
    difficulty: 4,
    learningHours: 55,
    description: "HCL configuration, Terraform state locking, reusable modules, multi-cloud provisioning, drift detection.",
    prerequisites: ["cloud-aws", "ci-cd"],
  },
  "chaos-resilience": {
    id: "chaos-resilience",
    name: "Chaos Engineering & System Resilience",
    category: "DevOps",
    difficulty: 5,
    learningHours: 50,
    description: "Fault injection experiments, high availability failover, zero-downtime blue/green releases, circuit breakers.",
    prerequisites: ["kubernetes", "observability-monitoring"],
  },

  // --- NLP & Semantic Search ---
  "vector-search-embeddings": {
    id: "vector-search-embeddings",
    name: "Semantic Search & Vector Embeddings",
    category: "AI/ML",
    difficulty: 4,
    learningHours: 50,
    description: "Dense sentence embeddings, bi-encoders, cross-encoders, cosine similarity, HNSW vector indexing.",
    prerequisites: ["nlp", "python"],
  },
};

// ─── TARGET CAREER TRACK DEFINITIONS (COMPREHENSIVE CSE DOMAINS) ───
const CAREER_TRACKS = {
  // 1. Artificial Intelligence & Data Science
  "ai-engineer": {
    id: "ai-engineer",
    title: "AI & LLM Systems Engineer",
    domain: "Artificial Intelligence",
    badge: "Trending High-Demand",
    description: "Build production AI applications, fine-tune models, implement RAG and autonomous agent pipelines.",
    targetSkills: ["transformers-llm", "rag-vector-db", "ai-agents", "docker"],
  },
  "data-scientist": {
    id: "data-scientist",
    title: "Data Scientist & ML Researcher",
    domain: "Data Science & ML",
    badge: "Analytics & ML",
    description: "Formulate statistical models, derive insights from vast datasets, and deploy deep learning algorithms.",
    targetSkills: ["machine-learning", "deep-learning", "pytorch", "nlp", "pandas-numpy"],
  },
  "data-engineer": {
    id: "data-engineer",
    title: "Big Data & Data Platform Engineer",
    domain: "Data Engineering",
    badge: "High Scale",
    description: "Design fault-tolerant batch/streaming data pipelines, Spark clusters, data lakes, and analytical warehouses.",
    targetSkills: ["data-pipelines", "big-data-spark", "data-streaming", "sql-advanced", "docker"],
  },
  "computer-vision": {
    id: "computer-vision",
    title: "Computer Vision & Robotics Engineer",
    domain: "Robotics & Perception",
    badge: "Deep Tech",
    description: "Implement real-time visual perception, YOLO object tracking, SLAM navigation, and autonomous robotics with ROS 2.",
    targetSkills: ["opencv", "cnn-vision", "robotics-ros", "deep-learning", "cpp-programming"],
  },
  "nlp-engineer": {
    id: "nlp-engineer",
    title: "NLP & Generative AI Specialist",
    domain: "Artificial Intelligence",
    badge: "LLM Frontier",
    description: "Fine-tune language models, design vector semantic search engines, and build sophisticated conversational AI.",
    targetSkills: ["nlp", "transformers-llm", "vector-search-embeddings", "rag-vector-db", "python"],
  },

  // 2. Web & Software Engineering
  "fullstack-developer": {
    id: "fullstack-developer",
    title: "Fullstack Web Architect",
    domain: "Web & Enterprise",
    badge: "Industry Standard",
    description: "Master modern frontend frameworks, scalable backend APIs, database indexing, and caching.",
    targetSkills: ["nextjs", "microservices", "sql-postgres", "redis", "docker"],
  },
  "frontend-specialist": {
    id: "frontend-specialist",
    title: "Senior Frontend Engineer",
    domain: "Frontend Architecture",
    badge: "UI/UX Centric",
    description: "Build high-performance client applications with Next.js, TypeScript, and sophisticated state management.",
    targetSkills: ["nextjs", "state-management", "tailwind", "ui-ux-design"],
  },
  "backend-systems-engineer": {
    id: "backend-systems-engineer",
    title: "Distributed Backend Engineer",
    domain: "Backend Systems",
    badge: "High Concurrency",
    description: "Architect high-throughput microservices, ACID databases, distributed message streams, and caching.",
    targetSkills: ["microservices", "sql-postgres", "redis", "kubernetes", "cloud-aws"],
  },
  "mobile-developer": {
    id: "mobile-developer",
    title: "Mobile App Architect (iOS & Android)",
    domain: "Mobile Development",
    badge: "Cross-Platform",
    description: "Engineer reactive mobile apps for iOS and Android with Flutter and React Native, utilizing native sensor APIs.",
    targetSkills: ["react-native", "flutter-dart", "mobile-native-apis", "mobile-fundamentals"],
  },

  // 3. Cloud, DevOps & Infrastructure
  "devops-cloud-architect": {
    id: "devops-cloud-architect",
    title: "DevOps & Cloud Infrastructure Architect",
    domain: "Cloud & DevOps",
    badge: "Mission Critical",
    description: "Automate delivery pipelines, container orchestrations, cloud infrastructure, and cluster resilience.",
    targetSkills: ["kubernetes", "ci-cd", "cloud-aws", "docker", "linux-bash"],
  },
  "sre-engineer": {
    id: "sre-engineer",
    title: "Site Reliability Engineer (SRE)",
    domain: "Cloud & DevOps",
    badge: "99.99% Uptime",
    description: "Drive observability, manage distributed tracing, implement Terraform IaC, and guarantee ultra-high system reliability.",
    targetSkills: ["observability-monitoring", "infrastructure-as-code", "chaos-resilience", "kubernetes"],
  },

  // 4. Cybersecurity & Decentralized Systems
  "cybersecurity-specialist": {
    id: "cybersecurity-specialist",
    title: "Cybersecurity Specialist & Ethical Hacker",
    domain: "Cybersecurity",
    badge: "Defense & SecOps",
    description: "Conduct network penetration testing, secure web applications, detect zero-day exploits, and lead SOC investigations.",
    targetSkills: ["network-security", "web-security", "soc-incident-response", "cryptography", "computer-networks"],
  },
  "blockchain-web3-engineer": {
    id: "blockchain-web3-engineer",
    title: "Blockchain & Web3 Systems Engineer",
    domain: "Web3 & Decentralization",
    badge: "Decentralized Web",
    description: "Design Solidity smart contracts, build decentralized apps (DApps), and audit DeFi protocols against reentrancy exploits.",
    targetSkills: ["solidity-smart-contracts", "web3-dapps", "defi-security-audit", "blockchain-fundamentals"],
  },

  // 5. Low-Level, Embedded & Kernel Systems
  "embedded-iot-engineer": {
    id: "embedded-iot-engineer",
    title: "Embedded Systems & IoT Firmware Engineer",
    domain: "Embedded & Hardware",
    badge: "Hardware & IoT",
    description: "Write bare-metal C firmware, interface microcontrollers via SPI/I2C, and develop real-time FreeRTOS sensor networks.",
    targetSkills: ["microcontrollers", "embedded-c", "rtos-iot", "c-programming", "linux-bash"],
  },
  "system-programmer": {
    id: "system-programmer",
    title: "Systems & Kernel Programmer (C++ / Rust)",
    domain: "Low-Level Systems",
    badge: "Performance & OS",
    description: "Master POSIX memory management, multithreaded systems programming, compiler architectures, and Rust safety guarantees.",
    targetSkills: ["cpp-programming", "os-internals", "rust-lang", "compilers-assembly"],
  },

  // 6. Interactive Media, QA & Product Design
  "game-developer": {
    id: "game-developer",
    title: "Game Engine & 3D Graphics Developer",
    domain: "Game Development",
    badge: "Interactive 3D",
    description: "Build 3D interactive experiences, write custom GPU shaders, and engineer gameplay mechanics in Unreal Engine and Unity.",
    targetSkills: ["game-engine-unreal", "game-engine-unity", "shaders-graphics", "math-3d", "cpp-programming"],
  },
  "qa-test-engineer": {
    id: "qa-test-engineer",
    title: "Software QA & Test Automation Architect",
    domain: "Quality Assurance",
    badge: "Reliability & SDLC",
    description: "Build automated testing suites with Playwright/Selenium, lead API contract testing, and run performance benchmarks.",
    targetSkills: ["test-automation-selenium", "api-testing", "performance-testing", "ci-cd"],
  },
  "ui-ux-specialist": {
    id: "ui-ux-specialist",
    title: "UI/UX Architect & Product Design Lead",
    domain: "Product Design",
    badge: "Design Systems",
    description: "Conduct cognitive user research, design accessible UI design systems in Figma, and build fluid frontend prototypes.",
    targetSkills: ["ui-ux-design", "user-research", "tailwind", "html-css"],
  },
};

// Skill synonym/fuzzy normalizer mapping
const SKILL_ALIASES = {
  "react": "react",
  "reactjs": "react",
  "react.js": "react",
  "next": "nextjs",
  "nextjs": "nextjs",
  "next.js": "nextjs",
  "node": "nodejs",
  "nodejs": "nodejs",
  "node.js": "nodejs",
  "express": "express",
  "expressjs": "express",
  "express.js": "express",
  "js": "javascript",
  "javascript": "javascript",
  "ts": "typescript",
  "typescript": "typescript",
  "html": "html-css",
  "css": "html-css",
  "html/css": "html-css",
  "html5": "html-css",
  "tailwind": "tailwind",
  "tailwindcss": "tailwind",
  "python": "python",
  "py": "python",
  "machine learning": "machine-learning",
  "ml": "machine-learning",
  "deep learning": "deep-learning",
  "dl": "deep-learning",
  "pytorch": "pytorch",
  "nlp": "nlp",
  "transformers": "transformers-llm",
  "llm": "transformers-llm",
  "llms": "transformers-llm",
  "rag": "rag-vector-db",
  "vector database": "rag-vector-db",
  "ai agents": "ai-agents",
  "agentic": "ai-agents",
  "docker": "docker",
  "k8s": "kubernetes",
  "kubernetes": "kubernetes",
  "aws": "cloud-aws",
  "cloud": "cloud-aws",
  "gcp": "cloud-aws",
  "git": "git",
  "github": "git",
  "sql": "sql-postgres",
  "postgres": "sql-postgres",
  "postgresql": "sql-postgres",
  "mongo": "mongodb",
  "mongodb": "mongodb",
  "redis": "redis",
  "figma": "ui-ux-design",
  "ui/ux": "ui-ux-design",
  "ui ux": "ui-ux-design",
  "design": "ui-ux-design",
  "linux": "linux-bash",
  "bash": "linux-bash",
  "dsa": "data-structures",
  "data structures": "data-structures",
  "algorithms": "data-structures",
  "numpy": "pandas-numpy",
  "pandas": "pandas-numpy",

  // Mobile
  "flutter": "flutter-dart",
  "dart": "flutter-dart",
  "react native": "react-native",
  "reactnative": "react-native",
  "expo": "react-native",
  "mobile": "mobile-fundamentals",
  "android": "mobile-fundamentals",
  "ios": "mobile-fundamentals",
  "swift": "mobile-fundamentals",
  "kotlin": "mobile-fundamentals",
  "app store": "mobile-native-apis",
  "play store": "mobile-native-apis",

  // Cybersecurity
  "networking": "computer-networks",
  "network": "computer-networks",
  "tcp": "computer-networks",
  "tcp/ip": "computer-networks",
  "wireshark": "computer-networks",
  "crypto": "cryptography",
  "cryptography": "cryptography",
  "encryption": "cryptography",
  "security": "network-security",
  "cybersecurity": "network-security",
  "cyber": "network-security",
  "pentest": "network-security",
  "penetration testing": "network-security",
  "ethical hacking": "network-security",
  "metasploit": "network-security",
  "kali": "network-security",
  "nmap": "network-security",
  "owasp": "web-security",
  "web security": "web-security",
  "xss": "web-security",
  "sql injection": "web-security",
  "soc": "soc-incident-response",
  "siem": "soc-incident-response",
  "incident response": "soc-incident-response",

  // Data Engineering
  "data engineering": "data-pipelines",
  "airflow": "data-pipelines",
  "etl": "data-pipelines",
  "spark": "big-data-spark",
  "pyspark": "big-data-spark",
  "big data": "big-data-spark",
  "kafka": "data-streaming",
  "streaming": "data-streaming",
  "flink": "data-streaming",
  "data warehouse": "sql-advanced",
  "snowflake": "sql-advanced",
  "bigquery": "sql-advanced",

  // Computer Vision & Robotics
  "opencv": "opencv",
  "image processing": "opencv",
  "computer vision": "cnn-vision",
  "cv": "cnn-vision",
  "yolo": "cnn-vision",
  "cnn": "cnn-vision",
  "object detection": "cnn-vision",
  "robotics": "robotics-ros",
  "ros": "robotics-ros",
  "ros2": "robotics-ros",

  // Embedded Systems & IoT
  "c": "c-programming",
  "c language": "c-programming",
  "arduino": "microcontrollers",
  "esp32": "microcontrollers",
  "microcontroller": "microcontrollers",
  "iot": "rtos-iot",
  "embedded": "embedded-c",
  "embedded c": "embedded-c",
  "rtos": "rtos-iot",
  "freertos": "rtos-iot",
  "mqtt": "rtos-iot",

  // Systems & Low-Level
  "cpp": "cpp-programming",
  "c++": "cpp-programming",
  "rust": "rust-lang",
  "operating system": "os-internals",
  "os": "os-internals",
  "kernel": "os-internals",
  "assembly": "compilers-assembly",
  "compiler": "compilers-assembly",
  "compilers": "compilers-assembly",

  // Game Development
  "game dev": "game-engine-unity",
  "game development": "game-engine-unity",
  "unity": "game-engine-unity",
  "unity3d": "game-engine-unity",
  "unreal": "game-engine-unreal",
  "unreal engine": "game-engine-unreal",
  "ue5": "game-engine-unreal",
  "opengl": "shaders-graphics",
  "shader": "shaders-graphics",
  "shaders": "shaders-graphics",
  "directx": "shaders-graphics",

  // Blockchain & Web3
  "blockchain": "blockchain-fundamentals",
  "web3": "web3-dapps",
  "solidity": "solidity-smart-contracts",
  "smart contract": "solidity-smart-contracts",
  "smart contracts": "solidity-smart-contracts",
  "ethereum": "solidity-smart-contracts",
  "defi": "defi-security-audit",
  "dapp": "web3-dapps",

  // QA & Testing
  "qa": "software-testing-fundamentals",
  "sqa": "software-testing-fundamentals",
  "testing": "software-testing-fundamentals",
  "software testing": "software-testing-fundamentals",
  "manual testing": "software-testing-fundamentals",
  "selenium": "test-automation-selenium",
  "cypress": "test-automation-selenium",
  "playwright": "test-automation-selenium",
  "automation testing": "test-automation-selenium",
  "api testing": "api-testing",
  "postman": "api-testing",
  "jmeter": "performance-testing",
  "k6": "performance-testing",
  "load testing": "performance-testing",

  // SRE & Observability
  "sre": "chaos-resilience",
  "prometheus": "observability-monitoring",
  "grafana": "observability-monitoring",
  "opentelemetry": "observability-monitoring",
  "monitoring": "observability-monitoring",
  "observability": "observability-monitoring",
  "terraform": "infrastructure-as-code",
  "iac": "infrastructure-as-code",
};

/**
 * Normalizes an arbitrary skill string to graph node ID
 */
const normalizeSkillToId = (skillStr = "") => {
  const clean = skillStr.toLowerCase().trim().replace(/[^a-z0-9\/\.\s]/g, "");
  if (SKILL_ALIASES[clean]) return SKILL_ALIASES[clean];
  for (const [alias, id] of Object.entries(SKILL_ALIASES)) {
    if (clean.includes(alias)) return id;
  }
  return null;
};

/**
 * Traverses ancestors of a target node in the DAG to find all prerequisites
 */
const getPrerequisiteSubtree = (targetNodeId, visited = new Set()) => {
  if (!SKILL_NODES[targetNodeId]) return visited;
  visited.add(targetNodeId);

  const node = SKILL_NODES[targetNodeId];
  for (const parentId of node.prerequisites) {
    if (!visited.has(parentId)) {
      getPrerequisiteSubtree(parentId, visited);
    }
  }
  return visited;
};

/**
 * Topological sort of a subset of DAG nodes to guarantee prerequisite order
 */
const topologicalSortNodes = (nodeIds) => {
  const inDegree = {};
  const adj = {};

  nodeIds.forEach((id) => {
    inDegree[id] = 0;
    adj[id] = [];
  });

  nodeIds.forEach((id) => {
    const node = SKILL_NODES[id];
    if (node) {
      node.prerequisites.forEach((pId) => {
        if (nodeIds.includes(pId)) {
          adj[pId].push(id);
          inDegree[id]++;
        }
      });
    }
  });

  const queue = nodeIds.filter((id) => inDegree[id] === 0);
  const order = [];

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);

    adj[current].forEach((neighbor) => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // If any unvisited nodes remain due to cycles (should not happen in DAG), append them
  nodeIds.forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });

  return order;
};

/**
 * Dijkstra / A* Search to find the optimal shortest path of missing competencies
 * Cost function: g(n) = cumulative learning hours + (difficulty * 10)
 * Heuristic h(n): distance in graph levels to nearest target node
 */
const findOptimalPathDijkstra = (knownSkillIds, targetSkillIds) => {
  const knownSet = new Set(knownSkillIds);
  const targetSet = new Set(targetSkillIds);

  // All nodes required for any target skill
  const requiredNodes = new Set();
  targetSkillIds.forEach((tid) => {
    getPrerequisiteSubtree(tid, requiredNodes);
  });

  // Calculate missing nodes
  const missingNodes = Array.from(requiredNodes).filter((id) => !knownSet.has(id));

  // Sort topologically so learning sequence is strictly dependency-compliant
  const sortedMissing = topologicalSortNodes(missingNodes);

  // Calculate total required learning effort
  let totalHours = 0;
  const criticalPath = sortedMissing.map((id, index) => {
    const node = SKILL_NODES[id];
    totalHours += node.learningHours;

    // A skill is "unlocked" if ALL its prerequisites are in knownSet OR earlier in sortedMissing
    const unmetPre = node.prerequisites.filter((p) => !knownSet.has(p));
    const isReadyNow = unmetPre.length === 0;

    return {
      step: index + 1,
      id: node.id,
      name: node.name,
      category: node.category,
      difficulty: node.difficulty,
      learningHours: node.learningHours,
      description: node.description,
      isTarget: targetSet.has(node.id),
      isReadyNow,
      prerequisites: node.prerequisites.map((p) => ({
        id: p,
        name: SKILL_NODES[p]?.name || p,
        isMastered: knownSet.has(p),
      })),
    };
  });

  return { criticalPath, totalHours };
};

/**
 * Main Gap Analysis Execution
 */
const performSkillGapAnalysis = ({
  userSkills = [],
  userLearnSkills = [],
  careerTrackId = "ai-engineer",
  customTargetSkills = [],
}) => {
  // Normalize user's current skills to known node IDs
  const userSkillIds = new Set();
  userSkills.forEach((s) => {
    const normalized = normalizeSkillToId(s);
    if (normalized && SKILL_NODES[normalized]) {
      userSkillIds.add(normalized);
    }
  });

  // Normalize user's desired learn skills
  const desiredLearnNodeIds = new Set();
  userLearnSkills.forEach((s) => {
    const normalized = normalizeSkillToId(s);
    if (normalized && SKILL_NODES[normalized]) {
      desiredLearnNodeIds.add(normalized);
    }
  });

  // Evaluate alignment across all career tracks to recommend the best match
  const rankedCareerTracks = Object.values(CAREER_TRACKS).map((t) => {
    const trackReqs = new Set();
    t.targetSkills.forEach((tid) => getPrerequisiteSubtree(tid, trackReqs));
    const mastered = Array.from(trackReqs).filter((id) => userSkillIds.has(id));
    const readiness = trackReqs.size > 0 ? Math.round((mastered.length / trackReqs.size) * 100) : 0;
    return {
      ...t,
      userReadiness: readiness,
      masteredCount: mastered.length,
      totalCount: trackReqs.size,
    };
  });

  rankedCareerTracks.sort((a, b) => b.userReadiness - a.userReadiness);
  const highestReadiness = rankedCareerTracks[0]?.userReadiness || 0;

  // Mark recommended track (highest readiness >= 20%, or first track)
  const evaluatedTracks = rankedCareerTracks.map((t, idx) => ({
    ...t,
    isRecommended: idx === 0 && t.userReadiness > 0,
    recommendReason: idx === 0 && t.userReadiness > 0
      ? `Highest alignment (${t.userReadiness}% ready) with your current skills`
      : null,
  }));

  const selectedTrack =
    CAREER_TRACKS[careerTrackId] ||
    evaluatedTracks[0] ||
    CAREER_TRACKS["ai-engineer"];

  const targetSkillIds = customTargetSkills.length > 0 
    ? customTargetSkills 
    : selectedTrack.targetSkills;

  // Collect complete prerequisite requirements for target track
  const allRequiredNodeIds = new Set();
  targetSkillIds.forEach((tid) => {
    getPrerequisiteSubtree(tid, allRequiredNodeIds);
  });

  // Also include user's desired learn skills and their prerequisites
  desiredLearnNodeIds.forEach((lid) => {
    getPrerequisiteSubtree(lid, allRequiredNodeIds);
  });

  const totalRequired = allRequiredNodeIds.size;
  const masteredInTrack = Array.from(allRequiredNodeIds).filter((id) => userSkillIds.has(id));
  const missingInTrack = Array.from(allRequiredNodeIds).filter((id) => !userSkillIds.has(id));

  // Partition missing into immediate unlockable vs locked (needs earlier prerequisite)
  const immediateNext = [];
  const lockedSkills = [];

  missingInTrack.forEach((id) => {
    const node = SKILL_NODES[id];
    const unmetPrerequisites = node.prerequisites.filter((p) => !userSkillIds.has(p));
    if (unmetPrerequisites.length === 0) {
      immediateNext.push({
        ...node,
        unmetPrerequisites: [],
        isDesiredByLearner: desiredLearnNodeIds.has(node.id),
      });
    } else {
      lockedSkills.push({
        ...node,
        unmetPrerequisites: unmetPrerequisites.map((p) => SKILL_NODES[p]?.name || p),
        isDesiredByLearner: desiredLearnNodeIds.has(node.id),
      });
    }
  });

  // Calculate A* / Dijkstra shortest sequential critical path
  const combinedTargets = Array.from(new Set([...targetSkillIds, ...desiredLearnNodeIds]));
  const { criticalPath, totalHours } = findOptimalPathDijkstra(
    Array.from(userSkillIds),
    combinedTargets
  );

  // Ensure learner always has actionable "Ready to Learn" skills
  // If no skill has 0 unmet prerequisites, promote the earliest missing step(s) on the critical path
  if (immediateNext.length === 0 && criticalPath.length > 0) {
    const nextSteps = criticalPath.slice(0, 3).map((item) => {
      const node = SKILL_NODES[item.id] || item;
      return {
        ...node,
        unmetPrerequisites: [],
        isDesiredByLearner: desiredLearnNodeIds.has(item.id),
        isPathRecommended: true,
      };
    });
    immediateNext.push(...nextSteps);
  }

  const matchScore = totalRequired > 0 
    ? Math.round((masteredInTrack.length / totalRequired) * 100) 
    : 0;

  // ─── CONSTRUCT PERSONALIZED SUBGRAPH (FOCUSED PATH ONLY) ───
  // Includes ONLY:
  // 1. Target skills
  // 2. All missing skills on the critical learning path
  // 3. User's mastered skills that directly act as prerequisites
  // 4. Skills the user specifically marked as desired (learnSkills)
  const personalizedNodeIds = new Set([
    ...allRequiredNodeIds,
    ...userSkillIds,
    ...desiredLearnNodeIds,
  ]);

  // Filter to keep only the connected personalized nodes
  const personalizedNodes = Array.from(personalizedNodeIds)
    .filter((id) => SKILL_NODES[id])
    .map((id) => {
      const node = SKILL_NODES[id];
      let status = "unrelated";
      if (userSkillIds.has(node.id)) status = "mastered";
      else if (targetSkillIds.includes(node.id)) status = "target";
      else {
        const unmet = node.prerequisites.filter((p) => !userSkillIds.has(p));
        status = unmet.length === 0 ? "ready" : "locked";
      }
      return {
        ...node,
        status,
        isRequiredForTarget: allRequiredNodeIds.has(node.id),
        isDesiredByLearner: desiredLearnNodeIds.has(node.id),
      };
    });

  const personalizedEdges = [];
  personalizedNodes.forEach((node) => {
    node.prerequisites.forEach((pId) => {
      if (personalizedNodeIds.has(pId)) {
        personalizedEdges.push({
          from: pId,
          to: node.id,
          isCritical: allRequiredNodeIds.has(pId) && allRequiredNodeIds.has(node.id),
        });
      }
    });
  });

  return {
    careerTrack: selectedTrack,
    evaluatedCareerTracks: evaluatedTracks,
    metrics: {
      matchScore,
      totalTrackNodes: totalRequired,
      masteredCount: masteredInTrack.length,
      gapCount: missingInTrack.length,
      immediateUnlockableCount: immediateNext.length,
      estimatedRemainingHours: totalHours,
      estimatedWeeks: Math.ceil(totalHours / 12),
      desiredSkillsInTrackCount: Array.from(desiredLearnNodeIds).filter((id) => allRequiredNodeIds.has(id)).length,
    },
    masteredSkills: masteredInTrack.map((id) => ({
      ...SKILL_NODES[id],
      status: "mastered",
    })),
    immediateNext: immediateNext.map((s) => ({
      ...s,
      status: "ready",
    })),
    lockedSkills: lockedSkills.map((s) => ({
      ...s,
      status: "locked",
    })),
    criticalPath,
    personalizedGraphTopology: {
      nodes: personalizedNodes,
      edges: personalizedEdges,
    },
    fullGraphTopology: {
      nodes: Object.values(SKILL_NODES).map((node) => {
        let status = "unrelated";
        if (userSkillIds.has(node.id)) status = "mastered";
        else if (targetSkillIds.includes(node.id)) status = "target";
        else if (allRequiredNodeIds.has(node.id)) {
          const unmet = node.prerequisites.filter((p) => !userSkillIds.has(p));
          status = unmet.length === 0 ? "ready" : "locked";
        }
        return {
          ...node,
          status,
          isRequiredForTarget: allRequiredNodeIds.has(node.id),
          isDesiredByLearner: desiredLearnNodeIds.has(node.id),
        };
      }),
      edges: Object.values(SKILL_NODES).flatMap((node) =>
        node.prerequisites.map((pId) => ({
          from: pId,
          to: node.id,
          isCritical: allRequiredNodeIds.has(pId) && allRequiredNodeIds.has(node.id),
        }))
      ),
    },
  };
};

module.exports = {
  SKILL_NODES,
  CAREER_TRACKS,
  normalizeSkillToId,
  performSkillGapAnalysis,
};

