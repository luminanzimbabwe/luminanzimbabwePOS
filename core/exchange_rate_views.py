"""
Exchange Rate Management Views
API endpoints for managing daily exchange rates
"""

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db import transaction
import json
from decimal import Decimal

from .models_exchange_rates import ExchangeRate, ExchangeRateHistory
from .models import ShopConfiguration


@csrf_exempt
@require_http_methods(["GET", "POST"])
def exchange_rate_api(request):
    """
    API endpoint for managing exchange rates
    GET: Retrieve current exchange rates
    POST: Create or update exchange rates
    """
    
    if request.method == 'GET':
        return get_exchange_rates(request)
    elif request.method == 'POST':
        return create_or_update_exchange_rate(request)


def get_exchange_rates(request):
    """
    Get current or specified exchange rates
    """
    try:
        # Get date parameter (optional, defaults to today)
        date_str = request.GET.get('date')
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=400)
        else:
            target_date = timezone.now().date()
        
        # Try to get exchange rates for the specified date
        try:
            exchange_rate = ExchangeRate.objects.get(date=target_date)
            return JsonResponse({
                'success': True,
                'data': exchange_rate.to_dict()
            })
        except ExchangeRate.DoesNotExist:
            # Return default rates if none exist for this date
            current_rates = ExchangeRate.get_current_rates()
            return JsonResponse({
                'success': True,
                'data': current_rates.to_dict(),
                'message': 'No rates set for specified date, returning default rates'
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error retrieving exchange rates: {str(e)}'
        }, status=500)


def create_or_update_exchange_rate(request):
    """
    Create or update exchange rates for a specific date
    """
    try:
        data = json.loads(request.body)
        
        # Extract parameters
        date_str = data.get('date')
        usd_to_zig = data.get('usd_to_zig')
        usd_to_rand = data.get('usd_to_rand')
        updated_by = data.get('updated_by', 'system')
        is_active = data.get('is_active', True)
        
        # Validate required fields
        if not all([date_str, usd_to_zig, usd_to_rand]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required fields: date, usd_to_zig, usd_to_rand'
            }, status=400)
        
        # Parse date
        from datetime import datetime
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=400)
        
        # Validate exchange rates are positive numbers
        try:
            usd_to_zig_decimal = Decimal(str(usd_to_zig))
            usd_to_rand_decimal = Decimal(str(usd_to_rand))
            
            # Ensure all rates are positive
            if any(rate <= 0 for rate in [usd_to_zig_decimal, usd_to_rand_decimal]):
                return JsonResponse({
                    'success': False,
                    'error': 'All exchange rates must be positive numbers'
                }, status=400)
                
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid exchange rate values. Must be numeric'
            }, status=400)
        
        # Create or update exchange rates
        with transaction.atomic():
            exchange_rate, created = ExchangeRate.objects.get_or_create(
                date=target_date,
                defaults={
                    'usd_to_zig': usd_to_zig_decimal,
                    'usd_to_rand': usd_to_rand_decimal,
                    'updated_by': updated_by,
                    'is_active': is_active
                }
            )
            
            if not created:
                # Update existing exchange rate
                exchange_rate.usd_to_zig = usd_to_zig_decimal
                exchange_rate.usd_to_rand = usd_to_rand_decimal
                exchange_rate.updated_by = updated_by
                exchange_rate.is_active = is_active
                exchange_rate.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Exchange rates {"created" if created else "updated"} for {target_date}',
                'data': exchange_rate.to_dict()
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating exchange rates: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def exchange_rate_history_api(request):
    """
    Get exchange rate history
    """
    try:
        # Get parameters
        limit = int(request.GET.get('limit', 50))
        offset = int(request.GET.get('offset', 0))
        
        # Get history records
        history_records = ExchangeRateHistory.objects.select_related('exchange_rate').all()[:limit]
        
        history_data = []
        for record in history_records:
            history_data.append({
                'id': record.id,
                'date': record.exchange_rate.date.isoformat(),
                'rate_type': record.rate_type,
                'old_value': float(record.old_value),
                'new_value': float(record.new_value),
                'changed_by': record.changed_by,
                'change_reason': record.change_reason,
                'changed_at': record.changed_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'data': history_data,
            'count': len(history_data)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error retrieving exchange rate history: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def convert_currency_api(request):
    """
    Convert currency amounts using current exchange rates
    """
    try:
        # Get parameters
        amount = request.GET.get('amount')
        from_currency = request.GET.get('from_currency', '').upper()
        to_currency = request.GET.get('to_currency', '').upper()
        
        # Validate inputs
        if not all([amount, from_currency, to_currency]):
            return JsonResponse({
                'success': False,
                'error': 'Missing required parameters: amount, from_currency, to_currency'
            }, status=400)
        
        # Validate currency codes
        valid_currencies = ['ZIG', 'USD', 'RAND']
        if from_currency not in valid_currencies or to_currency not in valid_currencies:
            return JsonResponse({
                'success': False,
                'error': f'Invalid currency codes. Valid codes: {valid_currencies}'
            }, status=400)
        
        # Parse amount
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal < 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Amount must be positive'
                }, status=400)
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid amount value'
            }, status=400)
        
        # Get current exchange rates
        current_rates = ExchangeRate.get_current_rates()
        
        # Perform conversion
        try:
            converted_amount = current_rates.convert_amount(amount_decimal, from_currency, to_currency)
            
            return JsonResponse({
                'success': True,
                'data': {
                    'original_amount': float(amount_decimal),
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'converted_amount': float(converted_amount),
                    'exchange_rate_date': current_rates.date.isoformat(),
                    'rates_used': {
                        'usd_to_zig': float(current_rates.usd_to_zig),
                        'usd_to_rand': float(current_rates.usd_to_rand)
                    }
                }
            })
            
        except ValueError as e:
            return JsonResponse({
                'success': False,
                'error': f'Conversion error: {str(e)}'
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error converting currency: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def set_current_rates_api(request):
    """
    Set the current day's exchange rates as active
    """
    try:
        data = json.loads(request.body)
        
        date_str = data.get('date')
        updated_by = data.get('updated_by', 'system')
        
        if not date_str:
            return JsonResponse({
                'success': False,
                'error': 'Date is required'
            }, status=400)
        
        # Parse date
        from datetime import datetime
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=400)
        
        # Find exchange rates for the date and set as active
        try:
            with transaction.atomic():
                # Deactivate other rates for all dates
                ExchangeRate.objects.all().update(is_active=False)
                
                # Get or create rates for the specified date
                exchange_rate, created = ExchangeRate.objects.get_or_create(
                    date=target_date,
                    defaults={
                        'usd_to_zig': Decimal('1.000000'),
                        'usd_to_rand': Decimal('18.500000'),
                        'updated_by': updated_by,
                        'is_active': True
                    }
                )
                
                # Set as active
                exchange_rate.is_active = True
                exchange_rate.updated_by = updated_by
                exchange_rate.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Exchange rates for {target_date} set as current',
                'data': exchange_rate.to_dict()
            })
            
        except ExchangeRate.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'No exchange rates found for {target_date}'
            }, status=404)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error setting current rates: {str(e)}'
        }, status=500)