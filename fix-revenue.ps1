$file = "src/components/Goals.tsx"
$content = Get-Content $file -Raw
$content = $content -replace '\$\{\\(goal as RevenueGoal\\)\.currentAmount\}', '$${progress.currentValue.toFixed(2)}'
Set-Content $file $content
Write-Host "Replaced!"
