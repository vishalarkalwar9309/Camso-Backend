# Tech Context — CAMSO Mobile App Backend

## Technology Stack
- **Node.js**: v24.19.0
- **npm**: 11.17.0
- **Express**: ^4.19.2
- **Prisma Client & CLI**: 6.19.3 (EXACT version pinned in package.json)
- **Database**: PostgreSQL 16
- **Firebase Admin SDK**: ^13.4.0 (FCM & Cloud Storage)
- **JWT**: jsonwebtoken ^9.0.2 & bcrypt ^5.1.1
- **Validation**: Joi ^17.13.3
- **Logging**: Winston ^3.14.2 & Morgan ^1.10.0
- **Documentation**: swagger-jsdoc ^6.2.8 & swagger-ui-express ^5.0.1
- **Testing**: Jest ^29.7.0 & Supertest ^7.0.0

## Key Development & Execution Commands
- Start dev server: `npm run dev`
- Run test suite: `npm test`
- Validate Prisma schema: `npm run prisma:validate`
- Generate Prisma client: `npm run prisma:generate`
- Run Prisma migrations: `npm run prisma:migrate`

## Environment Configuration
Configured via `.env` (derived from `.env.example`).
Variables parsed and validated centrally in `src/config/index.js`.
`FIREBASE_PRIVATE_KEY` handles literal `\n` unescaping in `src/config/firebase.js`.
