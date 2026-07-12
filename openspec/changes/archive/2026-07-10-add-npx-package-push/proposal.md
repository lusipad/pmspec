> **归档说明（2026-07-10）**: 该变更在 v1 时期已实现但未归档。随 redesign-pmspec-v2 流程复位补归档；其中 Web/Desktop 相关能力已在 v2 中移除。

# Add NPM Package Publishing

## Why

Currently, the `@pmspec/core` package is configured for npm publishing but the GitHub Actions workflow has the npm publish step commented out. Users cannot install and use the package via `npx @pmspec/core` because it's not published to the npm registry.

## What Changes

- Enable npm package publishing in GitHub Actions workflow
- Configure proper npm authentication using NPM_TOKEN secret
- Ensure the package is published to npm registry when version tags are pushed
- Add documentation about the publishing process and how to use the package via npx

## Impact

- **Affected specs**: `cli-publishing` (new capability)
- **Affected code**:
  - `.github/workflows/release.yml` - Uncomment and configure npm publish step
  - `README.md` - Add publishing documentation (if needed)
- **Breaking changes**: None
- **User benefit**: Package will be available on npm registry and usable via `npx @pmspec/core`
