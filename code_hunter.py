import os
import sys

def search_code(term, root_dir='app'):
    print(f"\n🔍 BOT ACTIVE: Hunting for '{term}' inside '{root_dir}/'...")
    print("-" * 60)
    
    found_count = 0
    
    for root, dirs, files in os.walk(root_dir):
        # 1. Ignore junk folders
        dirs[:] = [d for d in dirs if d not in ['.next', 'node_modules', '.git', 'out']]
        
        for file in files:
            # 2. Only check code files
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if term in line:
                                found_count += 1
                                print(f"📍 {file_path} [Line {i+1}]")
                                print(f"   👉 {line.strip()[:100]}") # Show preview
                                print("")
                except Exception as e:
                    # Skip files we can't read
                    continue

    print("-" * 60)
    if found_count == 0:
        print(f"✅ CLEAN: The term '{term}' was NOT found in any file.")
    else:
        print(f"⚠️  FOUND: Detected {found_count} instances.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 code_hunter.py \"<text to find>\"")
        print("Example: python3 code_hunter.py \"Search\"")
    else:
        search_code(sys.argv[1])
