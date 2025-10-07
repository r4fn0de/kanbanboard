---
description: Repository Information Overview
alwaysApply: true
---

# Kanban Board Information

## Summary

A modern desktop Kanban board application built with Tauri v2, React, and TypeScript. The application provides a drag-and-drop interface for managing tasks across customizable boards and columns with features like priority levels, due dates, and tags.

## Structure

- **src/**: React frontend with components, hooks, services, and state management
- **src-tauri/**: Rust backend with SQLite database integration and Tauri commands
- **docs/**: Comprehensive developer and user documentation
- **public/**: Static assets for the web application
- **scripts/**: Utility scripts for release preparation

## Language & Runtime

**Frontend Language**: TypeScript
**Frontend Version**: ES2022
**Backend Language**: Rust
**Rust Edition**: 2024
**Build System**: Vite + Cargo
**Package Manager**: npm

## Dependencies

**Main Frontend Dependencies**:

- React 18.3.1
- Tauri API v2
- Zustand 5.0.6
- TanStack Query 5.83.0
- Tailwind CSS 4.1.11
- dnd-kit 6.3.1 (drag and drop)
- Radix UI components

**Main Backend Dependencies**:

- Tauri 2.0
- SQLx 0.8 (SQLite)
- Serde 1.0
- Anyhow 1.0
- Regex 1.11.1

## Build & Installation

```bash
# Install dependencies
npm install

# Development
npm run tauri:dev

# Build for production
npm run tauri:build

# Run tests and quality checks
npm run check:all
```

## Docker

No Docker configuration is present in the repository.

## Testing

**Frontend Framework**: Vitest 3.2.4 + Testing Library
**Backend Testing**: Cargo test
**Test Location**:

- Frontend: `src/test/` and component-specific test files
- Backend: Integrated with Rust files
  **Run Command**:

```bash
# Run all tests
npm run test:all

# Frontend tests only
npm run test:run

# Backend tests only
npm run rust:test
```

## Database

**Type**: SQLite with SQLx
**Schema**: Defined in `src-tauri/schema/kanban.sql`
**Main Tables**:

- kanban_boards
- kanban_columns
- kanban_cards
- kanban_tags
- kanban_card_tags
- kanban_activity

## Architecture

**Frontend Pattern**: State management onion (useState → Zustand → TanStack Query)
**Backend Pattern**: Tauri commands with SQLite persistence
**Communication**: Event-driven bridge between Rust and React
**UI Framework**: Tailwind CSS with shadcn/ui components
