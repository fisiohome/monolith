#!/bin/bash

echo "🧹 Cleaning up memory..."

# Clear system caches
echo "Clearing system caches..."
sudo sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || echo "Cannot clear system cache (requires sudo)"

# Clean up npm cache
echo "Cleaning npm cache..."
npm cache clean --force 2>/dev/null || echo "npm not found or no cache"

# Clean up yarn cache
echo "Cleaning yarn cache..."
yarn cache clean 2>/dev/null || echo "yarn not found or no cache"

# Clean up Ruby gems
echo "Cleaning Ruby gems..."
gem cleanup 2>/dev/null || echo "gem cleanup failed"

# Clean up Docker unused resources
echo "Cleaning Docker unused resources..."
docker system prune -f 2>/dev/null || echo "Docker cleanup failed"

# Restart high-memory services (optional)
read -p "Restart high-memory processes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting Rails server..."
    pkill -f "puma\|rails server" 2>/dev/null
    echo "Restarting Vite..."
    pkill -f "vite" 2>/dev/null
fi

echo "✅ Memory cleanup complete!"
echo ""
echo "Current memory usage:"
free -h
