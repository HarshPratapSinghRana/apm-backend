import os
import sys
import sqlite3
import json
import csv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

db_path = 'cip-backend-dotnet/cip.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [t[0] for t in cursor.fetchall()]

print("=" * 80)
print(f"EXTRACTING ALL DATA FROM {db_path}")
print("=" * 80)

data_by_table = {}

for t in tables:
    cursor.execute(f"PRAGMA table_info({t});")
    cols = [c[1] for c in cursor.fetchall()]
    cursor.execute(f"SELECT * FROM {t};")
    rows = cursor.fetchall()
    
    dict_rows = []
    for r in rows:
        row_dict = {}
        for idx, col in enumerate(cols):
            row_dict[col] = r[idx]
        dict_rows.append(row_dict)
    
    data_by_table[t] = dict_rows
    print(f"Table '{t}': {len(dict_rows)} records extracted.")

conn.close()

# Save complete JSON dump
with open('scripts/full_db_dump.json', 'w', encoding='utf-8') as f:
    json.dump(data_by_table, f, indent=2, ensure_ascii=False)

print("\nSaved complete database dump to scripts/full_db_dump.json")
