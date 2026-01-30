#!/usr/bin/env python3
"""
执行删除临时文件、提交和推送的脚本
"""

import os
import subprocess
import sys

os.chdir(r'D:\Repos\pmspec')

# 要删除的文件列表
files_to_delete = [
    'create_dir.js',
    'create_importers.bat',
    'create_importers.py',
    'setup-importers.js',
    'setup-importers.ps1',
    '_mkimporters.js'
]

print("=" * 50)
print("删除临时文件")
print("=" * 50)

for file in files_to_delete:
    try:
        if os.path.exists(file):
            os.remove(file)
            print(f"✓ 已删除: {file}")
        else:
            print(f"- 未找到: {file}")
    except Exception as e:
        print(f"✗ 错误删除 {file}: {e}")

print("\n" + "=" * 50)
print("执行 git add -A")
print("=" * 50)
result = subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
if result.returncode == 0:
    print("✓ git add -A 完成")
else:
    print(f"✗ git add -A 失败: {result.stderr}")

print("\n" + "=" * 50)
print("执行 git commit")
print("=" * 50)

commit_message = """feat: implement commercial roadmap Phase 1 & 2

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
"""

result = subprocess.run(['git', 'commit', '-m', commit_message], capture_output=True, text=True)
if result.returncode == 0:
    print("✓ git commit 完成")
    print(result.stdout)
else:
    print(f"✗ git commit 失败: {result.stderr}")

print("\n" + "=" * 50)
print("执行 git push")
print("=" * 50)

result = subprocess.run(['git', 'push'], capture_output=True, text=True)
if result.returncode == 0:
    print("✓ git push 完成")
    print(result.stdout)
else:
    print(f"✗ git push 失败: {result.stderr}")

print("\n" + "=" * 50)
print("所有操作完成")
print("=" * 50)
