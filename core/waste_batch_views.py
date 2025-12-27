# Waste Batch Management Views
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
from .models import ShopConfiguration, Cashier, Product, Waste, WasteBatch
import json

@method_decorator(csrf_exempt, name='dispatch')
class WasteBatchListView(View):
    """List and create waste batches"""
    
    def get(self, request):
        """Get waste batches for the shop"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
                
            batches = WasteBatch.objects.filter(shop=shop).order_by('-created_at')
            
            # Filtering options
            status = request.GET.get('status')
            if status:
                batches = batches.filter(status=status)
                
            start_date = request.GET.get('start_date')
            if start_date:
                batches = batches.filter(created_at__date__gte=start_date)
                
            end_date = request.GET.get('end_date')
            if end_date:
                batches = batches.filter(created_at__date__lte=end_date)
            
            batch_data = []
            for batch in batches:
                batch_data.append({
                    'id': batch.id,
                    'batch_number': batch.batch_number,
                    'reason': batch.reason,
                    'reason_display': batch.get_reason_display(),
                    'reason_details': batch.reason_details,
                    'status': batch.status,
                    'status_display': batch.get_status_display(),
                    'total_waste_value': float(batch.total_waste_value),
                    'total_waste_quantity': float(batch.total_waste_quantity),
                    'item_count': batch.item_count,
                    'severity_level': batch.severity_level,
                    'recorded_by': batch.recorded_by.name if batch.recorded_by else None,
                    'created_at': batch.created_at.isoformat(),
                    'completed_at': batch.completed_at.isoformat() if batch.completed_at else None
                })
            
            return JsonResponse({
                'success': True,
                'batches': batch_data
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def post(self, request):
        """Create a new waste batch"""
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
            reason = data.get('reason', 'OTHER')
            reason_details = data.get('reason_details', '')
            cashier_id = data.get('cashier_id')
            
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
            
            # Create waste batch
            batch = WasteBatch.objects.create(
                shop=shop,
                reason=reason,
                reason_details=reason_details,
                recorded_by=recorded_by
            )
            
            return JsonResponse({
                'success': True,
                'message': f'Waste batch created successfully',
                'batch': {
                    'id': batch.id,
                    'batch_number': batch.batch_number,
                    'reason': batch.reason,
                    'reason_display': batch.get_reason_display(),
                    'status': batch.status,
                    'status_display': batch.get_status_display(),
                    'created_at': batch.created_at.isoformat()
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class WasteBatchDetailView(View):
    """Get waste batch details and add items"""
    
    def get(self, request, batch_id):
        """Get waste batch details with all items"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            try:
                batch = WasteBatch.objects.get(id=batch_id, shop=shop)
            except WasteBatch.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Waste batch not found'
                }, status=404)
            
            # Get batch details
            batch_data = {
                'id': batch.id,
                'batch_number': batch.batch_number,
                'reason': batch.reason,
                'reason_display': batch.get_reason_display(),
                'reason_details': batch.reason_details,
                'status': batch.status,
                'status_display': batch.get_status_display(),
                'total_waste_value': float(batch.total_waste_value),
                'total_waste_quantity': float(batch.total_waste_quantity),
                'item_count': batch.item_count,
                'severity_level': batch.severity_level,
                'recorded_by': batch.recorded_by.name if batch.recorded_by else None,
                'created_at': batch.created_at.isoformat(),
                'completed_at': batch.completed_at.isoformat() if batch.completed_at else None,
                'items': []
            }
            
            # Get all waste items in this batch
            waste_items = batch.get_waste_items()
            for item in waste_items:
                batch_data['items'].append({
                    'id': item.id,
                    'product_name': item.product.name,
                    'product_id': item.product.id,
                    'quantity': float(item.quantity),
                    'reason': item.reason,
                    'reason_display': item.get_reason_display(),
                    'reason_details': item.reason_details,
                    'line_code': item.line_code,
                    'barcode': item.barcode,
                    'cost_price': float(item.cost_price),
                    'waste_value': float(item.waste_value),
                    'waste_type': item.waste_type,
                    'severity_level': item.severity_level,
                    'recorded_by': item.recorded_by.name if item.recorded_by else None,
                    'created_at': item.created_at.isoformat()
                })
            
            return JsonResponse({
                'success': True,
                'batch': batch_data
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def post(self, request, batch_id):
        """Add a waste item to the batch"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            try:
                batch = WasteBatch.objects.get(id=batch_id, shop=shop)
            except WasteBatch.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Waste batch not found'
                }, status=404)
            
            if batch.status != 'DRAFT':
                status_text = 'completed' if batch.status == 'COMPLETED' else 'cancelled'
                return JsonResponse({
                    'success': False,
                    'error': f'Cannot add items to {status_text} batch. Only draft batches can accept new items.'
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
            specific_reason = data.get('specific_reason')
            specific_details = data.get('specific_details', '')
            
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
                product = Product.objects.filter(line_code=identifier, shop=shop).first()
                if not product:
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
            
            # Check current stock level (allow negative stock for wastages)
            current_stock = float(product.stock_quantity or 0)
            will_create_negative = current_stock < quantity
            
            # Log warning for negative stock creation but allow it
            if will_create_negative:
                print(f"⚠️ WARNING: Creating negative stock for {product.name}. Current: {current_stock}, Will waste: {quantity}, New stock will be: {current_stock - quantity}")
            
            # Add waste item to batch
            waste_item = batch.add_waste_item(
                product=product,
                quantity=quantity,
                specific_reason=specific_reason,
                specific_details=specific_details
            )
            
            return JsonResponse({
                'success': True,
                'message': f'Waste item added successfully to batch {batch.batch_number}',
                'item': {
                    'id': waste_item.id,
                    'product_name': waste_item.product.name,
                    'quantity': float(waste_item.quantity),
                    'reason': waste_item.reason,
                    'reason_display': waste_item.get_reason_display(),
                    'waste_value': float(waste_item.waste_value),
                    'new_stock': float(waste_item.product.stock_quantity)
                },
                'batch': {
                    'id': batch.id,
                    'total_waste_value': float(batch.total_waste_value),
                    'total_waste_quantity': float(batch.total_waste_quantity),
                    'item_count': batch.item_count
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def patch(self, request, batch_id):
        """Complete or cancel the batch"""
        try:
            shop = ShopConfiguration.objects.first()
            if not shop:
                return JsonResponse({
                    'success': False,
                    'error': 'Shop not configured'
                }, status=400)
            
            try:
                batch = WasteBatch.objects.get(id=batch_id, shop=shop)
            except WasteBatch.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Waste batch not found'
                }, status=404)
            
            # Parse JSON data
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid JSON data'
                }, status=400)
            
            action = data.get('action')  # 'complete' or 'cancel'
            
            if action == 'complete':
                try:
                    batch.complete_batch()
                    message = f'Waste batch {batch.batch_number} completed successfully'
                except ValueError as e:
                    return JsonResponse({
                        'success': False,
                        'error': str(e)
                    }, status=400)
            elif action == 'cancel':
                try:
                    batch.cancel_batch()
                    message = f'Waste batch {batch.batch_number} cancelled successfully'
                except ValueError as e:
                    return JsonResponse({
                        'success': False,
                        'error': str(e)
                    }, status=400)
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Action must be "complete" or "cancel"'
                }, status=400)
            
            return JsonResponse({
                'success': True,
                'message': message,
                'batch': {
                    'id': batch.id,
                    'batch_number': batch.batch_number,
                    'status': batch.status,
                    'status_display': batch.get_status_display(),
                    'total_waste_value': float(batch.total_waste_value),
                    'total_waste_quantity': float(batch.total_waste_quantity),
                    'item_count': batch.item_count,
                    'completed_at': batch.completed_at.isoformat() if batch.completed_at else None
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)