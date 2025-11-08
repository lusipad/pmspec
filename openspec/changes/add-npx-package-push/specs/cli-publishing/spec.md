# CLI Publishing Capability

## ADDED Requirements

### Requirement: NPM Package Publishing

The system SHALL automatically publish the `@pmspec/core` package to npm registry when a version tag is pushed to the repository.

#### Scenario: Successful npm publish on version tag

- **WHEN** a version tag matching pattern `v*.*.*` is pushed to the repository
- **THEN** the GitHub Actions workflow builds the package
- **THEN** the package is published to npm registry using the NPM_TOKEN secret
- **THEN** the package becomes available for installation via `npm install -g @pmspec/core`
- **THEN** the package becomes available for execution via `npx @pmspec/core`

#### Scenario: Publish fails without proper authentication

- **WHEN** the NPM_TOKEN secret is not configured in repository settings
- **THEN** the npm publish step fails with authentication error
- **THEN** the GitHub Actions workflow marks the job as failed

### Requirement: Package Configuration

The package.json SHALL be configured with correct publishing settings for npm registry.

#### Scenario: Package metadata is correct

- **WHEN** reviewing package.json configuration
- **THEN** the package name is set to `@pmspec/core`
- **THEN** the publishConfig.access is set to `public` (required for scoped packages)
- **THEN** the bin configuration points to `./bin/pmspec.js`
- **THEN** the files array includes all necessary distribution files

### Requirement: Build Before Publish

The system SHALL build all necessary artifacts before publishing to npm.

#### Scenario: Build artifacts are generated

- **WHEN** the publish workflow runs
- **THEN** TypeScript source is compiled to JavaScript in dist/
- **THEN** all dependencies are installed via `npm ci`
- **THEN** the build completes successfully before npm publish is attempted
