import os
import json
import shutil
import time

class RebuildOrchestrator:
    def __init__(self, source_dir='app_backup', sandbox_dir='sandbox', doc_dir='doc/rebuild'):
        self.source_dir = source_dir
        self.sandbox_dir = sandbox_dir
        self.doc_dir = doc_dir
        self.inventory = []
        
        for d in [self.sandbox_dir, self.doc_dir]:
            os.makedirs(d, exist_ok=True)

    def ingest(self):
        print(f"\n🔍 [PHASE 1: INGESTION]")
        print(f"Reading source code from '{self.source_dir}'...")
        for root, _, files in os.walk(self.source_dir):
            if any(x in root for x in ['.next', 'node_modules', '.git']): continue
            for file in files:
                if file.endswith(('.tsx', '.ts', '.css', '.js')):
                    path = os.path.join(root, file)
                    self.inventory.append(path)
        
        self.inventory.sort()
        print(f"✅ Ingest Complete: {len(self.inventory)} components identified.")

    def run_rebuild(self):
        self.ingest()
        print(f"\n🚀 [PHASE 2: SANDBOX RECONSTRUCTION]")
        print(f"🌍 PREVIEW LINK: http://localhost:3002")
        print("-" * 60)
        
        for file_path in self.inventory:
            relative_path = os.path.relpath(file_path, self.source_dir)
            target_path = os.path.join(self.sandbox_dir, relative_path)
            
            print(f"\n➡️  READY TO ASSEMBLE: {relative_path}")
            choice = input(f"👉 Approve assembly for '{relative_path}'? (y/n/q): ").lower()
            
            if choice == 'q': 
                break
            if choice == 'n': 
                continue
            
            if choice == 'y':
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                shutil.copy2(file_path, target_path)
                print(f"\n✅ COMPONENT COMPLETE: {relative_path}")
                print(f"🔗 View changes at: http://localhost:3002")
                obs = input("📝 Enter post-section note: ")
                self.log_documentation(relative_path, obs)

    def log_documentation(self, section_name, note):
        log_file = os.path.join(self.doc_dir, f"{section_name.replace('/', '_')}.md")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        log_content = f"# Rebuild Log: {section_name}\n- **Status**: Assembled\n- **Note**: {note}\n"
        with open(log_file, 'w') as f:
            f.write(log_content)

if __name__ == "__main__":
    bot = RebuildOrchestrator()
    bot.run_rebuild()
