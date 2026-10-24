# ==============================================================================
# LifeOS Production Container
# Lightweight, secure, zero-dependency Node.js Alpine image
# ==============================================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy root manifest and server
COPY package.json ./
COPY server.js ./

# Copy modules
COPY Frontend/ ./Frontend/
COPY Server/ ./Server/
COPY Database/ ./Database/
COPY Workflow/ ./Workflow/

# Expose standard application port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start LifeOS production HTTP server
CMD ["node", "server.js"]

