FROM node:20-bullseye

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium-browser \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./

RUN npm ci --only=production

COPY . .

CMD ["node", "index.js"]
