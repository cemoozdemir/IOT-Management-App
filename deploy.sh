#!/bin/bash

echo "🚀 Starting clean deployment of IOT Management App..."

# Stop and delete existing PM2 processes
echo "🛑 Stopping and deleting all PM2 processes..."
pm2 delete all

# Clean old builds
echo "🧹 Cleaning build folders..."
rm -rf backend/dist
rm -rf frontend/build

# Install and build backend
echo "📦 Installing backend dependencies..."
cd backend || exit
npm install
npm run build

# Copy .env.production into dist (so backend can access it at runtime)
echo "📁 Copying .env.production into dist..."
cp .env.production dist/.env.production

# Start backend with PM2 and production environment
echo "🚀 Starting backend..."
cd dist || exit
NODE_ENV=production pm2 start server.js --name "iot-api" --env production --update-env
cd ../..

# Install and build frontend
echo "🎨 Installing frontend dependencies..."
cd frontend || exit
npm install
npm run build

# Deploy frontend build to nginx path
echo "📂 Deploying frontend to /var/www/html..."
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/

# Optional: serve frontend via PM2 (if you want to test it outside nginx)
echo "🌐 Starting frontend via serve (optional)..."
pm2 start "npx serve -s build -l 3000" --name "iot-ui"

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# Save current PM2 processes
pm2 save

echo "✅ Deployment finished successfully!"
