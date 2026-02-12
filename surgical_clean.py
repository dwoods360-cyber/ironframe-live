import os

file_path = 'app/reports/vendor-risk/artifacts/page.tsx'

if not os.path.exists(file_path):
    print(f"❌ Error: {file_path} not found.")
    exit()

with open(file_path, 'r') as f:
    lines = f.readlines()

print(f"🔍 Scanning {file_path} for Search zombies...")

new_lines = []
removed_count = 0

for line in lines:
    # Logic: Remove lines containing the Search icon import, 
    # search state, or the hardcoded search UI elements.
    if 'Search' in line or 'searchQuery' in line or 'setSearchQuery' in line or 'matchesSearch' in line:
        # Special case: Don't remove the entire line if it's the lucide-react import 
        # but DOES contain other icons you need.
        if 'lucide-react' in line and ('Activity' in line or 'Clock' in line):
            cleaned_line = line.replace('Search,', '').replace('Search', '')
            new_lines.append(cleaned_line)
            removed_count += 1
            continue
        
        removed_count += 1
        continue # Skip the line (delete it)
    
    new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print(f"✅ SUCCESS: Removed {removed_count} lines/instances of Search logic.")
print("🚀 Next Step: Stop your server and run 'npm run dev'.")
