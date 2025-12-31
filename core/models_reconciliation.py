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
    
    # Cash Counting Details
    hundreds = models.PositiveIntegerField(default=0)
    fifties = models.PositiveIntegerField(default=0)
    twenties = models.PositiveIntegerField(default=0)
    tens = models.PositiveIntegerField(default=0)
    fives = models.PositiveIntegerField(default=0)
    twos = models.PositiveIntegerField(default=0)
    ones = models.PositiveIntegerField(default=0)
    coins = models.PositiveIntegerField(default=0)
    
    # Receipt Counting
    card_receipts = models.PositiveIntegerField(default=0)
    ecocash_receipts = models.PositiveIntegerField(default=0)
    other_receipts = models.PositiveIntegerField(default=0)
    
    # Calculated Totals
    total_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_other = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Expected vs Actual
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Variances
    cash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
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
        # Calculate cash total from denominations
        cash_total = (
            self.hundreds * 100 +
            self.fifties * 50 +
            self.twenties * 20 +
            self.tens * 10 +
            self.fives * 5 +
            self.twos * 2 +
            self.ones * 1 +
            self.coins * 0.5
        )
        
        # Calculate receipt totals (assuming $1 per receipt for counting purposes)
        card_total = self.card_receipts * 1
        ecocash_total = self.ecocash_receipts * 1
        other_total = self.other_receipts * 1
        
        # Update calculated totals
        self.total_cash = Decimal(str(cash_total))
        self.total_card = Decimal(str(card_total))
        self.total_ecocash = Decimal(str(ecocash_total))
        self.total_other = Decimal(str(other_total))
        self.grand_total = self.total_cash + self.total_card + self.total_ecocash + self.total_other
        
        # Calculate variances
        self.cash_variance = self.total_cash - self.expected_cash
        self.card_variance = self.total_card - self.expected_card
        self.ecocash_variance = self.total_ecocash - self.expected_ecocash
        self.total_variance = self.cash_variance + self.card_variance + self.ecocash_variance
        
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
        return {
            'cashier_name': self.cashier.name,
            'count_status': self.get_status_display(),
            'denominations': {
                'hundreds': self.hundreds,
                'fifties': self.fifties,
                'twenties': self.twenties,
                'tens': self.tens,
                'fifties': self.fifties,
                'twos': self.twos,
                'ones': self.ones,
                'coins': self.coins,
            },
            'receipts': {
                'card_receipts': self.card_receipts,
                'ecocash_receipts': self.ecocash_receipts,
                'other_receipts': self.other_receipts,
            },
            'totals': {
                'cash': float(self.total_cash),
                'card': float(self.total_card),
                'ecocash': float(self.total_ecocash),
                'other': float(self.total_other),
                'grand_total': float(self.grand_total),
            },
            'expected': {
                'cash': float(self.expected_cash),
                'card': float(self.expected_card),
                'ecocash': float(self.expected_ecocash),
            },
            'variances': {
                'cash': float(self.cash_variance),
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
        """Update expected amounts from CashFloat record"""
        self.expected_cash = cash_float.expected_cash_at_eod
        # For card and ecocash, we could get from cash_float.session_card_sales, etc.
        # For now, leaving as 0 since the original system doesn't track these in CashFloat
        self.save()
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
    
    # Overall Summary
    total_expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_counted_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
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
        """Calculate overall session summary from cashier counts"""
        counts = CashierCount.objects.filter(shop=self.shop, date=self.date)
        
        self.total_expected_cash = sum(count.expected_cash for count in counts)
        self.total_counted_cash = sum(count.total_cash for count in counts)
        self.total_variance = self.total_counted_cash - self.total_expected_cash
        
        self.save()
        return self
    
    def get_session_summary(self):
        """Get comprehensive session summary"""
        counts = CashierCount.objects.filter(shop=self.shop, date=self.date)
        
        return {
            'session_info': {
                'date': self.date.isoformat(),
                'status': self.get_status_display(),
                'started_at': self.started_at.isoformat() if self.started_at else None,
                'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            },
            'summary': {
                'total_expected_cash': float(self.total_expected_cash),
                'total_counted_cash': float(self.total_counted_cash),
                'total_variance': float(self.total_variance),
                'variance_percentage': (float(self.total_variance) / float(self.total_expected_cash) * 100) if self.total_expected_cash > 0 else 0,
            },
            'cashier_counts': [count.get_count_summary() for count in counts],
            'cashier_progress': {
                'total_cashiers': counts.count(),
                'completed_counts': counts.filter(status='COMPLETED').count(),
                'pending_counts': counts.filter(status='IN_PROGRESS').count(),
            }
        }