#!/bin/bash

# Lighthouse Performance Audit Script
# Usage: ./scripts/run-lighthouse.sh

echo "🚀 Starting production build..."
npm run build

echo "🌐 Starting production server..."
npm run start &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 5

# Create lighthouse reports directory
mkdir -p lighthouse-reports

echo "🔍 Running Lighthouse audits..."

# Key pages to audit
PAGES=(
  "http://localhost:3000/dashboard"
  "http://localhost:3000/gigs"
  "http://localhost:3000/auth/sign-in"
)

for PAGE in "${PAGES[@]}"; do
  PAGE_NAME=$(echo $PAGE | sed 's/.*\///' | sed 's/http:\/\/localhost:3000\//home/')
  echo "  📊 Auditing: $PAGE"
  
  npx lighthouse $PAGE \
    --output html \
    --output json \
    --output-path "./lighthouse-reports/$PAGE_NAME" \
    --preset=desktop \
    --quiet \
    --chrome-flags="--headless"
done

echo "✅ Lighthouse audits complete!"
echo "📁 Reports saved to: ./lighthouse-reports/"

# Kill the server
kill $SERVER_PID

echo "🎉 Done! Open the HTML reports to view results."

