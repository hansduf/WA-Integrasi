#!/bin/bash

# AVEVA-PI Entrypoint - Start semua 3 services

echo "🚀 Starting AVEVA-PI services..."

# Start backend (background)
echo "▶ Starting Backend..."
cd /app/avevapi
node main.js &
BACKEND_PID=$!

# Start frontend (background)
echo "▶ Starting Frontend..."
cd /app/frontend
npm start &
FRONTEND_PID=$!

# Start whatsapp (foreground)
echo "▶ Starting WhatsApp Bot..."
cd /app/wa
node index.js &
WHATSAPP_PID=$!

echo "✅ All services started!"
echo "   Backend: http://localhost:8001"
echo "   Frontend: http://localhost:3000"

# Keep container running
wait
