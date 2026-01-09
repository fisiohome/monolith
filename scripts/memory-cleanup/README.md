# Dev Container Scripts

This folder contains utility scripts for managing the dev container.

## Memory Management

### memory-monitor.sh
Real-time memory monitoring tool that displays:
- System memory usage
- Top memory-consuming processes
- Docker container statistics
- Node.js and Ruby process details

```bash
# Run with default 5-second interval
./scripts/memory-monitor.sh

# Run with custom interval (e.g., 2 seconds)
./scripts/memory-monitor.sh 2
```

### memory-cleanup.sh
Memory cleanup utility that:
- Clears system caches
- Cleans package manager caches (npm, yarn)
- Cleans Ruby gems
- Removes unused Docker resources
- Optionally restarts high-memory services

```bash
./scripts/memory-cleanup.sh
```

## Usage Tips

1. **Monitor regularly**: Keep `memory-monitor.sh` running in a separate terminal during development
2. **Clean when needed**: Run `memory-cleanup.sh` if memory usage gets high
3. **Automate**: Consider setting up a cron job to run cleanup periodically

## Troubleshooting

- If cleanup script asks for sudo password, you can skip the system cache clearing
- To stop the monitor, press `Ctrl+C`
- Check Docker memory limits in `../.devcontainer/compose.yaml`
