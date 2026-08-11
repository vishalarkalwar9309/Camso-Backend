FROM node:24-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["node", "src/server.js"]
