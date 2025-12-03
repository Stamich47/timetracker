#!/usr/bin/env python3
import re

# Read the file
with open('src/components/Goals.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all instances of currentAmount with progress.currentValue.toFixed(2)
# This regex looks for the exact pattern
old_pattern = r'\$\{\(goal as RevenueGoal\)\.currentAmount\}'
new_pattern = r'${progress.currentValue.toFixed(2)}'

content = re.sub(old_pattern, new_pattern, content)

# Write the file back
with open('src/components/Goals.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
