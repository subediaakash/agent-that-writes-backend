# Backend

This backend powers an AI agent that can scaffold, modify, and review backend code. It exposes APIs for:

- Generating new backend project files
- Proposing fixes to existing code
- Reviewing code and explaining changes
- Running tasks using Bun

## Requirements

- Bun v1.2.8 or newer
- Linux/macOS

## Install dependencies

```bash
bun install
```

## Run the server

```bash
bun run index.ts
```

## Development

- Environment variables: configure in `.env` (e.g., API keys, model settings)
- Logs/output: check the VS Code Output pane or the integrated terminal

## Project notes

This project was created using `bun init` in bun v1.2.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
