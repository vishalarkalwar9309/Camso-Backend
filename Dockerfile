FROM node:24-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY src ./src/

EXPOSE 4000

CMD ["node", "src/server.js"]
