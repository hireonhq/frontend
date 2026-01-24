# Use specific node version for reproducibility
FROM node:18-alpine AS base

# Enable corepack for pnpm (more efficient than npm install -g)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files (pnpm uses pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js app
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Production runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add labels for metadata
LABEL maintainer="hireon-team@example.com"
LABEL description="HireOn.ai Frontend Application"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use standalone output for minimal image
CMD ["node", "server.js"]