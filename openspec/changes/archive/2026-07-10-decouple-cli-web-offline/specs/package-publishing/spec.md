# Package Publishing Capability

## ADDED Requirements

### Requirement: Multi-Package Publishing

The publishing system SHALL support independent publishing of multiple npm packages.

#### Scenario: Publish CLI package independently

- **WHEN** a tag matching `cli-v*` is pushed (e.g., `cli-v2.1.0`)
- **THEN** the release workflow SHALL build and publish `@pmspec/cli` only
- **AND** use the version number from the tag
- **AND** skip publishing other packages

#### Scenario: Publish Web package independently

- **WHEN** a tag matching `web-v*` is pushed (e.g., `web-v2.0.5`)
- **THEN** the release workflow SHALL build and publish `@pmspec/web` only
- **AND** use the version number from the tag
- **AND** skip publishing other packages

#### Scenario: Publish core meta package

- **WHEN** a tag matching `core-v*` is pushed (e.g., `core-v2.1.0`)
- **THEN** the release workflow SHALL publish `@pmspec/core` only
- **AND** ensure it depends on the latest versions of `@pmspec/cli` and `@pmspec/web`

### Requirement: Offline Package Generation

The publishing system SHALL generate offline installation packages for different platforms.

#### Scenario: Generate tarball packages

- **WHEN** the offline build workflow runs
- **THEN** it SHALL create `.tar.gz` archives for:
  - `pmspec-cli.tar.gz` (CLI only)
  - `pmspec-web.tar.gz` (Web only)
  - `pmspec-full.tar.gz` (CLI + Web)
- **AND** include all necessary dependencies and pre-built artifacts

#### Scenario: Generate ZIP packages

- **WHEN** the offline build workflow runs
- **THEN** it SHALL create `.zip` archives for:
  - `pmspec-cli.zip` (CLI only)
  - `pmspec-web.zip` (Web only)
  - `pmspec-full.zip` (CLI + Web)
- **AND** ensure Windows compatibility

#### Scenario: Upload offline packages to release

- **WHEN** offline packages are built successfully
- **THEN** they SHALL be uploaded as GitHub release assets
- **AND** include checksums (SHA256) for verification
- **AND** provide download links in the release notes

### Requirement: Monorepo Workspace Setup

The project SHALL use npm workspaces to manage multiple packages.

#### Scenario: Workspace configuration

- **WHEN** the project is set up
- **THEN** the root `package.json` SHALL define workspaces:
  - `packages/cli`
  - `packages/web`
  - `packages/core`
- **AND** allow shared dependencies in the root
- **AND** support cross-package references

#### Scenario: Workspace build command

- **WHEN** user runs `npm run build` in the root
- **THEN** all workspace packages SHALL be built in dependency order
- **AND** TypeScript references SHALL be resolved correctly

#### Scenario: Workspace test command

- **WHEN** user runs `npm test` in the root
- **THEN** all workspace packages SHALL run their test suites
- **AND** generate a combined coverage report

### Requirement: Semantic Versioning Independence

Each package SHALL maintain independent semantic versioning.

#### Scenario: CLI version bump

- **WHEN** a new feature is added to the CLI package
- **THEN** the `@pmspec/cli` version SHALL be bumped (e.g., 2.0.0 → 2.1.0)
- **AND** other packages SHALL NOT be affected unless they depend on the change

#### Scenario: Web version bump

- **WHEN** a bug is fixed in the Web package
- **THEN** the `@pmspec/web` version SHALL be bumped (e.g., 2.0.0 → 2.0.1)
- **AND** the CLI package SHALL NOT be affected

#### Scenario: Core package version synchronization

- **WHEN** either CLI or Web receives a major version update
- **THEN** the `@pmspec/core` version SHALL be updated to reflect the latest compatible versions
- **AND** the dependency ranges SHALL be updated accordingly

## MODIFIED Requirements

### Requirement: Publishing Workflow

The publishing workflow SHALL support monorepo structure with multiple packages.

#### Scenario: Build all packages before publishing

- **WHEN** a publish workflow is triggered
- **THEN** it SHALL:
  1. Install all workspace dependencies
  2. Build the CLI package (TypeScript compilation)
  3. Build the Web frontend (Vite build)
  4. Build the Web backend (TypeScript compilation)
  5. Verify all builds succeeded before publishing

#### Scenario: Tag-based package selection

- **WHEN** a version tag is pushed
- **THEN** the workflow SHALL extract the package name from the tag prefix
- **AND** publish only that specific package
- **AND** skip other packages to avoid unnecessary publishes

#### Scenario: Create GitHub release

- **WHEN** a package is published to npm
- **THEN** a GitHub release SHALL be created
- **AND** include the package-specific changelog
- **AND** attach offline packages (if applicable)
- **AND** include installation instructions

### Requirement: Package Files Configuration

Each package SHALL explicitly define which files to include in the npm package.

#### Scenario: CLI package files

- **WHEN** `@pmspec/cli` is published
- **THEN** it SHALL include:
  - `dist/` (compiled TypeScript)
  - `bin/` (CLI entry point)
  - `README.md`
- **AND** exclude:
  - `src/` (source TypeScript)
  - Test files and coverage reports
  - Source maps

#### Scenario: Web package files

- **WHEN** `@pmspec/web` is published
- **THEN** it SHALL include:
  - `frontend/dist/` (built React app)
  - `backend/dist/` (compiled backend)
  - `shared/` (shared types)
  - `README.md`
- **AND** exclude:
  - Source files (`frontend/src`, `backend/src`)
  - Test files and coverage reports
  - Development configs

#### Scenario: Core package files

- **WHEN** `@pmspec/core` is published
- **THEN** it SHALL include:
  - `package.json` (with dependencies)
  - `README.md`
- **AND** not include any source or build files (it's a meta package)
