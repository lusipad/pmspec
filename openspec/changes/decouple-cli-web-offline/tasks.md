# Implementation Tasks

## 1. Monorepo Setup and Structure Migration

- [ ] 1.1 Create `packages/` directory structure
- [ ] 1.2 Create `packages/cli/`, `packages/web/`, `packages/core/` directories
- [ ] 1.3 Move `src/` → `packages/cli/src/`
- [ ] 1.4 Move `bin/` → `packages/cli/bin/`
- [ ] 1.5 Move `web/` → `packages/web/`
- [ ] 1.6 Create root `package.json` with workspaces configuration
- [ ] 1.7 Create `packages/cli/package.json` with CLI-specific metadata
- [ ] 1.8 Create `packages/web/package.json` with Web-specific metadata
- [ ] 1.9 Create `packages/core/package.json` as meta package
- [ ] 1.10 Update root `.gitignore` for monorepo structure

## 2. TypeScript Configuration Update

- [ ] 2.1 Create root `tsconfig.json` for workspace
- [ ] 2.2 Create `packages/cli/tsconfig.json` with project references
- [ ] 2.3 Create `packages/web/backend/tsconfig.json` with project references
- [ ] 2.4 Create `packages/web/frontend/tsconfig.json` (already exists, may need updates)
- [ ] 2.5 Update all import paths to reflect new structure
- [ ] 2.6 Test TypeScript compilation across all packages
- [ ] 2.7 Fix any compilation errors

## 3. CLI Package Configuration

- [ ] 3.1 Update `packages/cli/package.json` with correct name `@pmspec/cli`
- [ ] 3.2 Set version to `2.0.0` (major version for breaking changes)
- [ ] 3.3 Configure package files (include `dist`, `bin`, exclude `src`, tests)
- [ ] 3.4 Update bin entry point to `./bin/pmspec.js`
- [ ] 3.5 Move CLI-specific dependencies to `packages/cli/package.json`
- [ ] 3.6 Update README for CLI package
- [ ] 3.7 Add CLI-specific scripts (build, test, dev)

## 4. Web Package Configuration

- [ ] 4.1 Update `packages/web/package.json` with correct name `@pmspec/web`
- [ ] 4.2 Set version to `2.0.0`
- [ ] 4.3 Configure package files (include `frontend/dist`, `backend/dist`, `shared`)
- [ ] 4.4 Create `packages/web/bin/pmspec-web.js` as standalone entry point
- [ ] 4.5 Add bin entry in package.json: `"pmspec-web": "./bin/pmspec-web.js"`
- [ ] 4.6 Move Web-specific dependencies to `packages/web/package.json`
- [ ] 4.7 Update README for Web package
- [ ] 4.8 Add Web-specific scripts (build, dev, start)

## 5. Core Meta Package Configuration

- [ ] 5.1 Create `packages/core/package.json` with name `@pmspec/core`
- [ ] 5.2 Set version to `2.0.0`
- [ ] 5.3 Add dependencies: `"@pmspec/cli": "^2.0.0"`, `"@pmspec/web": "^2.0.0"`
- [ ] 5.4 Add bin entry that delegates to `@pmspec/cli/bin/pmspec.js`
- [ ] 5.5 Create `packages/core/README.md` explaining meta package purpose
- [ ] 5.6 Add deprecation notice suggesting users choose CLI or Web based on needs

## 6. Serve Command Refactoring

- [ ] 6.1 Implement `findWebPackage()` function to detect `@pmspec/web`
- [ ] 6.2 Check global node_modules (`npm root -g`)
- [ ] 6.3 Check local node_modules (`./node_modules`)
- [ ] 6.4 Add `--web-path` option to `serve` command
- [ ] 6.5 Update error messages to guide Web package installation
- [ ] 6.6 Add helpful hints (global vs local install, custom path)
- [ ] 6.7 Update serve command tests
- [ ] 6.8 Test serve command with and without `@pmspec/web` installed

## 7. Standalone Web Server Entry Point

- [ ] 7.1 Create `packages/web/bin/pmspec-web.js` script
- [ ] 7.2 Implement CLI argument parsing (port, pmspace-path, open)
- [ ] 7.3 Implement environment variable reading (PORT, PMSPACE_PATH)
- [ ] 7.4 Add pmspace directory validation
- [ ] 7.5 Add pmspace discovery (current dir, parent dirs)
- [ ] 7.6 Start Express server from standalone script
- [ ] 7.7 Add error handling and helpful messages
- [ ] 7.8 Test standalone Web server

## 8. Build Scripts and Automation

- [ ] 8.1 Create `scripts/build-all.ts` to build all packages
- [ ] 8.2 Update root `package.json` scripts:
  - `"build": "npm run build --workspaces"`
  - `"test": "npm run test --workspaces"`
  - `"dev": "npm run dev --workspace=@pmspec/cli"`
- [ ] 8.3 Test workspace build commands
- [ ] 8.4 Ensure build order is correct (shared dependencies first)
- [ ] 8.5 Add clean scripts to remove dist directories

## 9. Offline Package Build Script

- [ ] 9.1 Create `scripts/build-offline.ts` script
- [ ] 9.2 Implement CLI tarball creation (`pmspec-cli.tar.gz`)
- [ ] 9.3 Implement CLI zip creation (`pmspec-cli.zip`)
- [ ] 9.4 Implement Web tarball creation (`pmspec-web.tar.gz`)
- [ ] 9.5 Implement Web zip creation (`pmspec-web.zip`)
- [ ] 9.6 Implement full tarball creation (`pmspec-full.tar.gz`)
- [ ] 9.7 Implement full zip creation (`pmspec-full.zip`)
- [ ] 9.8 Add SHA256 checksum generation
- [ ] 9.9 Test offline package extraction and installation
- [ ] 9.10 Add offline package build to root scripts

## 10. GitHub Actions Workflow - CLI Release

- [ ] 10.1 Create `.github/workflows/release-cli.yml`
- [ ] 10.2 Configure trigger: `tags: ['cli-v*']`
- [ ] 10.3 Add steps: checkout, setup Node.js, install dependencies
- [ ] 10.4 Add build step for CLI package
- [ ] 10.5 Add test step for CLI package
- [ ] 10.6 Add npm publish step for `@pmspec/cli`
- [ ] 10.7 Add GitHub release creation
- [ ] 10.8 Test workflow with test tag

## 11. GitHub Actions Workflow - Web Release

- [ ] 11.1 Create `.github/workflows/release-web.yml`
- [ ] 11.2 Configure trigger: `tags: ['web-v*']`
- [ ] 11.3 Add steps: checkout, setup Node.js, install dependencies
- [ ] 11.4 Add build step for Web package (frontend + backend)
- [ ] 11.5 Add test step for Web package
- [ ] 11.6 Add npm publish step for `@pmspec/web`
- [ ] 11.7 Add GitHub release creation
- [ ] 11.8 Test workflow with test tag

## 12. GitHub Actions Workflow - Core Meta Package Release

- [ ] 12.1 Create `.github/workflows/release-core.yml`
- [ ] 12.2 Configure trigger: `tags: ['core-v*']`
- [ ] 12.3 Add steps: checkout, setup Node.js
- [ ] 12.4 Update core package.json dependencies to latest CLI and Web versions
- [ ] 12.5 Add npm publish step for `@pmspec/core`
- [ ] 12.6 Add GitHub release creation
- [ ] 12.7 Test workflow with test tag

## 13. GitHub Actions Workflow - Offline Packages

- [ ] 13.1 Create `.github/workflows/release-offline.yml`
- [ ] 13.2 Configure trigger: `tags: ['offline-v*']` or manual dispatch
- [ ] 13.3 Add build steps for all packages
- [ ] 13.4 Run `scripts/build-offline.ts`
- [ ] 13.5 Upload offline packages as release assets
- [ ] 13.6 Include checksums in release notes
- [ ] 13.7 Test workflow

## 14. Documentation Updates

- [ ] 14.1 Update root `README.md`:
  - Explain three packages (CLI, Web, Core)
  - Update installation instructions
  - Add migration guide section
- [ ] 14.2 Create `packages/cli/README.md`:
  - CLI-specific installation
  - CLI commands reference
  - Standalone CLI usage
- [ ] 14.3 Create `packages/web/README.md`:
  - Web-specific installation
  - Standalone Web server usage
  - Environment variables
- [ ] 14.4 Create `packages/core/README.md`:
  - Explain meta package purpose
  - Recommend choosing CLI or Web based on needs
- [ ] 14.5 Update `PUBLISHING.md`:
  - Multi-package publishing workflow
  - Tag naming conventions
  - Offline package generation
- [ ] 14.6 Create `MIGRATION.md`:
  - Guide for migrating from v1.x to v2.0
  - Explain package changes
  - Provide migration examples
- [ ] 14.7 Update `AI_GUIDE.md` if needed

## 15. Testing and Validation

- [ ] 15.1 Test CLI package installation: `npm install -g @pmspec/cli`
- [ ] 15.2 Test CLI commands work without Web installed
- [ ] 15.3 Test `pmspec serve` error message when Web not installed
- [ ] 15.4 Test Web package installation: `npm install -g @pmspec/web`
- [ ] 15.5 Test standalone Web server: `pmspec-web --port 3000`
- [ ] 15.6 Test Core package installation: `npm install -g @pmspec/core`
- [ ] 15.7 Test that Core package includes both CLI and Web
- [ ] 15.8 Test offline CLI package extraction and usage
- [ ] 15.9 Test offline Web package extraction and usage
- [ ] 15.10 Test offline full package
- [ ] 15.11 Run all unit tests across packages
- [ ] 15.12 Run integration tests for CLI + Web interaction

## 16. Pre-release Testing

- [ ] 16.1 Publish alpha versions to npm:
  - `@pmspec/cli@2.0.0-alpha.1`
  - `@pmspec/web@2.0.0-alpha.1`
  - `@pmspec/core@2.0.0-alpha.1`
- [ ] 16.2 Test alpha installations on clean systems
- [ ] 16.3 Collect feedback on alpha versions
- [ ] 16.4 Fix any issues found during alpha testing
- [ ] 16.5 Publish beta versions if needed
- [ ] 16.6 Conduct final testing on beta versions

## 17. Final Release

- [ ] 17.1 Update all package versions to `2.0.0`
- [ ] 17.2 Generate changelogs for each package
- [ ] 17.3 Create git tags:
  - `cli-v2.0.0`
  - `web-v2.0.0`
  - `core-v2.0.0`
- [ ] 17.4 Push tags to trigger release workflows
- [ ] 17.5 Verify all packages published successfully
- [ ] 17.6 Verify GitHub releases created
- [ ] 17.7 Verify offline packages available
- [ ] 17.8 Test final installations from npm
- [ ] 17.9 Announce release on GitHub and documentation

## 18. Post-Release Monitoring

- [ ] 18.1 Monitor npm download stats
- [ ] 18.2 Monitor GitHub issues for migration problems
- [ ] 18.3 Respond to user feedback
- [ ] 18.4 Prepare patch releases if critical bugs found
- [ ] 18.5 Update documentation based on user questions
