# Web App Architecture Capability

## ADDED Requirements

### Requirement: Standalone Web Deployment

The Web UI SHALL be deployable as a standalone application independent of the CLI package.

#### Scenario: Deploy Web as separate service

- **WHEN** `@pmspec/web` is installed independently
- **THEN** it SHALL provide a standalone server entry point
- **AND** support configuration via environment variables
- **AND** not require `@pmspec/cli` to be installed

#### Scenario: Web server environment configuration

- **WHEN** the Web server starts
- **THEN** it SHALL read configuration from environment variables:
  - `PORT`: Server port (default: 3000)
  - `PMSPACE_PATH`: Path to pmspace directory (default: current working directory)
  - `FRONTEND_PATH`: Custom frontend build path (optional)
- **AND** validate that the pmspace directory exists
- **AND** display a warning if pmspace is not found

#### Scenario: Standalone Web CLI command

- **WHEN** `@pmspec/web` is installed globally
- **THEN** it SHALL provide a `pmspec-web` CLI command
- **AND** support options: `--port`, `--pmspace-path`, `--open`
- **AND** behave identically to `pmspec serve`

### Requirement: Web Package Independence

The Web package SHALL not depend on the CLI package.

#### Scenario: Web package dependencies

- **WHEN** `@pmspec/web` is published
- **THEN** it SHALL NOT include `@pmspec/cli` as a dependency
- **AND** SHALL include only Web-related dependencies (Express, React, etc.)
- **AND** SHALL be installable independently

#### Scenario: Shared functionality extraction

- **WHEN** Web needs functionality from the CLI (e.g., parser, models)
- **THEN** that functionality SHALL be extracted to `@pmspec/shared` (if needed)
- **OR** duplicated in the Web package if minimal
- **AND** NOT imported from `@pmspec/cli`

## MODIFIED Requirements

### Requirement: Web Application Structure

The Web application SHALL be structured as an independent package with frontend, backend, and shared components.

#### Scenario: Web package structure

- **WHEN** the Web package is built
- **THEN** it SHALL contain:
  - `frontend/` - React application
  - `backend/` - Express server
  - `shared/` - TypeScript types shared between frontend and backend
  - `bin/pmspec-web.js` - Standalone CLI entry point
  - `package.json` - Package metadata and dependencies

#### Scenario: Frontend build output

- **WHEN** the frontend is built
- **THEN** it SHALL be compiled to `frontend/dist/`
- **AND** include static assets (HTML, CSS, JS, images)
- **AND** be served by the backend Express server

#### Scenario: Backend build output

- **WHEN** the backend is built
- **THEN** it SHALL be compiled to `backend/dist/`
- **AND** include the Express server and API routes
- **AND** serve the frontend static files from `frontend/dist/`

### Requirement: Web Server Entry Point

The Web package SHALL provide a standalone server entry point that does not depend on CLI.

#### Scenario: Standalone server script

- **WHEN** the Web package is installed
- **THEN** it SHALL include `bin/pmspec-web.js`
- **AND** the script SHALL start the backend server
- **AND** support command-line options (port, pmspace path, open browser)

#### Scenario: Server startup

- **WHEN** the standalone server starts
- **THEN** it SHALL:
  1. Read environment variables and CLI options
  2. Validate pmspace directory existence
  3. Start the Express backend server
  4. Serve the frontend from the built static files
  5. Display server URL and API endpoint
  6. Optionally open browser if `--open` is specified

#### Scenario: Server error handling

- **WHEN** the server encounters an error during startup
- **THEN** it SHALL display a clear error message
- **AND** provide troubleshooting guidance
- **AND** exit with a non-zero code

### Requirement: PMSpace Directory Discovery

The Web application SHALL support flexible pmspace directory discovery.

#### Scenario: Default pmspace location

- **WHEN** no pmspace path is specified
- **THEN** the Web SHALL look for `pmspace/` in the current working directory
- **AND** display a warning if not found
- **AND** provide instructions to create or specify the path

#### Scenario: Custom pmspace path via environment variable

- **WHEN** `PMSPACE_PATH` environment variable is set
- **THEN** the Web SHALL use that path
- **AND** validate that the directory exists
- **AND** validate that it contains valid pmspace structure

#### Scenario: Custom pmspace path via CLI option

- **WHEN** user runs `pmspec-web --pmspace-path /custom/path`
- **THEN** the Web SHALL use that path
- **AND** CLI option SHALL take precedence over environment variable
- **AND** validate the directory structure

#### Scenario: Multiple pmspace discovery attempts

- **WHEN** pmspace is not found in the default location
- **THEN** the Web SHALL search parent directories (up to 3 levels)
- **AND** use the first valid pmspace found
- **AND** display the resolved path in the startup message
