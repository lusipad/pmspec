# PMSpec

[中文版](./README.zh.md)

**AI-driven project management with Markdown-based storage**

PMSpec is a lightweight project management tool inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec), allowing managers to focus on high-level requirement changes while delegating the breakdown of Epic/Feature/UserStory, effort estimation, and personnel assignment to AI automation.

## ✨ Features

- 📝 **Markdown Storage**: All data stored in Markdown format for easy version control and human review
- 🤖 **AI-Driven**: Integrated with Claude Code for automatic requirement breakdown and effort estimation
- 📊 **Workload Analysis**: Intelligent personnel assignment suggestions based on skill matching and load balancing
- 🎯 **Three-Level Hierarchy**: Epic → Feature → UserStory, following agile best practices
- 🛠️ **CLI Tool**: Git-like command-line interface, simple and efficient

## 📦 Installation

```bash
npm install -g @pmspec/core
```

Or use with npx (no installation required):

```bash
npx @pmspec/core init
```

Or for local development:

```bash
git clone https://github.com/pmspec/pmspec.git
cd pmspec
npm install
npm run build
npm link
```

## 🚀 Quick Start

### 1. Initialize Project

```bash
pmspec init
```

This creates a `pmspace/` structure in the current directory:

```
pmspace/
├── project.md     # Project overview
├── team.md        # Team members and skills
├── epics/         # Epic folder
└── features/      # Feature folder
```

### 2. Configure Team

Edit `pmspace/team.md`:

```markdown
# Team

## Members

### Alice
- **Skills**: React, TypeScript, Node.js
- **Capacity**: 40 hours/week
- **Current Load**: 0 hours/week

### Bob
- **Skills**: Python, Django, PostgreSQL
- **Capacity**: 30 hours/week
- **Current Load**: 0 hours/week
```

### 3. Create Epic

Create `epic-001.md` in `pmspace/epics/`:

```markdown
# Epic: User Authentication System

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
Build a complete user authentication system with login, signup, and password reset.

## Features
- [ ] FEAT-001: Login form
- [ ] FEAT-002: Signup form
- [ ] FEAT-003: Password reset flow
```

### 4. Create Feature

Create `feat-001.md` in `pmspace/features/`:

```markdown
# Feature: Login Form

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Alice
- **Estimate**: 16 hours
- **Actual**: 0 hours
- **Skills Required**: React, TypeScript

## Description
Responsive login form with email and password fields.

## User Stories
- [ ] STORY-001: As a user, I want to enter credentials (4h)
- [ ] STORY-002: As a user, I want to see validation errors (3h)
- [ ] STORY-003: As a user, I want to reset password link (2h)

## Acceptance Criteria
- [ ] Form validates email format
- [ ] Password is masked
- [ ] Shows error messages for invalid input
- [ ] Redirects to dashboard on success
```

### 5. View Project Status

```bash
# List all Epics
pmspec list epics

# List all Features
pmspec list features

# Filter by status
pmspec list features --status in-progress

# Filter by assignee
pmspec list features --assignee Alice

# View details
pmspec show EPIC-001
pmspec show FEAT-001

# Validate project data
pmspec validate
```

## 📚 CLI Commands

### `pmspec init`

Initialize a new PMSpec project.

```bash
pmspec init           # Create pmspace/ directory structure
pmspec init --force   # Force re-initialization (overwrite existing files)
```

### `pmspec list`

List Epics or Features.

```bash
pmspec list epics                        # List all Epics
pmspec list features                     # List all Features
pmspec list features --status todo       # Filter by status
pmspec list features --assignee Alice    # Filter by assignee
```

### `pmspec show`

Display detailed information about an Epic or Feature.

```bash
pmspec show EPIC-001   # Show Epic details and progress
pmspec show FEAT-001   # Show Feature details
```

### `pmspec validate`

Validate project data integrity.

```bash
pmspec validate         # Validate entire project
pmspec validate EPIC-001  # Validate specific Epic
pmspec validate FEAT-001  # Validate specific Feature
```

Validation checks:
- ✅ ID uniqueness
- ✅ Reference integrity (Features reference existing Epics)
- ✅ Status validity
- ✅ Effort reasonableness (estimate > 0, actual >= 0)
- ⚠️ Skill consistency (warning: required skills not in team)

## 🗂️ Data Model

### Epic

- **ID**: EPIC-XXX
- **Status**: `planning` | `in-progress` | `completed`
- **Owner**: Owner name
- **Estimate**: Estimated hours
- **Actual**: Actual hours spent
- **Features**: List of associated Feature IDs

### Feature

- **ID**: FEAT-XXX
- **Epic**: Parent Epic ID
- **Status**: `todo` | `in-progress` | `done`
- **Assignee**: Assigned to
- **Estimate**: Estimated hours
- **Actual**: Actual hours spent
- **Skills Required**: List of required skills
- **User Stories**: List of user stories
- **Acceptance Criteria**: Acceptance criteria

### UserStory

- **ID**: STORY-XXX
- **Title**: Story description
- **Estimate**: Estimated hours
- **Status**: `todo` | `in-progress` | `done`
- **Feature ID**: Parent Feature ID

## 🎯 Design Philosophy

PMSpec follows these design principles:

1. **Simplicity First**: Default <100 lines of code implementation, avoid over-engineering
2. **Markdown First**: All data is human-readable Markdown files
3. **Git-Friendly**: Each Epic/Feature is a separate file, reducing merge conflicts
4. **AI-Assisted**: Integrated with Claude Code via prompt files, no API calls needed
5. **CLI-First**: Git-like CLI experience, suitable for developer workflows

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Build
npm run build

# Run tests
npm test

# Test coverage
npm run test:coverage

# Test CLI locally
npm run dev:cli -- init
```

## 📚 Documentation

- **[Quick Start Guide (QUICKSTART.md)](./QUICKSTART.md)** - Get started with PMSpec in 5 minutes
- **[AI Guide (AI_GUIDE.md)](./AI_GUIDE.md)** - Detailed guide on Claude Code AI assistance
- **[Examples (examples/)](./examples/)** - Real-world examples and best practices

## 📊 Project Status

**Current Version**: 1.0.0 (MVP completed)

Implemented features:
- ✅ Core data models (Epic, Feature, UserStory, Team)
- ✅ Markdown parser and generator
- ✅ CLI framework (init, list, show, validate, create, update)
- ✅ Workload analysis algorithm (analyze command)
- ✅ Data validation
- ✅ AI task breakdown integration (Claude Code slash commands)
- ✅ Complete documentation and examples

Planned features (Post-MVP):
- ⏳ Historical performance tracking
- ⏳ Dependency management
- ⏳ Timeline visualization
- ⏳ External tool integration (Jira, Linear)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) (to be added).

## 📝 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

PMSpec is inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec). Thanks to the OpenSpec team for providing an excellent specification-driven development pattern.

---

**Made with ❤️ for better project management**
