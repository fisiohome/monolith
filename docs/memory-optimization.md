# Memory Optimization Guide

This document explains the memory optimization setup implemented to prevent memory issues in the dev container.

## Problem
The dev container was experiencing continuous memory growth, primarily due to:
- Windsurf language server consuming up to 4.3GB
- Multiple language servers (TypeScript, Ruby LSP) running simultaneously
- No memory limits imposed on Docker containers

## Solutions Implemented

### 1. Docker Memory Limits (`compose.yaml`)

Memory limits have been added to all services:

```yaml
deploy:
  resources:
    limits:
      memory: 8G  # Maximum memory
    reservations:
      memory: 4G  # Guaranteed memory
```

**Service Limits:**
- **Rails app**: 8GB max, 4GB guaranteed
- **Selenium**: 1GB max, 512MB guaranteed
- **Postgres**: 2GB max, 1GB guaranteed

### 2. VS Code Memory Optimization (`.vscode/memory-optimization.json`)

#### TypeScript Server
- `"typescript.tsserver.maxTsServerMemory": 3072` - Limits to 3GB
- Disabled experimental features and auto-imports

#### Ruby LSP
- `"rubyLsp.maxMemoryUsage": 2048` - Limits to 2GB
- Disabled experimental features

#### Editor Features
- Disabled semantic tokens, bracket pair colorization
- Disabled minimap and reduced line highlighting
- Configured file watching exclusions for large directories

#### Windsurf Settings
- `"windsurf.maxMemoryUsage": 4096` - Limits to 4GB
- Disabled telemetry
- Limited indexing file size to 1MB

### 3. Monitoring Tools

#### Memory Monitor (`scripts/memory-monitor.sh`)
Real-time memory monitoring script showing:
- System memory usage
- Top 10 memory-consuming processes
- Docker container stats
- Node.js and Ruby processes

**Usage:**
```bash
./scripts/memory-monitor.sh [interval]
# Default: updates every 5 seconds
```

#### Memory Cleanup (`scripts/memory-cleanup.sh`)
Cleanup script that:
- Clears system caches (requires sudo)
- Cleans npm/yarn caches
- Cleans Ruby gems
- Removes unused Docker resources
- Optionally restarts high-memory services

**Usage:**
```bash
./scripts/memory-cleanup.sh
```

## How to Apply These Changes

1. **Rebuild the dev container** to apply Docker memory limits:
   - VS Code: Command Palette > Dev Containers: Rebuild Container
   - Or: `docker-compose down && docker-compose up -d`

2. **Apply VS Code settings** (optional):
   ```bash
   cp .vscode/memory-optimization.json .vscode/settings.json
   ```

3. **Monitor memory usage**:
   ```bash
   ./scripts/memory-monitor.sh
   ```

4. **Clean memory when needed**:
   ```bash
   ./scripts/memory-cleanup.sh
   ```

## Expected Results

- Memory usage should stabilize within the configured limits
- Container will not crash from OOM (Out of Memory) errors
- Language servers will restart if they exceed their limits
- Overall system stability improved

## Troubleshooting

If you still experience memory issues:

1. Check which processes are consuming the most memory:
   ```bash
   ps aux --sort=-%mem | head -20
   ```

2. Restart specific services:
   ```bash
   # Restart Rails
   pkill -f puma
   
   # Restart Vite
   pkill -f vite
   
   # Restart language servers in VS Code:
   # Command Palette > Developer: Reload Window
   ```

3. Increase memory limits in `compose.yaml` if needed

## Additional Tips

- Regularly run the cleanup script to free up cached memory
- Monitor memory usage during intensive development sessions
- Consider disabling unused VS Code extensions
- Keep your workspace clean (remove unused files, dependencies)
