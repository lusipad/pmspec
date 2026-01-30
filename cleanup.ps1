cd D:\Repos\pmspec
Remove-Item -Path create_dir.js, create_importers.bat, create_importers.py, setup-importers.js, setup-importers.ps1, _mkimporters.js -Force -ErrorAction SilentlyContinue
git add -A
$msg = @"
feat: implement commercial roadmap Phase 1 & 2

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

Co-authored-by: Claude AI
"@
$tempFile = [System.IO.Path]::GetTempFileName()
$msg | Out-File -Encoding UTF8 -FilePath $tempFile
git commit -F $tempFile
Remove-Item $tempFile -Force
git push
