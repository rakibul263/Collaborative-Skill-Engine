# DevOps & Platform Roadmap

## Foundations
- Linux CLI, processes, permissions, networking basics
- Git branching, PR reviews, conventional commits
- CI/CD concepts: build, test, deploy pipelines

## Containers & cloud
- Docker: Dockerfile, compose for local MERN stacks
- Environment parity: dev/staging/prod variables
- Deploy Node + MongoDB (Atlas) + static React CDN

## Infrastructure as code (intro)
- Terraform or Pulumi overview
- Managed databases, secrets in vault/parameter store
- HTTPS, DNS, CDN for frontend assets

## Observability
- Health endpoints (`/`, `/health`)
- Log aggregation, error alerting
- Uptime checks for API and WebSocket server

## Security
- `.env` never in git; rotate leaked credentials
- CORS allowlists, helmet-style headers
- Dependency scanning (npm audit)

## MERN-specific ops
- Socket.io sticky sessions behind load balancers
- MongoDB indexes for chat and user_list collections
- Backup strategy for conversations and ratings

## Career path
- Platform engineer: reliability, cost, automation
- SRE: SLOs, incident response, postmortems
- Full-stack with DevOps fluency: ship features and own deploy
