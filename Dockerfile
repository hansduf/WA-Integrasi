FROM node:20-bullseye

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy seluruh project
COPY . .

# Install dependencies untuk backend
WORKDIR /app/avevapi
RUN npm install --omit=dev

# Install dan build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Install dependencies untuk whatsapp
WORKDIR /app/wa
RUN npm install --omit=dev

# Kembali ke root
WORKDIR /app

# Set Puppeteer untuk whatsapp
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy dan set start script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose ports
EXPOSE 8001 3000

# Start semua services
CMD ["./entrypoint.sh"]
