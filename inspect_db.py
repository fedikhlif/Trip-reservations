import sqlite3

conn = sqlite3.connect("trip_reservation.db")
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables:", [t[0] for t in tables])

for (table,) in tables:
    cur.execute(f"PRAGMA table_info({table})")
    cols = cur.fetchall()
    print(f"\n{table} columns:", [c[1] for c in cols])

conn.close()

