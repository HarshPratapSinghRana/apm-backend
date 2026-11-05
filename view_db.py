import os
import sys
import sqlite3

def main():
    # Ensure UTF-8 output on Windows console
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    root_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(root_dir, "cip-backend-dotnet", "cip.db")
    if not os.path.exists(db_path):
        db_path = os.path.join(root_dir, "cip.db")

    if not os.path.exists(db_path):
        print(f"Warning: SQLite database file not found at: {db_path}")
        print("Please start the backend server first (e.g. dotnet run --project cip-backend-dotnet).")
        return

    table_filter = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    print("=" * 90)
    print("                      ENGINEERING COMMONS - SQLITE DATABASE VIEWER")
    print(f" Database: {db_path}")
    print("=" * 90)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [t[0] for t in cursor.fetchall()]

    if not tables:
        print("No user tables found in database.")
        conn.close()
        return

    for t in tables:
        if table_filter != "all" and table_filter != t.lower():
            continue

        print(f"\n[TABLE] {t.upper()}")
        print("-" * 90)

        cursor.execute(f"PRAGMA table_info({t});")
        columns = [col[1] for col in cursor.fetchall()]

        cursor.execute(f"SELECT * FROM {t} ORDER BY rowid DESC LIMIT 20;")
        rows = cursor.fetchall()

        if not rows:
            print("  (Empty table - no records yet)")
            continue

        # Format column headers and rows
        col_str = " | ".join(columns)
        print(col_str)
        print("-" * 90)
        for r in rows:
            row_str = " | ".join(str(val) if val is not None else "NULL" for val in r)
            print(row_str)

    conn.close()

if __name__ == "__main__":
    main()
