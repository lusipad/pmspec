Set-Location D:\Repos\pmspec
Write-Host "Checking git status..."
$status = git status --short
if ($status) {
    Write-Host "Changes found:`n$status`n"
    Write-Host "Adding and committing changes..."
    git add -A
    git commit -m "feat: complete commercial roadmap implementation"
    Write-Host "Pushing changes..."
    git push
    Write-Host "Push complete."
} else {
    Write-Host "No changes to commit."
}
