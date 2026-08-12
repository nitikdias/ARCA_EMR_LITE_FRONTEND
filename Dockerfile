# Stage 1: Build the application
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install all dependencies to build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Standard build (not using standalone pruning for custom server compatibility)
RUN npm run build 

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install ONLY production dependencies to keep image size reasonable
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy built assets, public files, and your custom server
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN chown -R nextjs:nodejs .
USER nextjs

EXPOSE 3000

# Run your custom server
CMD ["node", "server.js"]
