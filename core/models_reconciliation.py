from django.db import models
from django.utils import timezone
from decimal import Decimal
from .models import ShopConfiguration, Cashier, CashFloat, ShopDay

class CashierCount(models.Model):
    """
    Detailed Cashier Count for EOD Reconciliation
    Stores the detailed counting data from the frontend (denominations, receipts, etc.)
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'Count in Progress'),
        ('COMPLETED', 'Count Completed'),
        ('REVIEWED', 'Count Reviewed'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    cashier = models.ForeignKey(Cashier, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    
    # USD Cash Counting Details (denominations)
    usd_100 = models.PositiveIntegerField(default=0, help_text="$100 bills")
    usd_50 = models.PositiveIntegerField(default=0, help_text="$50 bills")
    usd_20 = models.PositiveIntegerField(default=0, help_text="$20 bills")
    usd_10 = models.PositiveIntegerField(default=0, help_text="$10 bills")
    usd_5 = models.PositiveIntegerField(default=0, help_text="$5 bills")
    usd_2 = models.PositiveIntegerField(default=0, help_text="$2 bills")
    usd_1 = models.PositiveIntegerField(default=0, help_text="$1 bills")
    # USD Coins
    usd_1_coin = models.PositiveIntegerField(default=0, help_text="$1 coins (Sacagawea/Susan B)")
    usd_0_50 = models.PositiveIntegerField(default=0, help_text="50 cents (half dollar)")
    usd_0_25 = models.PositiveIntegerField(default=0, help_text="25 cents (quarter)")
    usd_0_10 = models.PositiveIntegerField(default=0, help_text="10 cents (dime)")
    usd_0_05 = models.PositiveIntegerField(default=0, help_text="5 cents (nickel)")
    usd_0_01 = models.PositiveIntegerField(default=0, help_text="1 cent (penny)")
    
    # ZIG Cash Counting Details (denominations)
    zig_100 = models.PositiveIntegerField(default=0, help_text="ZIG 100")
    zig_50 = models.PositiveIntegerField(default=0, help_text="ZIG 50")
    zig_20 = models.PositiveIntegerField(default=0, help_text="ZIG 20")
    zig_10 = models.PositiveIntegerField(default=0, help_text="ZIG 10")
    zig_5 = models.PositiveIntegerField(default=0, help_text="ZIG 5")
    zig_2 = models.PositiveIntegerField(default=0, help_text="ZIG 2")
    zig_1 = models.PositiveIntegerField(default=0, help_text="ZIG 1")
    # ZIG Coins
    zig_0_50 = models.PositiveIntegerField(default=0, help_text="ZiG 50 cents")
    
    # RAND Cash Counting Details (denominations)
    rand_200 = models.PositiveIntegerField(default=0, help_text="RAND 200")
    rand_100 = models.PositiveIntegerField(default=0, help_text="RAND 100")
    rand_50 = models.PositiveIntegerField(default=0, help_text="RAND 50")
    rand_20 = models.PositiveIntegerField(default=0, help_text="RAND 20")
    rand_10 = models.PositiveIntegerField(default=0, help_text="RAND 10")
    rand_5 = models.PositiveIntegerField(default=0, help_text="RAND 5")
    rand_2 = models.PositiveIntegerField(default=0, help_text="RAND 2")
    rand_1 = models.PositiveIntegerField(default=0, help_text="RAND 1")
    # RAND Coins
    rand_0_50 = models.PositiveIntegerField(default=0, help_text="50 cents")
    rand_0_20 = models.PositiveIntegerField(default=0, help_text="20 cents")
    rand_0_10 = models.PositiveIntegerField(default=0, help_text="10 cents")
    rand_0_05 = models.PositiveIntegerField(default=0, help_text="5 cents")
    
    # Legacy fields (for backward compatibility)
    hundreds = models.PositiveIntegerField(default=0)
    fifties = models.PositiveIntegerField(default=0)
    twenties = models.PositiveIntegerField(default=0)
    tens = models.PositiveIntegerField(default=0)
    fives = models.PositiveIntegerField(default=0)
    twos = models.PositiveIntegerField(default=0)
    ones = models.PositiveIntegerField(default=0)
    coins = models.PositiveIntegerField(default=0)
    
    # Receipt Counting (number of receipts/slips)
    card_receipts = models.PositiveIntegerField(default=0)
    ecocash_receipts = models.PositiveIntegerField(default=0)
    other_receipts = models.PositiveIntegerField(default=0)
    
    # Transfer and Card Amounts (all currencies combined)
    total_transfer = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total transfer payments (all currencies)")
    total_card_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total card payments (all currencies)")
    
    # Calculated Totals
    total_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_zig = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_other = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Expected vs Actual (multi-currency support)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_cash_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    expected_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Variances (per-currency for accurate reconciliation)
    cash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_variance_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_variance_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cash_variance_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ecocash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status and Notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    notes = models.TextField(blank=True)
    
    # Tracking
    counted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    counted_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='counts_performed')
    
    class Meta:
        verbose_name = "Cashier Count"
        verbose_name_plural = "Cashier Counts"
        unique_together = ['shop', 'cashier', 'date']
        ordering = ['-counted_at']
        indexes = [
            models.Index(fields=['shop', 'date']),
            models.Index(fields=['cashier', 'date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.cashier.name} - {self.date} - ${self.grand_total} ({self.get_status_display()})"
    
    def calculate_totals(self):
        """Calculate all totals and variances"""
        # Calculate USD cash total from denominations (bills + coins)
        usd_total = (
            self.usd_100 * 100 +
            self.usd_50 * 50 +
            self.usd_20 * 20 +
            self.usd_10 * 10 +
            self.usd_5 * 5 +
            self.usd_2 * 2 +
            self.usd_1 * 1 +
            self.usd_1_coin * 1 +
            self.usd_0_50 * 0.50 +
            self.usd_0_25 * 0.25 +
            self.usd_0_10 * 0.10 +
            self.usd_0_05 * 0.05 +
            self.usd_0_01 * 0.01
        )
        
        # Calculate ZIG cash total from denominations (notes + coins)
        zig_total = (
            self.zig_100 * 100 +
            self.zig_50 * 50 +
            self.zig_20 * 20 +
            self.zig_10 * 10 +
            self.zig_5 * 5 +
            self.zig_2 * 2 +
            self.zig_1 * 1 +
            self.zig_0_50 * 0.50
        )
        
        # Calculate RAND cash total from denominations (notes + coins)
        rand_total = (
            self.rand_200 * 200 +
            self.rand_100 * 100 +
            self.rand_50 * 50 +
            self.rand_20 * 20 +
            self.rand_10 * 10 +
            self.rand_5 * 5 +
            self.rand_2 * 2 +
            self.rand_1 * 1 +
            self.rand_0_50 * 0.50 +
            self.rand_0_20 * 0.20 +
            self.rand_0_10 * 0.10 +
            self.rand_0_05 * 0.05
        )
        
        # Legacy calculation for backward compatibility
        legacy_cash = (
            self.hundreds * 100 +
            self.fifties * 50 +
            self.twenties * 20 +
            self.tens * 10 +
            self.fives * 5 +
            self.twos * 2 +
            self.ones * 1 +
            self.coins * 0.5
        )
        
        # Update calculated totals
        self.total_cash_usd = Decimal(str(usd_total))
        self.total_cash_zig = Decimal(str(zig_total))
        self.total_cash_rand = Decimal(str(rand_total))
        self.total_cash = self.total_cash_usd + self.total_cash_zig + self.total_cash_rand + Decimal(str(legacy_cash))
        
        # Use total_card_amount if set, otherwise fall back to receipt counting
        if self.total_card_amount > 0:
            self.total_card = self.total_card_amount
        else:
            # Legacy: receipt totals (assuming $1 per receipt for counting purposes)
            self.total_card = Decimal(str(self.card_receipts * 1))
        
        self.total_ecocash = Decimal(str(self.ecocash_receipts * 1))
        self.total_other = self.total_transfer + Decimal(str(self.other_receipts * 1))
        self.grand_total = self.total_cash + self.total_card + self.total_ecocash + self.total_other
        
        # Calculate variances
        self.cash_variance = self.total_cash - self.expected_cash
        self.card_variance = self.total_card - self.expected_card
        self.ecocash_variance = self.total_ecocash - self.expected_ecocash
        self.total_variance = self.cash_variance + self.card_variance + self.ecocash_variance

        # Calculate per-currency cash variances (for accurate reconciliation)
        self.cash_variance_usd = self.total_cash_usd - self.expected_cash_usd
        self.cash_variance_zig = self.total_cash_zig - self.expected_cash_zig
        self.cash_variance_rand = self.total_cash_rand - self.expected_cash_rand

        return self
    
    def save(self, *args, **kwargs):
        """Auto-calculate totals before saving"""
        self.calculate_totals()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_or_create_count(cls, shop, cashier, date=None, counted_by=None):
        """Get or create a cashier count record"""
        if not date:
            date = timezone.now().date()
        
        count, created = cls.objects.get_or_create(
            shop=shop,
            cashier=cashier,
            date=date,
            defaults={
                'status': 'IN_PROGRESS',
                'counted_by': counted_by if counted_by else cashier
            }
        )
        return count, created
    
    def get_count_summary(self):
        """Get a summary of the count for display"""
        # Check if cashier has actually entered any count data
        # A "real" count should have at least some denominations entered
        has_usd_count = (
            self.usd_100 > 0 or self.usd_50 > 0 or self.usd_20 > 0 or
            self.usd_10 > 0 or self.usd_5 > 0 or self.usd_2 > 0 or
            self.usd_1 > 0 or self.usd_1_coin > 0 or self.usd_0_50 > 0 or
            self.usd_0_25 > 0 or self.usd_0_10 > 0 or self.usd_0_05 > 0 or
            self.usd_0_01 > 0
        )
        has_zig_count = (
            self.zig_100 > 0 or self.zig_50 > 0 or self.zig_20 > 0 or
            self.zig_10 > 0 or self.zig_5 > 0 or self.zig_2 > 0 or
            self.zig_1 > 0 or self.zig_0_50 > 0
        )
        has_rand_count = (
            self.rand_200 > 0 or self.rand_100 > 0 or self.rand_50 > 0 or
            self.rand_20 > 0 or self.rand_10 > 0 or self.rand_5 > 0 or
            self.rand_2 > 0 or self.rand_1 > 0 or self.rand_0_50 > 0 or
            self.rand_0_20 > 0 or self.rand_0_10 > 0 or self.rand_0_05 > 0
        )

        # CRITICAL FIX: A count is ONLY "counted" when status is explicitly COMPLETED
        # Having denominations entered is NOT enough - cashier must explicitly submit
        has_actual_count = has_usd_count or has_zig_count or has_rand_count
        is_counted = self.status == 'COMPLETED'

        return {
            'cashier_name': self.cashier.name,
            'count_status': self.get_status_display(),
            'is_counted': is_counted,
            'has_actual_count': has_actual_count,
            'counted_currencies': {
                'usd': has_usd_count,
                'zig': has_zig_count,
                'rand': has_rand_count
            },
            'denominations': {
                # USD denominations (bills + coins)
                'usd': {
                    '100': self.usd_100,
                    '50': self.usd_50,
                    '20': self.usd_20,
                    '10': self.usd_10,
                    '5': self.usd_5,
                    '2': self.usd_2,
                    '1': self.usd_1,
                    '1_coin': self.usd_1_coin,
                    '0.50': self.usd_0_50,
                    '0.25': self.usd_0_25,
                    '0.10': self.usd_0_10,
                    '0.05': self.usd_0_05,
                    '0.01': self.usd_0_01,
                },
                # ZIG denominations (notes + coins)
                'zig': {
                    '100': self.zig_100,
                    '50': self.zig_50,
                    '20': self.zig_20,
                    '10': self.zig_10,
                    '5': self.zig_5,
                    '2': self.zig_2,
                    '1': self.zig_1,
                    '0.50': self.zig_0_50,
                },
                # RAND denominations (notes + coins)
                'rand': {
                    '200': self.rand_200,
                    '100': self.rand_100,
                    '50': self.rand_50,
                    '20': self.rand_20,
                    '10': self.rand_10,
                    '5': self.rand_5,
                    '2': self.rand_2,
                    '1': self.rand_1,
                    '0.50': self.rand_0_50,
                    '0.20': self.rand_0_20,
                    '0.10': self.rand_0_10,
                    '0.05': self.rand_0_05,
                },
                # Legacy fields
                'hundreds': self.hundreds,
                'fifties': self.fifties,
                'twenties': self.twenties,
                'tens': self.tens,
                'fives': self.fives,
                'twos': self.twos,
                'ones': self.ones,
                'coins': self.coins,
            },
            'receipts': {
                'card_receipts': self.card_receipts,
                'ecocash_receipts': self.ecocash_receipts,
                'other_receipts': self.other_receipts,
            },
            'electronic_payments': {
                'total_transfer': float(self.total_transfer),
                'total_card_amount': float(self.total_card_amount),
            },
            'totals': {
                'cash': float(self.total_cash),
                'cash_usd': float(self.total_cash_usd),
                'cash_zig': float(self.total_cash_zig),
                'cash_rand': float(self.total_cash_rand),
                'card': float(self.total_card),
                'ecocash': float(self.total_ecocash),
                'other': float(self.total_other),
                'grand_total': float(self.grand_total),
            },
            'expected': {
                'cash': float(self.expected_cash),
                'cash_usd': float(self.expected_cash_usd),
                'cash_zig': float(self.expected_cash_zig),
                'cash_rand': float(self.expected_cash_rand),
                'card': float(self.expected_card),
                'ecocash': float(self.expected_ecocash),
            },
            'variances': {
                'cash': float(self.cash_variance),
                'cash_usd': float(self.cash_variance_usd),
                'cash_zig': float(self.cash_variance_zig),
                'cash_rand': float(self.cash_variance_rand),
                'card': float(self.card_variance),
                'ecocash': float(self.ecocash_variance),
                'total': float(self.total_variance),
            },
            'counted_at': self.counted_at.isoformat(),
            'notes': self.notes
        }
    
    def complete_count(self):
        """Mark count as completed"""
        self.status = 'COMPLETED'
        self.save()
        return self
    
    def update_from_cash_float(self, cash_float):
        """
        Update expected amounts from ACTUAL SALES data (not CashFloat fields)
        This ensures expected amounts match what actually happened, not what was cached.
        
        CRITICAL FIX: This method does NOT call self.save() - the caller must save.
        This prevents double-save issues and allows the view to control the save timing.
        """
        from .models import Sale, SalePayment, StaffLunch
        import datetime
        
        # Create proper timezone-aware datetime range
        day_start = timezone.make_aware(
            datetime.datetime.combine(self.date, datetime.time.min),
            timezone.get_current_timezone()
        )
        day_end = timezone.make_aware(
            datetime.datetime.combine(self.date, datetime.time.max),
            timezone.get_current_timezone()
        )
        
        # Get exchange rates for change calculations
        exchange_rates = None
        try:
            from .models_exchange_rates import ExchangeRate
            rates = ExchangeRate.objects.filter(shop=self.shop, is_active=True).order_by('-created_at')[:5]
            if rates:
                exchange_rates = rates[0]
        except Exception:
            pass
        
        # Calculate expected amounts from actual sales
        exp_usd = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
        exp_zig = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
        exp_rand = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0')}
        
        try:
            today_sales = Sale.objects.filter(
                shop=self.shop,
                cashier=self.cashier,
                created_at__range=[day_start, day_end],
                status='completed'
            )
            
            for sale in today_sales:
                if sale.payment_method == 'split':
                    # Handle split payments
                    sale_payments = SalePayment.objects.filter(sale=sale)
                    for payment in sale_payments:
                        currency = payment.currency.upper()
                        method = payment.payment_method
                        amount = Decimal(str(payment.amount))
                        
                        if currency == 'USD' and method in exp_usd:
                            exp_usd[method] += amount
                        elif currency == 'ZIG' and method in exp_zig:
                            exp_zig[method] += amount
                        elif currency == 'RAND' and method in exp_rand:
                            exp_rand[method] += amount
                    
                    # Calculate change for split payments
                    total_paid_usd = Decimal('0')
                    for payment in sale_payments:
                        if payment.currency == 'USD':
                            total_paid_usd += Decimal(str(payment.amount))
                        elif exchange_rates:
                            try:
                                amount_usd = exchange_rates.convert_amount(payment.amount, payment.currency, 'USD')
                                total_paid_usd += Decimal(str(amount_usd))
                            except:
                                pass
                    
                    sale_total = Decimal(str(sale.total_amount))
                    if total_paid_usd > sale_total:
                        change_usd = total_paid_usd - sale_total
                        change_int_usd = int(change_usd)
                        change_frac_usd = change_usd - Decimal(change_int_usd)
                        
                        if change_int_usd > 0:
                            exp_usd['cash'] -= Decimal(change_int_usd)
                        
                        if change_frac_usd > 0 and exchange_rates:
                            try:
                                change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                exp_zig['cash'] -= Decimal(str(change_zig))
                            except:
                                exp_usd['cash'] -= change_frac_usd
                else:
                    # Handle regular payments
                    sale_amount = Decimal(str(sale.total_amount))
                    currency = (sale.payment_currency or 'USD').upper()
                    method = sale.payment_method
                    
                    if currency == 'USD':
                        if method == 'cash':
                            exp_usd['cash'] += sale_amount
                        elif method == 'card':
                            exp_usd['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_usd['ecocash'] += sale_amount
                    elif currency == 'ZIG':
                        if method == 'cash':
                            exp_zig['cash'] += sale_amount
                        elif method == 'card':
                            exp_zig['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_zig['ecocash'] += sale_amount
                    elif currency == 'RAND':
                        if method == 'cash':
                            exp_rand['cash'] += sale_amount
                        elif method == 'card':
                            exp_rand['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_rand['ecocash'] += sale_amount
                    
                    # Handle change for cash payments
                    if method == 'cash' and sale.amount_received:
                        amount_received = Decimal(str(sale.amount_received))
                        if amount_received > sale_amount:
                            change_amount = amount_received - sale_amount
                            
                            if currency == 'USD':
                                change_int_usd = int(change_amount)
                                change_frac_usd = change_amount - Decimal(change_int_usd)
                                
                                if change_int_usd > 0:
                                    exp_usd['cash'] -= Decimal(change_int_usd)
                                
                                if change_frac_usd > 0 and exchange_rates:
                                    try:
                                        change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                        exp_zig['cash'] -= Decimal(str(change_zig))
                                    except:
                                        exp_usd['cash'] -= change_frac_usd
                            elif currency == 'ZIG':
                                exp_zig['cash'] -= change_amount
                            elif currency == 'RAND':
                                exp_rand['cash'] -= change_amount
        except Exception as e:
            # Log error but don't fail - will return zero expected amounts
            print(f"ERROR calculating sales in update_from_cash_float: {e}")
        
        # Subtract staff lunch deductions (CRITICAL FIX: Only subtract if there's actual lunch)
        staff_lunch_total = Decimal('0')
        try:
            staff_lunches = StaffLunch.objects.filter(
                shop=self.shop,
                cashier=self.cashier,
                created_at__range=[day_start, day_end],
                product=None
            )
            staff_lunch_total = sum([Decimal(str(lunch.total_cost)) for lunch in staff_lunches])
            
            # CRITICAL FIX: Only subtract staff lunch if it's greater than 0
            # AND only if there are actual sales to deduct from
            if staff_lunch_total > 0:
                exp_usd['cash'] -= staff_lunch_total
                print(f"DEBUG StaffLunch deducted for {self.cashier.name}: ${staff_lunch_total}")
            else:
                print(f"DEBUG No staff lunch to deduct for {self.cashier.name}")
        except Exception as e:
            print(f"ERROR calculating staff lunch in update_from_cash_float: {e}")
        
        # CRITICAL FIX: Calculate expected amounts with validation
        # Expected should NEVER be negative unless float itself is negative (which shouldn't happen)
        calculated_expected_usd = cash_float.float_amount + exp_usd['cash']
        calculated_expected_zig = cash_float.float_amount_zig + exp_zig['cash']
        calculated_expected_rand = cash_float.float_amount_rand + exp_rand['cash']
        
        # DEBUG: Log the calculation details
        print(f"DEBUG Expected Calculation for {self.cashier.name}:")
        print(f"  Float USD: ${cash_float.float_amount}")
        print(f"  Net Sales Cash USD: ${exp_usd['cash']}")
        print(f"  Calculated Expected USD: ${calculated_expected_usd}")
        
        # CRITICAL FIX: If expected is negative but there were sales, something went wrong
        # This can happen if staff lunch exceeds sales, but that should be flagged
        if calculated_expected_usd < 0:
            print(f"WARNING: Negative expected amount detected for {self.cashier.name}!")
            print(f"  This usually means staff lunch (${staff_lunch_total}) exceeds sales")
            print(f"  Keeping calculated value, but owner should review")
        
        # Set expected amounts (float + net sales) - LINKED BALANCE LOGIC
        self.expected_cash_usd = calculated_expected_usd
        self.expected_cash_zig = calculated_expected_zig
        self.expected_cash_rand = calculated_expected_rand
        self.expected_cash = self.expected_cash_usd  # Legacy field
        self.expected_card = exp_usd['card'] + exp_zig['card'] + exp_rand['card']
        self.expected_ecocash = exp_usd['ecocash'] + exp_zig['ecocash'] + exp_rand['ecocash']

        # CRITICAL: Do NOT call self.save() here - the caller is responsible for saving
        # This prevents double-save issues and race conditions
        return self


class ReconciliationSession(models.Model):
    """
    EOD Reconciliation Session
    Tracks the overall reconciliation process for a shop day
    """
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('AWAITING_COUNTS', 'Awaiting Cashier Counts'),
        ('COMPLETED', 'Completed'),
        ('RECONCILED', 'Fully Reconciled'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    date = models.DateField(unique=True)
    
    # Session Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    started_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciliation_sessions_started')
    completed_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciliation_sessions_completed')
    
    # Overall Summary (multi-currency support)
    total_expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_expected_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_expected_cash_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_expected_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_counted_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_counted_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_counted_cash_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_counted_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Per-currency variances for linked balance reconciliation
    variance_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    variance_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    variance_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Notes
    opening_notes = models.TextField(blank=True)
    closing_notes = models.TextField(blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Reconciliation Session"
        verbose_name_plural = "Reconciliation Sessions"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['shop', 'date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Reconciliation - {self.shop.name} - {self.date} ({self.get_status_display()})"
    
    @classmethod
    def get_or_create_session(cls, shop, date=None):
        """Get or create a reconciliation session"""
        if not date:
            date = timezone.now().date()
        
        session, created = cls.objects.get_or_create(
            shop=shop,
            date=date,
            defaults={'status': 'NOT_STARTED'}
        )
        return session, created
    
    def start_session(self, started_by=None):
        """Start the reconciliation session"""
        self.status = 'IN_PROGRESS'
        self.started_at = timezone.now()
        self.started_by = started_by
        self.save()
        return self
    
    def complete_session(self, completed_by=None):
        """Complete the reconciliation session and close the shop"""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.completed_by = completed_by
        self.save()
        
        # Also close the shop for the day
        try:
            from .models import ShopDay
            shop_day = ShopDay.get_current_day(self.shop)
            if shop_day.status == 'OPEN':
                shop_day.close_shop(closed_by=completed_by, notes=f'Closed after EOD reconciliation on {self.date}')
        except Exception as e:
            print(f"Warning: Could not close shop after reconciliation: {e}")
            # Don't fail the reconciliation if shop closing fails
        
        return self
    
    def calculate_session_summary(self):
        """Calculate overall session summary from cashier counts (multi-currency)"""
        counts = CashierCount.objects.filter(shop=self.shop, date=self.date)

        # Cash totals by currency
        self.total_expected_cash = sum(count.expected_cash for count in counts)
        self.total_expected_cash_usd = sum(count.expected_cash_usd for count in counts)
        self.total_expected_cash_zig = sum(count.expected_cash_zig for count in counts)
        self.total_expected_cash_rand = sum(count.expected_cash_rand for count in counts)

        self.total_counted_cash = sum(count.total_cash for count in counts)
        self.total_counted_cash_usd = sum(count.total_cash_usd for count in counts)
        self.total_counted_cash_zig = sum(count.total_cash_zig for count in counts)
        self.total_counted_cash_rand = sum(count.total_cash_rand for count in counts)

        # Card and Ecocash totals
        total_expected_card = sum(count.expected_card for count in counts)
        total_expected_ecocash = sum(count.expected_ecocash for count in counts)
        total_counted_card = sum(count.total_card for count in counts)
        total_counted_ecocash = sum(count.total_ecocash for count in counts)

        # Calculate per-currency variances (LINKED BALANCE LOGIC)
        self.variance_usd = self.total_counted_cash_usd - self.total_expected_cash_usd
        self.variance_zig = self.total_counted_cash_zig - self.total_expected_cash_zig
        self.variance_rand = self.total_counted_cash_rand - self.total_expected_cash_rand

        # Total variance includes cash, card, and ecocash
        total_variance_cash = self.total_counted_cash - self.total_expected_cash
        total_variance_card = Decimal(str(total_counted_card)) - Decimal(str(total_expected_card))
        total_variance_ecocash = Decimal(str(total_counted_ecocash)) - Decimal(str(total_expected_ecocash))
        self.total_variance = total_variance_cash + total_variance_card + total_variance_ecocash

        self.save()
        return self
    
    def get_session_summary(self):
        """Get comprehensive session summary (multi-currency)"""
        counts = CashierCount.objects.filter(shop=self.shop, date=self.date)

        # Calculate card and ecocash totals
        total_expected_card = sum(count.expected_card for count in counts)
        total_expected_ecocash = sum(count.expected_ecocash for count in counts)
        total_counted_card = sum(count.total_card for count in counts)
        total_counted_ecocash = sum(count.total_ecocash for count in counts)

        # Calculate variances
        variance_card = float(total_counted_card) - float(total_expected_card)
        variance_ecocash = float(total_counted_ecocash) - float(total_expected_ecocash)

        # Count how many cashiers have actually counted
        counted_cashiers = sum(1 for c in counts if c.status == 'COMPLETED')
        pending_cashiers = sum(1 for c in counts if c.status == 'IN_PROGRESS')

        return {
            'session_info': {
                'date': self.date.isoformat(),
                'status': self.get_status_display(),
                'started_at': self.started_at.isoformat() if self.started_at else None,
                'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            },
            'summary': {
                'total_expected_cash': float(self.total_expected_cash),
                'total_expected_cash_usd': float(self.total_expected_cash_usd),
                'total_expected_cash_zig': float(self.total_expected_cash_zig),
                'total_expected_cash_rand': float(self.total_expected_cash_rand),
                'total_counted_cash': float(self.total_counted_cash),
                'total_counted_cash_usd': float(self.total_counted_cash_usd),
                'total_counted_cash_zig': float(self.total_counted_cash_zig),
                'total_counted_cash_rand': float(self.total_counted_cash_rand),
                'total_variance': float(self.total_variance),
                'variance_percentage': (float(self.total_variance) / float(self.total_expected_cash) * 100) if self.total_expected_cash > 0 else 0,
                # Per-currency variances (LINKED BALANCE)
                'variance_usd': float(self.variance_usd),
                'variance_zig': float(self.variance_zig),
                'variance_rand': float(self.variance_rand),
                # Card payment tracking
                'total_expected_card': total_expected_card,
                'total_counted_card': total_counted_card,
                'variance_card': variance_card,
                # Ecocash payment tracking
                'total_expected_ecocash': total_expected_ecocash,
                'total_counted_ecocash': total_counted_ecocash,
                'variance_ecocash': variance_ecocash,
            },
            'cashier_counts': [count.get_count_summary() for count in counts],
            'cashier_progress': {
                'total_cashiers': counts.count(),
                'completed_counts': counted_cashiers,
                'pending_counts': pending_cashiers,
                'all_counted': counted_cashiers == counts.count() if counts.exists() else True,
                'message': f'{counted_cashiers} of {counts.count()} cashiers have counted' if counts.exists() else 'No cashiers to count'
            }
        }