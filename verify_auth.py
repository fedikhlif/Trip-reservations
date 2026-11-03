"""Verify authentication works for all accounts."""
from database import Database
from repositories.customer_repository import CustomerRepository
from services.auth_service import AuthService

db = Database()
repo = CustomerRepository(db)
auth = AuthService(repo)

# Test Jordan Lee (demo customer)
try:
    user = auth.authenticate("jordan@example.com", "demo-customer-pass")
    print(f"[OK] jordan@example.com -> name={user.name!r}, type={type(user).__name__}")
except Exception as e:
    print(f"[FAIL] jordan@example.com: {e}")

# Test Morgan Admin (demo admin)
try:
    user = auth.authenticate("admin@example.com", "demo-admin-pass")
    print(f"[OK] admin@example.com -> name={user.name!r}, type={type(user).__name__}")
except Exception as e:
    print(f"[FAIL] admin@example.com: {e}")

# Check Fedi khlif (can't test password without knowing it, just confirm account exists)
try:
    fedi = repo.get_user_by_email("fdkhlif@gmail.com")
    print(f"[OK] fdkhlif@gmail.com -> name={fedi.name!r}, type={type(fedi).__name__}, hash_ok={fedi.password_hash.startswith('$argon2')}")
except Exception as e:
    print(f"[FAIL] fdkhlif@gmail.com: {e}")

db.dispose()
