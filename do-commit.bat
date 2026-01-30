@echo off
chcp 65001 >nul
cd /d D:\Repos\pmspec

echo.
echo === Step 1: Deleting temporary files ===
if exist create_dir.js del /f /q create_dir.js && echo Deleted: create_dir.js
if exist create_importers.bat del /f /q create_importers.bat && echo Deleted: create_importers.bat
if exist create_importers.py del /f /q create_importers.py && echo Deleted: create_importers.py
if exist setup-importers.js del /f /q setup-importers.js && echo Deleted: setup-importers.js
if exist setup-importers.ps1 del /f /q setup-importers.ps1 && echo Deleted: setup-importers.ps1
if exist _mkimporters.js del /f /q _mkimporters.js && echo Deleted: _mkimporters.js

echo.
echo === Step 2: Running git add -A ===
git add -A
if %errorlevel% equ 0 (echo OK) else (echo FAILED)

echo.
echo === Step 3: Running git commit ===
git commit -F commit-message.txt
if %errorlevel% equ 0 (echo OK) else (echo FAILED)

echo.
echo === Step 4: Running git push ===
git push
if %errorlevel% equ 0 (echo OK) else (echo FAILED - This may be due to network or auth issues)

echo.
echo === Complete ===
pause
