"""
Simple Cashier Refund System
Handles refunds done by cashiers directly - no complex authentication
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.utils import timezone
from django.db import models
from core.models import Sale, CashFloat, ShopConfiguration, Cashier
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
def process_cashier_refund(request):
    """
    Simple cashier refund endpoint
    Expected payload:
    {
        "sale_id": 123,
        "cashier_id": 1,
        "refund_amount": 25.50,
        "refund_reason": "Customer returned damaged item"
    }
    """
    try:
        # Get refund data
        sale_id = request.data.get('sale_id')
        cashier_id = request.data.get('cashier_id')
        refund_amount = request.data.get('refund_amount')
        refund_reason = request.data.get('refund_reason', 'Customer refund')
        
        # Validate required fields
        if not all([sale_id, cashier_id, refund_amount]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields: sale_id, cashier_id, refund_amount'
            }, status=400)
        
        # Convert amount to Decimal
        try:
            refund_amount = Decimal(str(refund_amount))
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid refund amount format'
            }, status=400)
        
        if refund_amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Refund amount must be positive'
            }, status=400)
        
        # Get the sale
        try:
            sale = Sale.objects.get(id=sale_id)
        except Sale.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Sale not found'
            }, status=404)
        
        # Check if sale can be refunded
        if sale.status == 'refunded':
            return JsonResponse({
                'success': False,
                'error': 'Sale has already been refunded'
            }, status=400)
        
        if refund_amount > sale.total_amount:
            return JsonResponse({
                'success': False,
                'error': 'Refund amount cannot exceed sale amount'
            }, status=400)
        
        # Get the cashier
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=sale.shop)
        except Cashier.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Cashier not found'
            }, status=404)
        
        # Get shop configuration
        try:
            shop_config = sale.shop
        except ShopConfiguration.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Shop configuration not found'
            }, status=404)
        
        # Update the sale to mark as refunded
        sale.status = 'refunded'
        sale.refund_reason = refund_reason
        sale.refund_amount = refund_amount
        sale.refunded_at = timezone.now()
        sale.refunded_by = cashier
        sale.save()
        
        # Update cash drawer if this was a cash sale
        drawer_updated = False
        if sale.payment_method == 'cash':
            try:
                # Get or create cash float for today
                today = timezone.now().date()
                cash_float, created = CashFloat.objects.get_or_create(
                    shop=shop_config,
                    cashier=cashier,
                    date=today,
                    defaults={
                        'status': 'INACTIVE',
                        'float_amount': Decimal('0.00'),
                        'current_cash': Decimal('0.00'),
                        'current_card': Decimal('0.00'),
                        'current_ecocash': Decimal('0.00'),
                        'current_transfer': Decimal('0.00'),
                        'current_total': Decimal('0.00'),
                        'session_cash_sales': Decimal('0.00'),
                        'session_card_sales': Decimal('0.00'),
                        'session_ecocash_sales': Decimal('0.00'),
                        'session_transfer_sales': Decimal('0.00'),
                        'session_total_sales': Decimal('0.00'),
                        'expected_cash_at_eod': Decimal('0.00'),
                    }
                )
                
                # Subtract refund from cash drawer
                cash_float.current_cash -= refund_amount
                cash_float.session_cash_sales -= refund_amount
                cash_float.session_total_sales -= refund_amount
                cash_float.current_total -= refund_amount
                cash_float.expected_cash_at_eod -= refund_amount
                
                # Ensure values don't go negative
                cash_float.current_cash = max(Decimal('0.00'), cash_float.current_cash)
                cash_float.session_cash_sales = max(Decimal('0.00'), cash_float.session_cash_sales)
                cash_float.session_total_sales = max(Decimal('0.00'), cash_float.session_total_sales)
                cash_float.current_total = max(Decimal('0.00'), cash_float.current_total)
                cash_float.expected_cash_at_eod = max(Decimal('0.00'), cash_float.expected_cash_at_eod)
                
                cash_float.save()
                drawer_updated = True
                
                logger.info(f"Refund processed: Cashier {cashier.name}, Sale {sale_id}, Amount: {refund_amount}")
                
            except Exception as drawer_error:
                logger.warning(f"Could not update cash drawer: {str(drawer_error)}")
                # Don't fail the entire refund if drawer update fails
                drawer_updated = False
        
        # Prepare response
        response_data = {
            'success': True,
            'message': 'Refund processed successfully',
            'data': {
                'sale_id': sale.id,
                'cashier_id': cashier.id,
                'cashier_name': cashier.name,
                'refund_amount': str(refund_amount),
                'refund_reason': refund_reason,
                'original_sale_amount': str(sale.total_amount),
                'sale_status': 'refunded',
                'drawer_updated': drawer_updated,
                'refunded_at': sale.refunded_at.isoformat() if sale.refunded_at else None
            }
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"Error processing cashier refund: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)

@api_view(['GET'])
def get_cashier_refunds(request):
    """
    Get refund statistics for a cashier
    Optional query params: cashier_id, date_from, date_to
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        # Get parameters
        cashier_id = request.GET.get('cashier_id')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        
        # Default to last 30 days if no dates provided
        if not date_to:
            date_to = timezone.now()
        else:
            date_to = timezone.make_aware(timezone.datetime.strptime(date_to, '%Y-%m-%d'))
        
        if not date_from:
            date_from = date_to - timedelta(days=30)
        else:
            date_from = timezone.make_aware(timezone.datetime.strptime(date_from, '%Y-%m-%d'))
        
        # Build query
        queryset = Sale.objects.filter(
            status='refunded',
            refunded_at__range=[date_from, date_to]
        )
        
        if cashier_id:
            queryset = queryset.filter(refunded_by_id=cashier_id)
        
        # Get shop (assume single shop for simplicity)
        shop = ShopConfiguration.objects.first()
        if shop:
            queryset = queryset.filter(shop=shop)
        
        # Calculate statistics
        total_refunds = queryset.count()
        total_refund_amount = queryset.aggregate(
            total=models.Sum('refund_amount')
        )['total'] or Decimal('0.00')
        
        # Group by cashier
        refunds_by_cashier = queryset.values(
            'refunded_by__id',
            'refunded_by__name'
        ).annotate(
            refund_count=models.Count('id'),
            total_amount=models.Sum('refund_amount')
        ).order_by('-total_amount')
        
        # Recent refunds
        recent_refunds = queryset.order_by('-refunded_at')[:10].values(
            'id', 'refund_amount', 'refund_reason', 'refunded_at',
            'refunded_by__name', 'total_amount', 'payment_method'
        )
        
        return JsonResponse({
            'success': True,
            'data': {
                'period': {
                    'from': date_from.date().isoformat(),
                    'to': date_to.date().isoformat()
                },
                'summary': {
                    'total_refunds': total_refunds,
                    'total_refund_amount': str(total_refund_amount),
                    'average_refund': str(total_refund_amount / total_refunds) if total_refunds > 0 else '0.00'
                },
                'refunds_by_cashier': list(refunds_by_cashier),
                'recent_refunds': list(recent_refunds)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting cashier refunds: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)