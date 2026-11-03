"""One-shot script to fix broken demo account password hashes in the database.
Run once: python fix_demo_hashes.py
"""
import os
from argon2 import PasswordHasher
from database import Database
from repositories.customer_repository import CustomerRepository

ph = PasswordHasher()
db = Database()
repo = CustomerRepository(db)

demo_customer_pw = os.getenv("DEMO_CUSTOMER_PASSWORD", "demo-customer-pass")
demo_admin_pw = os.getenv("DEMO_ADMIN_PASSWORD", "demo-admin-pass")

# Fix Jordan Lee (id=1, customer)
try:
    customer = repo.get_by_id(1)
    if not customer.password_hash.startswith("$argon2"):
        customer.password_hash = ph.hash(demo_customer_pw)
        repo.update(customer)
        print(f"[OK] Fixed Jordan Lee. Login: jordan@example.com / {demo_customer_pw}")
    else:
        print("[--] Jordan Lee already has a valid Argon2 hash — no change needed.")
except Exception as e:
    print(f"[ERR] Jordan Lee: {e}")

# Fix Morgan Admin (id=2, admin)
try:
    admin = repo.get_user_by_id(2)
    if not admin.password_hash.startswith("$argon2"):
        admin.password_hash = ph.hash(demo_admin_pw)
        repo.update(admin)
        print(f"[OK] Fixed Morgan Admin. Login: admin@example.com / {demo_admin_pw}")
    else:
        print("[--] Morgan Admin already has a valid Argon2 hash — no change needed.")
except Exception as e:
    print(f"[ERR] Morgan Admin: {e}")

# Verify all accounts
print("\n--- All users in database ---")
from sqlalchemy import select
from models import UserModel
with db.session_scope() as session:
    all_users = session.scalars(select(UserModel)).all()
    for user in all_users:
        valid = user.password_hash.startswith("$argon2")
        print(f"  id={user.id} {user.role.value:8s} {user.email:30s} hash={'VALID' if valid else 'BROKEN'}")

db.dispose()
print("\nDone. Restart Flask if it is running.")
