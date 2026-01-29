"""
Cashier Count Archive Model
This stores permanent records of cashier counts that survive EOD deletion
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal


class CashierCountArchive(models.Model):
    """
    PERMANENT archive of cashier counts for historical tracking
    These records are NEVER deleted - they persist forever for reporting
    """
    
    # Identification
    shop = models.ForeignKey('ShopConfiguration', on_delete=models.CASCADE)
    cashier = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True)
    cashier_name = models.CharField(max_length=255, help_text="Cashier name at time of count")
    
    # Date info
    date = models.DateField()
    shop_day_id = models.IntegerField(null=True, blank=True, help_text="Reference to ShopDay if available")
    
    # Count Data (snapshot of what was counted)
    total_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Expected amounts (snapshot at EOD)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_cash_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_cash_zig = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    expected_cash_rand = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_card = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Variances
    cash_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_variance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status
    STATUS_CHOICES = [
        ('BALANCED', 'Balanced'),
        ('SHORTAGE', 'Shortage'),
        ('OVER', 'Over'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BALANCED')
    
    # Additional details
    denominations_snapshot = models.JSONField(default=dict, help_text="JSON of all denominations counted")
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(auto_now_add=True, help_text="When this record was archived")
    
    class Meta:
        verbose_name = "Cashier Count Archive"
        verbose_name_plural = "Cashier Count Archives"
        ordering = ['-date', '-archived_at']
        indexes = [
            models.Index(fields=['shop', 'date']),
            models.Index(fields=['cashier', 'date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.cashier_name} - {self.date} - {self.status}"
    
    @classmethod
    def archive_cashier_count(cls, count_record):
        """
        Archive a CashierCount record before it's deleted during EOD
        This creates a permanent snapshot
        """
        # Determine status based on variance
        variance = float(count_record.total_variance)
        if abs(variance) < 0.01:
            status = 'BALANCED'
        elif variance < 0:
            status = 'SHORTAGE'
        else:
            status = 'OVER'
        
        # Build denominations snapshot
        denominations = {
            'usd': {
                '100': count_record.usd_100,
                '50': count_record.usd_50,
                '20': count_record.usd_20,
                '10': count_record.usd_10,
                '5': count_record.usd_5,
                '2': count_record.usd_2,
                '1': count_record.usd_1,
                '1_coin': count_record.usd_1_coin,
                '0.50': count_record.usd_0_50,
                '0.25': count_record.usd_0_25,
                '0.10': count_record.usd_0_10,
                '0.05': count_record.usd_0_05,
                '0.01': count_record.usd_0_01,
            },
            'zig': {
                '100': count_record.zig_100,
                '50': count_record.zig_50,
                '20': count_record.zig_20,
                '10': count_record.zig_10,
                '5': count_record.zig_5,
                '2': count_record.zig_2,
                '1': count_record.zig_1,
                '0.50': count_record.zig_0_50,
            },
            'rand': {
                '200': count_record.rand_200,
                '100': count_record.rand_100,
                '50': count_record.rand_50,
                '20': count_record.rand_20,
                '10': count_record.rand_10,
                '5': count_record.rand_5,
                '2': count_record.rand_2,
                '1': count_record.rand_1,
                '0.50': count_record.rand_0_50,
                '0.20': count_record.rand_0_20,
                '0.10': count_record.rand_0_10,
                '0.05': count_record.rand_0_05,
            }
        }
        
        archive = cls.objects.create(
            shop=count_record.shop,
            cashier=count_record.cashier,
            cashier_name=count_record.cashier.name if count_record.cashier else 'Unknown',
            date=count_record.date,
            total_cash=count_record.total_cash,
            total_cash_usd=count_record.total_cash_usd,
            total_cash_zig=count_record.total_cash_zig,
            total_cash_rand=count_record.total_cash_rand,
            total_card=count_record.total_card,
            total_ecocash=count_record.total_ecocash,
            grand_total=count_record.grand_total,
            expected_cash=count_record.expected_cash,
            expected_cash_usd=count_record.expected_cash_usd,
            expected_cash_zig=count_record.expected_cash_zig,
            expected_cash_rand=count_record.expected_cash_rand,
            expected_card=count_record.expected_card,
            expected_ecocash=count_record.expected_ecocash,
            cash_variance=count_record.cash_variance,
            total_variance=count_record.total_variance,
            status=status,
            denominations_snapshot=denominations,
            notes=count_record.notes
        )
        
        return archive
    
    @classmethod
    def archive_all_counts_for_date(cls, shop, date):
        """
        Archive all cashier counts for a specific date
        Called during EOD finalization before deleting counts
        """
        from .models_reconciliation import CashierCount
        
        counts = CashierCount.objects.filter(shop=shop, date=date)
        archived = []
        
        for count in counts:
            archive = cls.archive_cashier_count(count)
            archived.append(archive)
        
        return archived
    
    def get_summary(self):
        """Get summary of this archived count"""
        return {
            'id': self.id,
            'cashier_name': self.cashier_name,
            'date': self.date.isoformat(),
            'status': self.status,
            'total_cash': float(self.total_cash),
            'expected_cash': float(self.expected_cash),
            'total_variance': float(self.total_variance),
            'denominations': self.denominations_snapshot,
            'archived_at': self.archived_at.isoformat()
        }


class CashierPerformanceSummary(models.Model):
    """
    Pre-calculated performance summary for each cashier per month
    This provides fast access to historical performance data
    """
    shop = models.ForeignKey('ShopConfiguration', on_delete=models.CASCADE)
    cashier = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True)
    cashier_name = models.CharField(max_length=255)
    
    # Period
    year = models.IntegerField()
    month = models.IntegerField()
    
    # Stats
    total_counts = models.IntegerField(default=0)
    balanced_count = models.IntegerField(default=0)
    shortage_count = models.IntegerField(default=0)
    over_count = models.IntegerField(default=0)
    
    # Financial totals
    total_shortage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_over_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Calculated fields
    balance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reliability_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cashier Performance Summary"
        verbose_name_plural = "Cashier Performance Summaries"
        unique_together = ['shop', 'cashier', 'year', 'month']
        ordering = ['-year', '-month', 'cashier_name']
    
    def __str__(self):
        return f"{self.cashier_name} - {self.year}/{self.month} - {self.balance_rate}%"
    
    @classmethod
    def recalculate_for_period(cls, shop, year, month):
        """Recalculate performance summary for a specific period"""
        from django.db.models import Sum, Count, Q
        
        # Get all archived counts for this period
        archives = CashierCountArchive.objects.filter(
            shop=shop,
            date__year=year,
            date__month=month
        )
        
        # Group by cashier
        cashier_ids = archives.values_list('cashier', flat=True).distinct()
        
        for cashier_id in cashier_ids:
            if not cashier_id:
                continue
                
            cashier_archives = archives.filter(cashier_id=cashier_id)
            
            # Calculate stats
            total_counts = cashier_archives.count()
            balanced = cashier_archives.filter(status='BALANCED').count()
            shortages = cashier_archives.filter(status='SHORTAGE').count()
            overs = cashier_archives.filter(status='OVER').count()
            
            # Financial totals
            shortage_total = cashier_archives.filter(status='SHORTAGE').aggregate(
                total=Sum('total_variance')
            )['total'] or Decimal('0')
            
            over_total = cashier_archives.filter(status='OVER').aggregate(
                total=Sum('total_variance')
            )['total'] or Decimal('0')
            
            # Balance rate
            balance_rate = (balanced / total_counts * 100) if total_counts > 0 else 0
            
            # Reliability score
            over = total_counts - balanced - shortages
            reliability = (balanced * 100 + over * 80) / total_counts if total_counts > 0 else 100
            
            # Get or create summary
            summary, created = cls.objects.update_or_create(
                shop=shop,
                cashier_id=cashier_id,
                year=year,
                month=month,
                defaults={
                    'cashier_name': cashier_archives.first().cashier_name if cashier_archives.exists() else 'Unknown',
                    'total_counts': total_counts,
                    'balanced_count': balanced,
                    'shortage_count': shortages,
                    'over_count': overs,
                    'total_shortage_amount': abs(shortage_total),
                    'total_over_amount': over_total,
                    'balance_rate': balance_rate,
                    'reliability_score': reliability
                }
            )
        
        return True
