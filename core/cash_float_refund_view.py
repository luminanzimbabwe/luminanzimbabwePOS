"""
Cash Float Refund Management View
Handles drawer refund operations for the POS system
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from core.models import CashFloat, ShopConfiguration, Sale
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
def add_drawer_refund(request):
    """
    Add a refund to a cashier's drawer
    Expected payload:
    {
        "cashier_id": 1,
        "amount": 25.50,
        "refund_reason": "Customer returned damaged item"
    }
    """
    try:
        # Validate request data
        cashier_id = request.data.get('cashier_id')
        amount = request.data.get('amount')
        refund_reason = request.data.get('refund_reason', 'Customer refund')
        
        if not cashier_id or not amount:
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields: cashier_id and amount'
            }, status=400)
        
        # Convert amount to Decimal for precise calculations
        try:
            refund_amount = Decimal(str(amount))
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid amount format'
            }, status=400)
        
        if refund_amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Refund amount must be positive'
            }, status=400)
        
        # Get the cashier object
        from core.models import Cashier
        try:
            cashier = Cashier.objects.get(id=cashier_id)
        except Cashier.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Cashier not found'
            }, status=404)
        
        # Get current shop configuration
        try:
            shop_config = ShopConfiguration.objects.first()
            if not shop_config:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop configuration not found'
                }, status=404)
        except ShopConfiguration.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Shop configuration not found'
            }, status=404)
        
        # Find the cashier's cash float record
        try:
            cash_float = CashFloat.objects.get(
                shop=shop_config,
                cashier=cashier,
                status='ACTIVE'
            )
        except CashFloat.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'No active cash float found for this cashier'
            }, status=404)
        
        # Calculate new cash amount (subtract refund)
        current_cash = cash_float.current_breakdown.get('cash', Decimal('0'))
        new_cash = current_cash - refund_amount
        
        if new_cash < 0:
            return JsonResponse({
                'success': False,
                'error': 'Insufficient cash in drawer for refund'
            }, status=400)
        
        # Update cash float with refund
        # Get current cash amount from current_breakdown JSONField
        current_breakdown = cash_float.current_breakdown or {}
        current_cash = Decimal(str(current_breakdown.get('cash', 0)))
        new_cash = current_cash - refund_amount
        
        if new_cash < 0:
            return JsonResponse({
                'success': False,
                'error': 'Insufficient cash in drawer for refund'
            }, status=400)
        
        # Update the breakdown
        current_breakdown['cash'] = float(new_cash)
        cash_float.current_breakdown = current_breakdown
        
        # Update session sales (subtract refund from cash sales)
        session_sales = cash_float.session_sales or {}
        current_cash_sales = Decimal(str(session_sales.get('cash', 0)))
        new_cash_sales = max(Decimal('0'), current_cash_sales - refund_amount)
        session_sales['cash'] = float(new_cash_sales)
        cash_float.session_sales = session_sales
        
        # Update total session sales
        cash_float.session_total_sales = max(Decimal('0'), cash_float.session_total_sales - refund_amount)
        
        # Update current cash amount (keep in sync with breakdown)
        cash_float.current_cash = new_cash
        
        # Update EOD expectations
        cash_float.expected_cash_at_eod = cash_float.float_amount + new_cash
        
        # Save the updated cash float
        cash_float.save()
        
        # Log the refund operation
        logger.info(f"Refund processed: Cashier {cashier_id}, Amount: {refund_amount}, Reason: {refund_reason}")
        
        return JsonResponse({
            'success': True,
            'message': 'Refund processed successfully',
            'data': {
                'cashier_id': cashier.id,
                'cashier_name': cashier.name,
                'refund_amount': str(refund_amount),
                'new_cash_balance': str(new_cash),
                'refund_reason': refund_reason,
                'previous_cash_balance': str(current_cash)
            }
        })
        
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)