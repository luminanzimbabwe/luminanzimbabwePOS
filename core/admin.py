from django.contrib import admin
from .models_reconciliation import CashierCount, ReconciliationSession


@admin.register(CashierCount)
class CashierCountAdmin(admin.ModelAdmin):
    list_display = ['cashier', 'date', 'grand_total', 'total_variance', 'status', 'counted_at']
    list_filter = ['status', 'date', 'shop']
    search_fields = ['cashier__name', 'notes']
    readonly_fields = ['total_cash', 'total_card', 'total_ecocash', 'grand_total', 
                       'cash_variance', 'card_variance', 'ecocash_variance', 'total_variance',
                       'counted_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('shop', 'cashier', 'date', 'status', 'counted_by')
        }),
        ('Cash Denominations', {
            'fields': ('hundreds', 'fifties', 'twenties', 'tens', 'fives', 'twos', 'ones', 'coins'),
            'classes': ('collapse',)
        }),
        ('Receipts', {
            'fields': ('card_receipts', 'ecocash_receipts', 'other_receipts'),
            'classes': ('collapse',)
        }),
        ('Expected Amounts (Multi-Currency)', {
            'fields': ('expected_cash', 'expected_cash_usd', 'expected_cash_rand', 
                       'expected_card', 'expected_ecocash'),
            'description': 'Expected amounts from CashFloat system'
        }),
        ('Calculated Totals', {
            'fields': ('total_cash', 'total_card', 'total_ecocash', 'total_other', 'grand_total'),
            'classes': ('collapse',)
        }),
        ('Variances', {
            'fields': ('cash_variance', 'card_variance', 'ecocash_variance', 'total_variance'),
            'classes': ('collapse',)
        }),
        ('Notes & Tracking', {
            'fields': ('notes', 'counted_at', 'updated_at')
        }),
    )


@admin.register(ReconciliationSession)
class ReconciliationSessionAdmin(admin.ModelAdmin):
    list_display = ['date', 'shop', 'status', 'total_variance', 'started_at', 'completed_at']
    list_filter = ['status', 'date', 'shop']
    search_fields = ['shop__name', 'opening_notes', 'closing_notes']
    readonly_fields = ['created_at', 'updated_at', 'started_at', 'completed_at']
    fieldsets = (
        ('Session Info', {
            'fields': ('shop', 'date', 'status', 'created_at', 'updated_at')
        }),
        ('Session Control', {
            'fields': ('started_at', 'started_by', 'completed_at', 'completed_by')
        }),
        ('Multi-Currency Summary', {
            'fields': (
                'total_expected_cash', 'total_expected_cash_usd', 'total_expected_cash_rand',
                'total_counted_cash', 'total_counted_cash_usd', 'total_counted_cash_rand',
                'total_variance'
            )
        }),
        ('Notes', {
            'fields': ('opening_notes', 'closing_notes')
        }),
    )
