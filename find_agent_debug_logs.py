import os
import glob
import time

userprofile = os.environ.get('USERPROFILE', '')
appdata = os.environ.get('APPDATA', '')
localappdata = os.environ.get('LOCALAPPDATA', '')

search_roots = [
    appdata,
    localappdata,
    os.path.join(userprofile, '.copilot'),
    os.path.join(userprofile, '.vscode'),
]

print("Searching for agent debug log files...")
found_files = []

for base in search_roots:
    if not os.path.exists(base):
        continue
    for root, dirs, files in os.walk(base):
        # Match copilot debug logs
        lower_root = root.lower()
        if 'copilot' in lower_root or 'agent' in lower_root:
            for f in files:
                if f.endswith(('.log', '.jsonl', '.json', '.txt')):
                    fp = os.path.join(root, f)
                    try:
                        mtime = os.path.getmtime(fp)
                        size = os.path.getsize(fp)
                        found_files.append((mtime, size, fp))
                    except:
                        pass

found_files.sort(key=lambda x: x[0], reverse=True)
print(f"Total matching files found: {len(found_files)}")
print("\nMost recent 25 files:")
for mtime, size, fp in found_files[:25]:
    t = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
    print(f"[{t}] ({size} bytes) {fp}")
