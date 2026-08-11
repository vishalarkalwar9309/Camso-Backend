# Project Brief — CAMSO Mobile App Backend

## Overview
The CAMSO Mobile App backend is a high-performance REST API built on Node.js 24, Express, and Prisma 6.19.3 (multi-file schema) serving compact construction tire & track data, support documents, dealers, and engagement features to the CAMSO mobile application.

## Core Objectives
1. Provide reliable, modular, and performant REST APIs for end-users and administrative content managers.
2. Establish a clear ownership boundary between backend engineers (Aary — Support/Content/Engagement side; Vishal — Catalogue/Search/Identity side).
3. Follow a rigid layered architecture (routes → controllers → services → repositories → Prisma).
4. Maintain strict adherence to master design plans in `docs/CAMSO_Backend_Plan.md` and `docs/CAMSO_Backend_Plan_Aary.md`.

## Target Architecture & Dependencies
- Node.js: >=24.0.0 (Node 24.19.0 runtime)
- Framework: Express 4.19.2
- ORM: Prisma 6.19.3 (pinned, multi-file schema via `prisma.config.js`)
- Database: PostgreSQL (Neon.tech / local Docker Compose)
- Auth: JWT (jsonwebtoken 9.0.2) with refresh token rotation + reuse detection
- Push Notifications & Storage: Firebase Admin SDK 13.4.0
- Logging & API Docs: Winston 3.14.2, Morgan 1.10.0, Swagger UI 5.0.1
