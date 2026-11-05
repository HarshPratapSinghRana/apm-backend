import os
import sqlite3
import json

db_paths = [
    'cip-backend-dotnet/cip.db',
    'cip-backend-dotnet/engineering_commons.db',
    'engineering_commons.db'
]

for db in db_paths:
    if not os.path.exists(db):
        continue
    print(f"\n========================================================")
    print(f"DATABASE: {db}")
    print(f"========================================================")
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"Tables: {tables}")
    for t in tables:
        cursor.execute(f"PRAGMA table_info({t});")
        cols = [c[1] for c in cursor.fetchall()]
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        count = cursor.fetchone()[0]
        print(f"\n--- TABLE: {t} (Rows: {count}) ---")
        print(f"Columns: {cols}")
        cursor.execute(f"SELECT * FROM {t};")
        rows = cursor.fetchall()
        for r in rows:
            print(r)
    conn.close()
