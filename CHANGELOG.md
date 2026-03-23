# Changelog

All notable changes to AgentBrain will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Improved

- **Simplified Gitignore Handling**
  - Now uses globby's built-in recursive gitignore support (respects all `.gitignore` files at any depth)
  - Removed manual gitignore parsing (60+ lines of code eliminated)
  - Removed `ignore` package dependency
  - More reliable and maintainable

### Fixed

- Added explicit `exit 0` to post-commit hook for cleaner process termination

### Technical

- Simplified crawler implementation from 60+ lines of manual parsing to 3 lines using globby
- Reduced dependencies by removing `ignore` package
- Git hooks now have explicit exit codes

## [1.4.3] - 2025-01-23

### Improved

- **Output Quality Enhancements**
  - `dependency-map.md` now generates complete mermaid diagrams for:
    - Module architecture (actual import relationships)
    - Full request lifecycle flows
    - 2+ feature-specific flows with real module names
    - External dependencies table with actual file paths
  - `patterns.md` completely rewritten to use actual code examples:
    - Extracts real 20-40 line code snippets from top 8 files
    - Shows actual patterns for modules, services, DTOs, error handling
    - Includes real naming conventions from codebase
    - Identifies anti-patterns with line references
    - No more generic framework documentation

- **Monorepo Support**
  - Now respects `.gitignore` files at all levels recursively (via globby)
  - Correctly ignores nested `node_modules` in monorepo packages
  - Drastically reduces phantom files in scan (167k → 2.6k for large monorepos)
  - Developers' existing `.gitignore` files now fully control what's scanned

### Fixed

- **Critical**: Fixed nested `node_modules` not being ignored in monorepos
  - Previous: Manual gitignore parsing only checked root level
  - Now: Uses globby's recursive gitignore support (respects all `.gitignore` files)
  - Impact: Repos with 100k+ files now scan correctly (167k → 2.6k actual files)
- Fixed README.md being treated as import source in dependency maps
- README files now correctly filtered out of code dependency analysis
### Technical

- Simplified gitignore handling: Removed manual parsing, now uses globby's built-in recursive support
- Removed `ignore` package dependency for gitignore parsing
- Enhanced dependency-map prompt with strict requirements for real module names
- Modified patterns generation to read actual file content (200 lines/file) instead of summaries
- Increased max tokens for dependency-map (3000 → 4000) and patterns (3000 → 4000)

## [1.4.2] - 2025-01-23

### Improved

- **Cost Estimation Accuracy**
  - Applied 1.4x buffer to all cost estimates (addresses 30% underestimation)
  - Changed label from "Estimated cost:" to "Cost estimate (up to):"
  - More accurate upfront cost predictions

- **Agent Selection UX**
  - Pre-checked defaults for all three agents
  - Clear instructions: "Use SPACE to select/deselect, ENTER when done"
  - Retry loop with helpful messages if no selection made
  - Explicit "Skip" option

### Fixed

- Agent file injection now correctly processes selected agents

## [1.4.0] - 2025-01-22

### Added

- **Complete Test Suite**
  - 64 comprehensive tests covering all core functionality
  - File scoring, crawler, AI client, context generation, and cache tests
  - Test coverage for error cases and edge conditions

- **Smart File Truncation**
  - Files ≤200 lines: full content
  - Files 200-500 lines: first 150 lines + exports
  - Files >500 lines: first 100 lines + exports
  - Reduces costs by 60-70% for large repositories

- **Two-Tier Summarization**
  - Top 20 files get deep summaries (500 token max)
  - Remaining files get brief summaries (150 token max, 50 words)
  - Prioritizes important files while controlling costs

- **Background Git Hooks**
  - Git commits complete instantly
  - Context updates run in background using shell backgrounding
  - Non-blocking workflow with progress logged to `.agentbrain/update.log`

- **Agent Selection UX**
  - Pre-checked defaults for all three agents
  - Clear instructions: "Use SPACE to select/deselect, ENTER when done"
  - Retry loop with helpful messages if no selection made
  - Explicit "Skip" option

### Improved

- **Performance Optimizations**
  - 10x parallel file summarization (was 5x)
  - 2-3x faster context generation
  - Efficient batch processing

- **File Scoring Algorithm**
  - Reduced depth penalty (3 → 1.5 per level)
  - Added business logic keywords boost (+60 points)
  - Adaptive max files for large repos (150 for repos >10k files)

- **Cache Improvements**
  - Git-hash based invalidation
  - Zero-cost repeat runs on same commit
  - Secure storage with proper permissions

### Fixed

- Agent file injection now correctly processes selected agents
- Git hooks properly handle background execution
- Cache validation edge cases

## [1.0.0] - 2024-12-XX

### Added

- Initial release
- Core context generation (`agentbrain init`)
- Coding standards generation (`agentbrain standards`)
- Session handoff generation (`agentbrain handoff`)
- One-command setup (`agentbrain setup`)
- MCP server for Claude Desktop, Cursor, and Windsurf
- Support for Anthropic and OpenAI providers
- Intelligent file crawler with relevance scoring
- Git-hash based caching
- Auto-injection into agent files (CLAUDE.md, .cursorrules, .windsurfrules)
- Background git hook installation

---

## Legend

- **Added** - New features
- **Improved** - Enhancements to existing features
- **Fixed** - Bug fixes
- **Technical** - Under-the-hood changes
- **Breaking** - Breaking changes (none yet!)
