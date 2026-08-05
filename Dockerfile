# Microsoft's official Playwright image ships Node.js + Chromium, Firefox and
# WebKit already installed, along with every OS-level shared library headless
# Chrome/Firefox/WebKit need to run (libnss3, libatk, libgbm, fonts, etc).
# We keep everything in ONE stage (no slim runtime stage) because Puppeteer
# and Playwright both need those browser binaries + libraries at RUNTIME,
# not just at build time.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first (better layer caching)
COPY package.json ./
COPY bun.lock* ./
RUN npm install

# Playwright's browsers are already baked into this base image at the matching
# version, so `npm install`'s postinstall will detect them and skip re-downloading.
# Puppeteer bundles/downloads its own Chromium build separately during install.

# Copy source and build client + server bundle
COPY . .
RUN npm run build

EXPOSE 3000

# --no-sandbox is required for headless Chrome/Puppeteer inside most
# containerized environments (Railway, Docker) that don't grant the
# extra kernel privileges Chrome's sandbox normally needs.
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"

CMD ["node", "dist/server.cjs"]
