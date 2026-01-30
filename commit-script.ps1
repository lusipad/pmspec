cd D:\Repos\pmspec

# Step 1: Delete temporary files
Write-Host "=== Deleting temporary files ==="
$filesToDelete = @(
    "create_dir.js",
    "create_importers.bat",
    "create_importers.py",
    "setup-importers.js",
    "setup-importers.ps1",
    "_mkimporters.js"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "✓ Deleted: $file"
    } else {
        Write-Host "- Not found: $file (already deleted)"
    }
}

Write-Host ""
Write-Host "=== Running git add -A ==="
git add -A
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ git add -A completed successfully"
} else {
    Write-Host "✗ git add -A failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== Running git commit ==="
git commit -m "feat: implement commercial roadmap Phase 1 & 2

Phase 1 - Quality Foundation:
- Add CLI command tests (152 tests)
- Add API route tests (62 tests)
- Add frontend component tests (69 tests)
- Setup E2E testing with Playwright (25 tests)
- Create shared types package (@pmspec/types)
- Add OpenAPI 3.0 docs with Swagger UI
- Add structured logging (pino)
- Add React Error Boundaries
- Implement RFC 7807 API errors
- Create CONTRIBUTING.md

Phase 2 - Core Features:
- Add feature dependencies support
- Add milestone management
- Add changelog/history tracking
- Add WebSocket real-time updates
- Add external importers (Jira, Linear, GitHub)
- Add full-text search (MiniSearch)

Co-authored-by: Claude AI"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ git commit completed successfully"
} else {
    Write-Host "✗ git commit failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "=== Running git push ==="
git push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ git push completed successfully"
} else {
    Write-Host "✗ git push failed with exit code $LASTEXITCODE"
}

# Clean up this script after running
Write-Host ""
Write-Host "=== Cleanup ==="
Write-Host "Remember to delete this script after execution: Remove-Item commit-script.ps1"
