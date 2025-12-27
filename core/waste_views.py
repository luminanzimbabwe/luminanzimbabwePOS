# Waste Management Views
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
from .models import ShopConfiguration, Cashier, Product, Waste
import json

@method_decorator(csrf_exempt, name='dispatch')
class WasteListView(View):
    """List and create waste records"""
    
    def get(self, request):
        """Get waste records for the shop"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
                
            wastes = Waste.objects.filter(shop=shop).order_by('-created_at')
            
            # Filtering options
            reason = request.GET.get('reason')
            if reason:
                wastes = wastes.filter(reason=reason)
                
            start_date = request.GET.get('start_date')
            if start_date:
                wastes = wastes.filter(created_at__date__gte=start_date)
                
            end_date = request.GET.get('end_date')
            if end_date:
                wastes = wastes.filter(created_at__date__lte=end_date)
            
            waste_data = []
            for waste in wastes:
                waste_data.append({
                    'id': waste.id,
                    'product_name': waste.product.name,
                    'product_id': waste.product.id,
                    'quantity': float(waste.quantity),
                    'reason': waste.reason,
                    'reason_display': waste.get_reason_display(),
                    'reason_details': waste.reason_details,
                    'line_code': waste.line_code,
                    'barcode': waste.barcode,
                    'cost_price': float(waste.cost_price),
                    'waste_value': float(waste.waste_value),
                    'waste_type': waste.waste_type,
                    'severity_level': waste.severity_level,
                    'recorded_by': waste.recorded_by.name if waste.recorded_by else None,
                    'created_at': waste.created_at.isoformat()
                })
            
            return JsonResponse({
                'success': True,
                'wastes': waste_data
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def post(self, request):
        """Create a new waste record"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            # Parse JSON data
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid JSON data'
                }, status=400)
            
            # Get required data
            identifier = data.get('identifier', '').strip()  # line code or barcode
            quantity = float(data.get('quantity', 0))
            reason = data.get('reason', 'OTHER')
            reason_details = data.get('reason_details', '')
            cashier_id = data.get('cashier_id')
            
            if not identifier:
                return JsonResponse({
                    'success': False,
                    'error': 'Product identifier (line code or barcode) is required'
                }, status=400)
            
            if quantity <= 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Quantity must be greater than 0'
                }, status=400)
            
            # Find the product
            product = None
            try:
                # Try to get by line code first, but use .first() to handle duplicates
                product = Product.objects.filter(line_code=identifier, shop=shop).first()
                if not product:
                    # If not found by line code, try barcode
                    product = Product.objects.filter(barcode=identifier, shop=shop).first()
                    
                if not product:
                    return JsonResponse({
                        'success': False,
                        'error': f'Product not found with identifier: {identifier}'
                    }, status=404)
                    
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'error': f'Error finding product: {str(e)}'
                }, status=500)
            
            # Get cashier if provided
            recorded_by = None
            if cashier_id:
                try:
                    recorded_by = Cashier.objects.get(id=cashier_id, shop=shop)
                except Cashier.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid cashier ID'
                    }, status=400)
            
            # Check current stock level (allow negative stock for wastages)
            current_stock = float(product.stock_quantity or 0)
            will_create_negative = current_stock < quantity
            
            # Log warning for negative stock creation but allow it
            if will_create_negative:
                print(f"⚠️ WARNING: Creating negative stock for {product.name}. Current: {current_stock}, Will waste: {quantity}, New stock will be: {current_stock - quantity}")
            
            # Create waste record
            waste = Waste.objects.create(
                shop=shop,
                product=product,
                quantity=quantity,
                reason=reason,
                reason_details=reason_details,
                recorded_by=recorded_by
            )
            
            # The waste record automatically reduces stock in its save() method
            
            return JsonResponse({
                'success': True,
                'message': f'Waste recorded successfully for {product.name}',
                'waste': {
                    'id': waste.id,
                    'product_name': waste.product.name,
                    'quantity': float(waste.quantity),
                    'reason': waste.reason,
                    'reason_display': waste.get_reason_display(),
                    'waste_value': float(waste.waste_value),
                    'new_stock': float(waste.product.stock_quantity)
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class WasteSummaryView(View):
    """Get waste summary and statistics"""
    
    def get(self, request):
        """Get waste summary for the shop"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            # Get date range from query params (default to last 30 days)
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            query_start = request.GET.get('start_date')
            query_end = request.GET.get('end_date')
            
            if query_start:
                start_date = datetime.strptime(query_start, '%Y-%m-%d')
            if query_end:
                end_date = datetime.strptime(query_end, '%Y-%m-%d')
            
            # Get waste summary
            summary = Waste.get_waste_summary(shop, start_date, end_date)
            
            # Format the response
            response_data = {
                'success': True,
                'summary': {
                    'total_waste_value': float(summary['summary']['total_waste_value'] or 0),
                    'total_waste_quantity': float(summary['summary']['total_waste_quantity'] or 0),
                    'waste_count': summary['summary']['waste_count'] or 0
                },
                'reason_breakdown': [],
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': (end_date - start_date).days
                }
            }
            
            # Format reason breakdown
            for item in summary['reason_breakdown']:
                response_data['reason_breakdown'].append({
                    'reason': item['reason'],
                    'reason_display': dict(Waste.WASTE_REASON_CHOICES).get(item['reason'], item['reason']),
                    'count': item['count'],
                    'total_value': float(item['total_value'] or 0),
                    'total_quantity': float(item['total_quantity'] or 0)
                })
            
            return JsonResponse(response_data)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class WasteProductSearchView(View):
    """Search for products to record waste"""
    
    def post(self, request):
        """Search for products by identifier"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            # Parse JSON data
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid JSON data'
                }, status=400)
            
            identifier = data.get('identifier', '').strip()
            if not identifier:
                return JsonResponse({
                    'success': False,
                    'error': 'Product identifier is required'
                }, status=400)
            
            # Search for product
            product = None
            search_method = ''
            
            try:
                product = Product.objects.get(line_code=identifier, shop=shop)
                search_method = 'line_code'
            except Product.DoesNotExist:
                try:
                    product = Product.objects.get(barcode=identifier, shop=shop)
                    search_method = 'barcode'
                except Product.DoesNotExist:
                    # Check additional barcodes
                    product = Product.objects.filter(
                        shop=shop,
                        additional_barcodes__icontains=identifier
                    ).first()
                    if product:
                        search_method = 'additional_barcode'
            
            if product:
                return JsonResponse({
                    'success': True,
                    'product': {
                        'id': product.id,
                        'name': product.name,
                        'line_code': product.line_code,
                        'barcode': product.barcode,
                        'category': product.category,
                        'current_stock': float(product.stock_quantity or 0),
                        'cost_price': float(product.cost_price or 0),
                        'selling_price': float(product.price or 0),
                        'currency': product.currency
                    },
                    'search_method': search_method
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': f'Product not found with identifier: {identifier}'
                }, status=404)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)