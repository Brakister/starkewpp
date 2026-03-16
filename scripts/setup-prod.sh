#!/bin/bash
# ZapFlow - Production Setup Script
# Run once on a fresh server: bash scripts/setup-prod.sh

set -e

echo "🚀 ZapFlow Production Setup"
echo "================================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Install Docker first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ docker-compose not found."; exit 1; }

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from example..."
  cp .env.example .env

  # Generate random JWT secret
  JWT_SECRET=$(openssl rand -base64 48)
  sed -i "s/your-super-secret-jwt-key-change-in-production-min-32-chars/$JWT_SECRET/" .env

  echo "⚠️  Please edit .env with your credentials before continuing"
  echo "   Required: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN"
  read -p "Press Enter when done..."
fi

# Build and start
echo "🏗️  Building Docker images..."
docker-compose build

echo "🗄️  Starting database..."
docker-compose up -d db
sleep 5

echo "📦  Running database migrations..."
docker-compose run --rm app sh -c "npx prisma migrate deploy"

echo "🌱  Seeding initial data..."
docker-compose run --rm app sh -c "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"

echo "🚀  Starting all services..."
docker-compose up -d

echo ""
echo "✅ ZapFlow is running!"
echo ""
echo "   App:      http://localhost:3000"
echo "   Admin:    admin@zapflow.com / admin123"
echo ""
echo "⚠️  IMPORTANT: Change the default admin password immediately!"
echo ""
echo "📡 Configure your WhatsApp webhook at:"
echo "   https://developers.facebook.com/apps/"
echo "   Webhook URL: https://YOUR_DOMAIN/api/webhooks/whatsapp"
