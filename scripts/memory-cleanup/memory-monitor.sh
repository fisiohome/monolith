#!/bin/bash

# Memory monitoring script for dev container
# Usage: ./scripts/memory-monitor.sh [interval]

INTERVAL=${1:-5}  # Default 5 seconds

echo "Monitoring memory usage every ${INTERVAL} seconds..."
echo "Press Ctrl+C to stop"
echo "================================"

while true; do
    clear
    echo "Memory Usage at $(date)"
    echo "================================"
    
    # System memory
    echo -e "\n📊 System Memory:"
    free -h
    
    # Top memory consumers
    echo -e "\n🔥 Top 10 Memory Consumers:"
    ps aux --sort=-%mem | head -11 | awk 'NR==1 || NR>1 {printf "%-10s %5s%% %8s %s\n", $1, $4, $6, $11}'
    
    # Docker container stats
    echo -e "\n🐳 Docker Container Stats:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    # Node.js processes (often cause memory leaks)
    echo -e "\n🟢 Node.js Processes:"
    ps aux | grep node | grep -v grep | awk '{printf "%-10s %5s%% %8s %s\n", $1, $4, $6, $11}'
    
    # Ruby processes
    echo -e "\n💎 Ruby Processes:"
    ps aux | grep ruby | grep -v grep | awk '{printf "%-10s %5s%% %8s %s\n", $1, $4, $6, $11}'
    
    sleep $INTERVAL
done
