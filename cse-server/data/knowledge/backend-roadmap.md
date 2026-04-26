# Backend Developer Roadmap

## Foundations
- Node.js runtime, npm, module patterns (CommonJS/ESM)
- HTTP: methods, status codes, headers, cookies, CORS
- JSON APIs, validation, error handling middleware

## Core stack
- Express.js routing, middleware chain, async error handling
- MongoDB: schemas, indexes, aggregation, ObjectId patterns
- Authentication: session vs JWT vs Firebase token verification
- Real-time: Socket.io rooms, presence, message persistence

## Architecture
- MVC or modular routes/controllers/services
- Environment variables, secrets management
- Rate limiting, input sanitization, security headers
- Logging and structured errors for production

## Intermediate skills
- Database indexing for chat and user queries
- File uploads (Cloudinary), pagination, filtering
- Mentor matching algorithms (skill normalization, fuzzy match)
- Testing: Supertest, integration tests against test DB

## Advanced
- Microservices vs monolith tradeoffs
- Caching (Redis), message queues
- Docker, cloud deploy (Railway, Render, AWS)
- Observability: health checks, metrics

## Portfolio projects
- MERN mentorship platform with chat and ratings
- REST API with role-based access
- Webhook consumer (payments, notifications)
- Background jobs for email digests

## Skill gaps to watch
- Missing indexes → slow queries on conversations/messages
- No validation on request bodies → security risk
- Blocking sync code in hot paths → scale issues
