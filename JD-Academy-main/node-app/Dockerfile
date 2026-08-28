# Runs JDM Academy without depending on cPanel's "Setup Node.js App" feature --
# builds/runs the same way on any host that has Docker (VPS, Railway, Render,
# DigitalOcean App Platform, etc). See DEPLOYMENT.md for the two paths.

FROM node:20-alpine

# bcrypt ships a prebuilt binary for common platforms via node-gyp-build; on an
# uncommon arch it falls back to compiling, which needs these on Alpine.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first so this layer is cached unless package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# .env is never baked into the image (see .dockerignore) -- it's supplied at
# `docker run`/compose time via --env-file or environment:, same as any other
# secret. This mirrors how config/index.js already reads process.env either way.

RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
USER nodeapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
