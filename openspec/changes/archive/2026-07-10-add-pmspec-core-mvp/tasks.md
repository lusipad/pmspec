# Implementation Tasks

## Phase 1: Project Infrastructure ✅

### 1.1 Project Setup ✅
- [x] Initialize TypeScript project with tsconfig.json
- [x] Set up package.json with dependencies (commander, chalk, ora, inquirer, zod)
- [x] Configure build script (esbuild or tsc)
- [x] Create bin/pmspec.js entry point
- [x] Set up Vitest for testing

### 1.2 Core Data Models ✅
- [x] Implement `src/core/project.ts` with Project, Epic, Feature, UserStory types
- [x] Implement `src/core/team.ts` with TeamMember and Skill types
- [x] Add Zod schemas for validation
- [x] Write unit tests for data models

### 1.3 Markdown Parser ✅
- [x] Implement `src/core/parser.ts` to parse Epic/Feature markdown files
- [x] Implement metadata extraction (ID, Status, Owner, Estimate, etc.)
- [x] Implement hierarchical relationship parsing (Epic → Features → Stories)
- [x] Write parser unit tests with fixture files

### 1.4 Markdown Writer ✅
- [x] Implement `src/utils/markdown.ts` to generate markdown files from data models
- [x] Implement template rendering for Epic/Feature/Story
- [x] Ensure round-trip consistency (parse → write → parse yields same result)
- [x] Write writer unit tests

## Phase 2: Basic CLI Commands ✅

### 2.1 CLI Framework ✅
- [x] Set up Commander.js in `src/cli/index.ts`
- [x] Configure command routing to `src/commands/`
- [x] Implement global options (--version, --help)
- [ ] Add CLI integration tests (deferred to post-MVP)

### 2.2 Init Command ✅
- [x] Implement `src/commands/init.ts`
- [x] Create directory structure (pmspace/epics/, pmspace/features/)
- [x] Generate template project.md and team.md
- [x] Handle --force flag for re-initialization
- [ ] Write command tests (deferred to post-MVP)

### 2.3 List Command ✅
- [x] Implement `src/commands/list.ts`
- [x] Support `pmspec list epics` and `pmspec list features`
- [x] Add table formatting with cli-table3 or similar
- [x] Implement filters: --status, --assignee
- [ ] Write command tests (deferred to post-MVP)

### 2.4 Show Command ✅
- [x] Implement `src/commands/show.ts`
- [x] Support showing Epic, Feature, or UserStory by ID
- [x] Calculate and display progress percentage for Epics
- [x] Handle non-existent IDs with helpful error messages
- [ ] Write command tests (deferred to post-MVP)

### 2.5 Validate Command ✅
- [x] Implement `src/commands/validate.ts`
- [x] Check unique IDs across all Epics/Features/Stories
- [x] Validate status enums
- [x] Validate positive time values
- [x] Check Epic reference integrity
- [x] Display validation errors in structured format
- [ ] Write validation tests (deferred to post-MVP)

## Phase 3: Create and Update Commands ✅

### 3.1 Create Command ✅
- [x] Implement `src/commands/create.ts`
- [x] Support `pmspec create epic` with interactive prompts
- [x] Support `pmspec create feature --epic EPIC-001`
- [x] Support `pmspec create story --feature FEAT-001`
- [x] Auto-generate next available ID
- [ ] Write command tests (deferred to post-MVP)

### 3.2 Update Command ✅
- [x] Implement `src/commands/update.ts`
- [x] Support updating status: `pmspec update FEAT-001 --status done`
- [x] Support updating actual hours: `pmspec update FEAT-001 --actual 10`
- [x] Support updating assignee: `pmspec update FEAT-001 --assignee Alice`
- [x] Calculate and display variance for time estimates
- [ ] Write command tests (deferred to post-MVP)

## Phase 4: AI Integration ✅

### 4.1 Prompt Files ✅
- [x] Create `.claude/commands/pmspec-breakdown.md` prompt template
- [x] Define structured output format for AI (markdown with sections)
- [x] Create `.claude/commands/pmspec-estimate.md` prompt template
- [x] Create `.claude/commands/pmspec-refine.md` prompt template
- [x] Document prompt usage in AI_GUIDE.md

### 4.2 Breakdown Command ✅
- [x] Implement `src/commands/breakdown.ts`
- [x] Support `pmspec breakdown epic --from "description"`
- [x] Support `pmspec breakdown EPIC-001` to expand existing Epic
- [x] Parse AI-generated markdown output
- [x] Display preview before applying changes
- [x] Prompt user for confirmation (y/n)
- [ ] Write command tests with mock AI output (deferred to post-MVP)

### 4.3 AI Output Validation ✅
- [x] Implement validation for AI-generated structure
- [x] Check required fields (ID, Estimate, Description)
- [x] Validate estimate ranges (UserStory: 1-24h, Feature: 4-80h, Epic: 20-500h)
- [x] Handle malformed AI output gracefully
- [ ] Write validation tests (deferred to post-MVP)

## Phase 5: Workload Analysis ✅

### 5.1 Workload Core Logic ✅
- [x] Implement `src/core/workload.ts` with WorkloadAnalyzer class
- [x] Implement skill matching algorithm (Jaccard similarity or simple overlap)
- [x] Implement current load calculation (sum of assigned estimates)
- [x] Implement assignment scoring: score = skillMatch * (1 - load/capacity)
- [ ] Write unit tests for scoring algorithm (deferred to post-MVP)

### 5.2 Team Parsing ✅
- [x] Implement parser for `team.md` to extract TeamMembers
- [x] Parse skills, capacity, and current assignments
- [x] Calculate current load for each member
- [ ] Write parser tests (deferred to post-MVP)

### 5.3 Analyze Command ✅
- [x] Implement `src/commands/analyze.ts`
- [x] Display team workload summary table
- [x] Highlight overallocated members (>100% load)
- [x] List unassigned Features with total hours
- [x] Implement --recommend flag for assignment suggestions
- [x] Display top 3 candidates with scores for each unassigned Feature
- [ ] Write command tests (deferred to post-MVP)

### 5.4 Skill Gap Analysis ✅
- [x] Collect all required skills from Features
- [x] Compare with team skills from `team.md`
- [x] Report missing skills with affected Feature IDs
- [x] Suggest skill development for high-demand skills
- [ ] Write analysis tests (deferred to post-MVP)

## Phase 6: Documentation and Polish ✅

### 6.1 Documentation ✅
- [x] Write comprehensive README.md with installation and usage
- [x] Create QUICKSTART.md with common workflows
- [x] Document all CLI commands with examples
- [x] Create example project in `examples/` directory
- [x] Document AI prompt usage and best practices (AI_GUIDE.md)

### 6.2 Error Handling (Partially Complete)
- [x] Audit all commands for consistent error handling
- [x] Use chalk for colored error/success messages
- [x] Provide actionable error messages with suggestions
- [x] Handle edge cases (empty project, missing files, etc.)

### 6.3 Testing and Quality (Deferred to Post-MVP)
- [ ] Achieve >80% code coverage (deferred to post-MVP)
- [ ] Run integration tests for complete workflows (deferred to post-MVP)
- [ ] Test on Windows, macOS, and Linux (basic manual testing done)
- [ ] Set up CI/CD pipeline (GitHub Actions) (deferred to post-MVP)
- [ ] Run linting (ESLint) and formatting (Prettier) (deferred to post-MVP)

### 6.4 Package and Release (Ready for Release)
- [x] Configure package.json for npm publishing
- [ ] Set up Changesets for version management (optional)
- [ ] Create CHANGELOG.md (can be added when releasing)
- [ ] Test npm pack and local installation (ready to test)
- [ ] Publish alpha version to npm (ready when needed)

## Phase 7: Future Enhancements (Post-MVP)

### 7.1 Historical Performance Tracking
- [ ] Track completed Features with actual vs. estimated hours
- [ ] Calculate accuracy metrics per team member
- [ ] Use historical data to refine future estimates

### 7.2 Dependency Management
- [ ] Add dependency field to Features
- [ ] Visualize dependency graph
- [ ] Detect circular dependencies

### 7.3 Timeline Visualization
- [ ] Generate Gantt chart from project data
- [ ] Export to Markdown table or ASCII art
- [ ] Support critical path analysis

### 7.4 Integration with External Tools
- [ ] Export to Jira/Linear format
- [ ] Import from existing project management tools
- [ ] Sync with GitHub Issues
