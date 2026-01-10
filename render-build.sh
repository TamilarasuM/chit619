#!/bin/bash
# Render build script for backend deployment

echo "🔧 Starting Render build process..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "📦 Installing dependencies..."
npm install

echo "✅ Build completed successfully!"
echo "Backend is ready to start with: npm start"
