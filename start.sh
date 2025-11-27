#!/bin/bash

# AVEVA-PI Docker Compose Startup Script
# This script starts all services using Docker Compose

set -e

echo "🚀 Starting AVEVA-PI services with Docker Compose..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Start services
echo "📦 Building and starting containers..."
docker-compose up -d

echo "✅ All services started!"
echo ""
echo "Services running:"
echo "  - Backend:  http://localhost:8001"
echo "  - Frontend: http://localhost:3000"
echo "  - WhatsApp: Internal (backend communication)"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop services: docker-compose down"
