# CLI Commands Capability

## ADDED Requirements

### Requirement: Optional Web Dependency Detection

The `serve` command SHALL dynamically detect the presence of `@pmspec/web` package instead of assuming it is always available.

#### Scenario: Web package not installed

- **WHEN** user runs `pmspec serve` and `@pmspec/web` is not installed
- **THEN** the CLI SHALL display an error message with installation instructions
- **AND** suggest `npm install -g @pmspec/web` as the installation command
- **AND** exit with code 1

#### Scenario: Web package found in global installation

- **WHEN** user runs `pmspec serve` and `@pmspec/web` is installed globally
- **THEN** the CLI SHALL locate the package in the global node_modules directory
- **AND** start the Web server using that installation

#### Scenario: Web package found in local node_modules

- **WHEN** user runs `pmspec serve` and `@pmspec/web` is installed locally in the project
- **THEN** the CLI SHALL locate the package in the local node_modules directory
- **AND** start the Web server using that installation

### Requirement: Custom Web Path Support

The `serve` command SHALL support specifying a custom path to the Web UI installation.

#### Scenario: Custom web path provided

- **WHEN** user runs `pmspec serve --web-path /custom/path/to/web`
- **THEN** the CLI SHALL use the specified path instead of auto-detection
- **AND** validate that the path contains a valid Web UI installation
- **AND** display an error if the path is invalid

#### Scenario: Custom web path takes precedence

- **WHEN** user provides `--web-path` option
- **THEN** the CLI SHALL use that path even if `@pmspec/web` is installed globally or locally
- **AND** skip the auto-detection logic

### Requirement: Helpful Installation Guidance

The CLI SHALL provide clear guidance when Web UI dependencies are missing.

#### Scenario: Missing web package with installation options

- **WHEN** `@pmspec/web` is not found
- **THEN** the CLI SHALL display multiple installation options:
  - Global installation: `npm install -g @pmspec/web`
  - Local installation: `npm install @pmspec/web`
  - Custom path: `pmspec serve --web-path /path/to/web`

#### Scenario: Link to documentation

- **WHEN** `@pmspec/web` is not found
- **THEN** the error message SHALL include a link to the installation documentation
- **AND** explain the difference between CLI-only and full installation

## MODIFIED Requirements

### Requirement: Serve Command

The `serve` command SHALL start the PMSpec Web UI server with optional web dependency.

#### Scenario: Start server with default settings

- **WHEN** user runs `pmspec serve`
- **AND** `@pmspec/web` is available
- **THEN** the server SHALL start on port 3000
- **AND** display the server URL and API endpoint
- **AND** provide instructions to stop the server (Ctrl+C)

#### Scenario: Start server on custom port

- **WHEN** user runs `pmspec serve --port 4000`
- **AND** `@pmspec/web` is available
- **THEN** the server SHALL start on port 4000
- **AND** display the correct URL with the custom port

#### Scenario: Auto-open browser

- **WHEN** user runs `pmspec serve --open`
- **AND** `@pmspec/web` is available
- **THEN** the server SHALL start and automatically open the default browser
- **AND** navigate to the server URL after a 2-second delay

#### Scenario: Graceful shutdown

- **WHEN** user presses Ctrl+C while the server is running
- **THEN** the CLI SHALL display a shutdown message
- **AND** terminate the backend process gracefully with SIGTERM
- **AND** exit the CLI process
