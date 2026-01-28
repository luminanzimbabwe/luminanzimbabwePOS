"""
Exchange Rate Models for Zimbabwe POS System
Handles daily exchange rates for Zig Dollar, USD, and South African Rand
"""

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import json


class ExchangeRate(models.Model):
    """
    Daily Exchange Rate Management
    Stores exchange rates for currency conversions
    """
    
    CURRENCY_CHOICES = [
        ('ZIG', 'Zimbabwe Dollar'),
        ('USD', 'US Dollar'),
        ('RAND', 'South African Rand'),
    ]
    
    # Date for the exchange rates
    date = models.DateField(
        default=timezone.now,
        unique=True,
        help_text="Date for these exchange rates"
    )
    
    # Exchange Rates
    usd_to_zig = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=1.000000,
        validators=[MinValueValidator(0.000001)],
        help_text="1 US Dollar equals this many Zimbabwe Dollars"
    )
    
    usd_to_rand = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=18.500000,
        validators=[MinValueValidator(0.000001)],
        help_text="1 US Dollar equals this many South African Rand"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(
        max_length=100,
        default='system',
        help_text="Who updated these rates"
    )
    
    # Active status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether these rates are currently active"
    )
    
    class Meta:
        ordering = ['-date']
        verbose_name = "Exchange Rate"
        verbose_name_plural = "Exchange Rates"
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"Exchange Rates for {self.date} (USD:ZIG={self.usd_to_zig}, USD:RAND={self.usd_to_rand})"
    
    @classmethod
    def get_current_rates(cls):
        """
        Get the most recent active exchange rates
        """
        try:
            return cls.objects.filter(is_active=True).latest('date')
        except cls.DoesNotExist:
            # Return default rates if none exist
            return cls.objects.create(
                date=timezone.now().date(),
                usd_to_zig=1.000000,
                usd_to_rand=18.500000,
                updated_by='system'
            )
    
    def convert_amount(self, amount, from_currency, to_currency):
        """
        Convert an amount from one currency to another
        
        Args:
            amount (decimal): Amount to convert
            from_currency (str): Source currency (ZIG, USD, RAND)
            to_currency (str): Target currency (ZIG, USD, RAND)
            
        Returns:
            decimal: Converted amount
        """
        if from_currency == to_currency:
            return amount
        
        # Convert using USD as base currency
        if from_currency == 'USD':
            if to_currency == 'ZIG':
                return amount * self.usd_to_zig
            elif to_currency == 'RAND':
                return amount * self.usd_to_rand
        elif from_currency == 'ZIG':
            if to_currency == 'USD':
                return amount / self.usd_to_zig
            elif to_currency == 'RAND':
                # Convert ZIG -> USD -> RAND
                usd_amount = amount / self.usd_to_zig
                return usd_amount * self.usd_to_rand
        elif from_currency == 'RAND':
            if to_currency == 'USD':
                return amount / self.usd_to_rand
            elif to_currency == 'ZIG':
                # Convert RAND -> USD -> ZIG
                usd_amount = amount / self.usd_to_rand
                return usd_amount * self.usd_to_zig
        
        raise ValueError(f"Unsupported currency conversion: {from_currency} to {to_currency}")
    
    def to_dict(self):
        """
        Convert exchange rates to dictionary format
        """
        return {
            'date': self.date.isoformat(),
            'usd_to_zig': float(self.usd_to_zig),
            'usd_to_rand': float(self.usd_to_rand),
            'last_updated': self.updated_at.isoformat(),
            'updated_by': self.updated_by,
            'is_active': self.is_active
        }
    
    def save(self, *args, **kwargs):
        # Deactivate other rates for the same date
        if self.is_active:
            ExchangeRate.objects.filter(
                date=self.date,
                is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        
        super().save(*args, **kwargs)


class ExchangeRateHistory(models.Model):
    """
    History log of exchange rate changes
    """
    
    EXCHANGE_RATE_CHOICES = [
        ('usd_to_zig', 'USD to ZIG'),
        ('usd_to_rand', 'USD to RAND'),
    ]
    
    exchange_rate = models.ForeignKey(
        ExchangeRate,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    rate_type = models.CharField(
        max_length=20,
        choices=EXCHANGE_RATE_CHOICES
    )
    
    old_value = models.DecimalField(max_digits=10, decimal_places=6)
    new_value = models.DecimalField(max_digits=10, decimal_places=6)
    
    changed_by = models.CharField(max_length=100)
    change_reason = models.TextField(blank=True, null=True)
    
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name = "Exchange Rate History"
        verbose_name_plural = "Exchange Rate History"
    
    def __str__(self):
        return f"{self.rate_type}: {self.old_value} → {self.new_value} on {self.changed_at}"


def create_exchange_rate_history(sender, instance, created, **kwargs):
    """
    Signal handler to create history records when exchange rates are updated
    """
    if not created:
        # This is an update, check for changes
        try:
            old_instance = ExchangeRate.objects.get(pk=instance.pk)
            
            # Check each rate type for changes
            rate_fields = ['usd_to_zig', 'usd_to_rand']
            
            for field in rate_fields:
                old_value = getattr(old_instance, field)
                new_value = getattr(instance, field)
                
                if old_value != new_value:
                    ExchangeRateHistory.objects.create(
                        exchange_rate=instance,
                        rate_type=field,
                        old_value=old_value,
                        new_value=new_value,
                        changed_by=instance.updated_by or 'system',
                        change_reason=f'Updated {field.replace("_", " ").title()}'
                    )
        except ExchangeRate.DoesNotExist:
            pass


# Connect the signal
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=ExchangeRate)
def exchange_rate_history_handler(sender, instance, created, **kwargs):
    create_exchange_rate_history(sender, instance, created, **kwargs)