@echo off
cd /d D:\Repos\pmspec

echo.
echo === Deleting temporary files ===
del /q /f create_dir.js 2>nul
del /q /f create_importers.bat 2>nul
del /q /f create_importers.py 2>nul
del /q /f setup-importers.js 2>nul
del /q /f setup-importers.ps1 2>nul
del /q /f _mkimporters.js 2>nul
echo Files deleted

echo.
echo === Running git add -A ===
git add -A
if %ERRORLEVEL% equ 0 (
    echo OK: git add -A completed
) else (
    echo ERROR: git add -A failed
)

echo.
echo === Running git commit ===
git commit -m "feat: implement commercial roadmap Phase 1 & 2%LF%%LF%Phase 1 - Quality Foundation:%LF%- Add CLI command tests (152 tests)%LF%- Add API route tests (62 tests)%LF%- Add frontend component tests (69 tests)%LF%- Setup E2E testing with Playwright (25 tests)%LF%- Create shared types package (@pmspec/types)%LF%- Add OpenAPI 3.0 docs with Swagger UI%LF%- Add structured logging (pino)%LF%- Add React Error Boundaries%LF%- Implement RFC 7807 API errors%LF%- Create CONTRIBUTING.md%LF%%LF%Phase 2 - Core Features:%LF%- Add feature dependencies support%LF%- Add milestone management%LF%- Add changelog/history tracking%LF%- Add WebSocket real-time updates%LF%- Add external importers (Jira, Linear, GitHub)%LF%- Add full-text search (MiniSearch)%LF%%LF%Co-authored-by: Claude AI"
if %ERRORLEVEL% equ 0 (
    echo OK: git commit completed
) else (
    echo ERROR: git commit failed
)

echo.
echo === Running git push ===
git push
if %ERRORLEVEL% equ 0 (
    echo OK: git push completed
) else (
    echo ERROR: git push failed
)

echo.
echo === All operations completed ===
pause
