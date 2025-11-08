# Publishing Guide

This guide explains how to publish `@pmspec/core` to npm registry.

## Prerequisites

1. **NPM Account**: You need an npm account with publishing permissions for the `@pmspec` scope
2. **NPM Token**: Generate an automation token from npm:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Select "Automation" token type
   - Copy the generated token

3. **GitHub Secret**: Add the NPM token to repository secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm automation token
   - Click "Add secret"

## Publishing Process

The package is automatically published to npm when a version tag is pushed:

### 1. Update Version

Update the version in `package.json`:

```bash
# Bump patch version (1.0.0 → 1.0.1)
npm version patch

# Bump minor version (1.0.0 → 1.1.0)
npm version minor

# Bump major version (1.0.0 → 2.0.0)
npm version major
```

This creates a git commit and tag automatically.

### 2. Push the Tag

```bash
git push origin main --tags
```

Or push the specific tag:

```bash
git push origin v1.0.1
```

### 3. Automated Publishing

The GitHub Actions workflow (`.github/workflows/release.yml`) will:
1. ✅ Checkout the code
2. ✅ Setup Node.js with npm registry authentication
3. ✅ Install dependencies
4. ✅ Build the CLI tool
5. ✅ Build frontend and backend
6. ✅ Create a GitHub release
7. ✅ Publish to npm registry

### 4. Verify Publication

After the workflow completes:

```bash
# Check the package on npm
npm view @pmspec/core

# Test installation
npx @pmspec/core@latest init
```

## Manual Publishing (Not Recommended)

If you need to publish manually:

```bash
# Login to npm
npm login

# Build the package
npm run build

# Publish
npm publish --access public
```

## Package Usage

Once published, users can install and use the package:

```bash
# Global installation
npm install -g @pmspec/core
pmspec init

# Using npx (no installation required)
npx @pmspec/core init
```

## Troubleshooting

### Error: "You must be logged in to publish packages"

- Ensure `NPM_TOKEN` secret is configured in repository settings
- Verify the token has not expired
- Check that the token has publishing permissions

### Error: "You do not have permission to publish"

- Verify you are a member of the `@pmspec` npm organization
- Contact the organization owner to grant publishing permissions

### Error: "Version already exists"

- The version in `package.json` must be bumped before each publish
- Check existing versions: `npm view @pmspec/core versions`

## Version Strategy

Follow semantic versioning (SemVer):

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): New features, backwards-compatible changes
- **Major** (x.0.0): Breaking changes, major refactors

## Pre-release Versions

For testing before official release:

```bash
# Create pre-release version
npm version prerelease --preid=beta
# Results in: 1.0.1-beta.0

# Push and publish
git push origin main --tags
```

Users can then install the pre-release:

```bash
npx @pmspec/core@beta init
```
