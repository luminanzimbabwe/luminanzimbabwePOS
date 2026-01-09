import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'luminan_backend.settings')
django.setup()

from core.models import CashFloat
from django.utils import timezone
today = timezone.localdate()

print(f"Today's date: {today}")
drawers = CashFloat.objects.filter(date=today)
print(f"Drawers found: {drawers.count()}")

for d in drawers:
    name = d.cashier.name if d.cashier else 'None'
    print(f"Cashier: {name}, transfer_usd: {d.current_transfer_usd}, transfer_zig: {d.current_transfer_zig}, transfer_rand: {d.current_transfer_rand}")

total = sum(d.current_transfer_usd for d in drawers)
print(f"Total transfer USD: {total}")
