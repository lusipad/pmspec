# 删除临时文件
Write-Host "删除临时文件..."
Remove-Item -Force -ErrorAction SilentlyContinue create_dir.js
Remove-Item -Force -ErrorAction SilentlyContinue create_importers.bat
Remove-Item -Force -ErrorAction SilentlyContinue create_importers.py
Remove-Item -Force -ErrorAction SilentlyContinue setup-importers.js
Remove-Item -Force -ErrorAction SilentlyContinue setup-importers.ps1
Remove-Item -Force -ErrorAction SilentlyContinue _mkimporters.js
Write-Host "✓ 临时文件已删除"

# 执行 git add -A
Write-Host "执行 git add -A..."
git add -A
Write-Host "✓ git add -A 完成"

# 执行 git commit
Write-Host "执行 git commit..."
$commitMessage = @"
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

git commit -m $commitMessage
Write-Host "✓ commit 完成"

# 执行 git push
Write-Host "执行 git push..."
git push
Write-Host "✓ git push 完成"

Write-Host ""
Write-Host "=== 操作完成 ==="
