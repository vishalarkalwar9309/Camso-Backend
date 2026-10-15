# Node.js 20 LTS Alpine image for minimal size and security
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl for Prisma binary compatibility
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# Copy source code
COPY src ./src

# Expose port (Cloud Run / Render dynamically injects PORT)
EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Start production server
CMD ["node", "src/server.js"]
