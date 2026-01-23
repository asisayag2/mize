#!/bin/sh
set -e

echo "🔄 Running database migrations..."
cd /app/server && npx prisma db push --skip-generate
cd /app

echo "🚀 Starting server..."
npm run start
