from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db import models
from django.db.models import Sum, F, Q, Count, Avg
from datetime import timedelta
from decimal import Decimal
import json

from .models import (
    ShopConfiguration, Cashier, Product, Sale, SaleItem, Customer, 
    StockTransfer, Waste, WasteBatch, InventoryLog, StockMovement, Shift, ShopDay
)
from .serializers import SaleSerializer, ProductSerializer


@method_decorator(csrf_exempt, name='dispatch')
class InfiniteSalesFeedView(APIView):
    """
    Enhanced infinite scroll sales feed with advanced filtering
    GET /api/v1/shop/sales/ - Main endpoint for sales ledger
    """
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)  # Max 100 per page
        offset = (page - 1) * page_size
        
        # Filtering parameters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        cashier_id = request.query_params.get('cashier_id')
        status_filter = request.query_params.get('status', 'completed')
        payment_method = request.query_params.get('payment_method')
        search_query = request.query_params.get('search', '').strip()
        
        # Start with base queryset
        sales_query = Sale.objects.filter(shop=shop)
        
        # Apply filters
        if date_from:
            try:
                date_from_obj = timezone.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                sales_query = sales_query.filter(created_at__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = timezone.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                sales_query = sales_query.filter(created_at__lte=date_to_obj)
            except ValueError:
                pass
        
        if cashier_id:
            sales_query = sales_query.filter(cashier_id=cashier_id)
        
        if status_filter:
            sales_query = sales_query.filter(status=status_filter)
        
        if payment_method:
            sales_query = sales_query.filter(payment_method=payment_method)
        
        if search_query:
            # Search by sale ID, customer name, or cashier name
            sales_query = sales_query.filter(
                Q(id__icontains=search_query) |
                Q(customer_name__icontains=search_query) |
                Q(cashier__name__icontains=search_query)
            )
        
        # Calculate totals for margin analysis
        total_sales = sales_query.count()
        sales_data = sales_query.order_by('-created_at')[offset:offset + page_size]
        
        # Enhanced sales data with margin calculations
        enhanced_sales = []
        total_cost_price = 0
        total_selling_price = 0
        
        for sale in sales_data:
            sale_cost_price = 0
            sale_selling_price = float(sale.total_amount)
            
            # Calculate cost price for this sale
            for item in sale.items.all():
                item_cost = float(item.quantity) * float(item.product.cost_price)
                sale_cost_price += item_cost
            
            total_cost_price += sale_cost_price
            total_selling_price += sale_selling_price
            
            # Calculate margin percentage
            margin_percentage = 0
            if sale_cost_price > 0:
                margin_percentage = ((sale_selling_price - sale_cost_price) / sale_cost_price) * 100
            
            enhanced_sales.append({
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'cashier_id': sale.cashier.id if sale.cashier else None,
                'customer_name': sale.customer_name or '',
                'customer_phone': sale.customer_phone or '',
                'total_amount': float(sale.total_amount),
                'cost_price': sale_cost_price,
                'margin_amount': sale_selling_price - sale_cost_price,
                'margin_percentage': round(margin_percentage, 2),
                'payment_method': sale.payment_method,
                'currency': sale.currency,
                'status': sale.status,
                'item_count': sale.items.count(),
                'items': [{
                    'product_name': item.product.name,
                    'product_id': item.product.id,
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'cost_price': float(item.product.cost_price),
                    'line_code': item.product.line_code,
                    'barcode': item.product.barcode,
                    'category': item.product.category
                } for item in sale.items.all()]
            })
        
        # Calculate overall margin
        overall_margin = 0
        overall_margin_percentage = 0
        if total_cost_price > 0:
            overall_margin = total_selling_price - total_cost_price
            overall_margin_percentage = (overall_margin / total_cost_price) * 100
        
        # Check if there are more pages
        has_more = offset + page_size < total_sales
        
        return Response({
            'sales': enhanced_sales,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total_sales,
                'has_more': has_more,
                'pages': (total_sales + page_size - 1) // page_size
            },
            'financial_summary': {
                'total_cost_price': round(total_cost_price, 2),
                'total_selling_price': round(total_selling_price, 2),
                'total_margin': round(overall_margin, 2),
                'margin_percentage': round(overall_margin_percentage, 2)
            },
            'filters_applied': {
                'date_from': date_from,
                'date_to': date_to,
                'cashier_id': cashier_id,
                'status': status_filter,
                'payment_method': payment_method,
                'search': search_query
            }
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class SaleAuditTrailView(APIView):
    """
    Digital Twin - Complete audit trail for individual sales
    GET /api/v1/shop/sales/<id>/audit/ - Get detailed audit trail
    """
    
    def get(self, request, sale_id):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            sale = Sale.objects.get(id=sale_id, shop=shop)
        except Sale.DoesNotExist:
            return Response({"error": "Sale not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Build comprehensive audit trail
        audit_trail = {
            'sale_info': {
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'status': sale.status,
                'created_at': sale.created_at.isoformat(),
                'total_amount': float(sale.total_amount),
                'currency': sale.currency
            },
            'transaction_timeline': [],
            'stock_movements': [],
            'refund_history': [],
            'discrepancy_flags': []
        }
        
        # 1. Sale Creation Timeline
        audit_trail['transaction_timeline'].append({
            'timestamp': sale.created_at.isoformat(),
            'event': 'SALE_CREATED',
            'description': 'Sale transaction initiated',
            'cashier': sale.cashier.name if sale.cashier else 'Unknown',
            'details': {
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name,
                'initial_total': float(sale.total_amount)
            }
        })
        
        # 2. Item Processing Timeline
        for item in sale.items.all():
            # Sale item creation
            audit_trail['transaction_timeline'].append({
                'timestamp': sale.created_at.isoformat(),
                'event': 'ITEM_SCANNED',
                'description': f'Item scanned: {item.product.name}',
                'product': {
                    'id': item.product.id,
                    'name': item.product.name,
                    'line_code': item.product.line_code,
                    'barcode': item.product.barcode
                },
                'details': {
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price)
                }
            })
        
        # 3. Stock Movement Analysis
        for item in sale.items.all():
            stock_movements = StockMovement.objects.filter(
                shop=shop,
                product=item.product,
                movement_type='SALE',
                reference_number=f'Sale #{sale.id}'
            ).order_by('created_at')
            
            for movement in stock_movements:
                audit_trail['stock_movements'].append({
                    'timestamp': movement.created_at.isoformat(),
                    'movement_type': movement.movement_type,
                    'product_name': item.product.name,
                    'quantity_change': float(movement.quantity_change),
                    'previous_stock': float(movement.previous_stock),
                    'new_stock': float(movement.new_stock),
                    'cost_price': float(movement.cost_price),
                    'total_value': float(movement.total_cost_value)
                })
        
        # 4. Refund History (if any)
        if sale.status == 'refunded':
            refund_timeline = {
                'timestamp': sale.refunded_at.isoformat() if sale.refunded_at else '',
                'event': 'SALE_REFUNDED',
                'description': 'Sale fully refunded',
                'refund_details': {
                    'refund_amount': float(sale.refund_amount),
                    'refund_type': sale.refund_type,
                    'refund_reason': sale.refund_reason,
                    'refunded_by': sale.refunded_by.name if sale.refunded_by else 'Unknown'
                }
            }
            audit_trail['transaction_timeline'].append(refund_timeline)
            audit_trail['refund_history'].append(refund_timeline['refund_details'])
            
            # Item-level refunds
            for item in sale.items.all():
                if item.refunded:
                    audit_trail['refund_history'].append({
                        'item_name': item.product.name,
                        'refunded_quantity': float(item.refund_quantity),
                        'refund_amount': float(item.refund_amount),
                        'refund_reason': item.refund_reason,
                        'refund_type': item.refund_type,
                        'refunded_at': item.refunded_at.isoformat() if item.refunded_at else ''
                    })
        
        # 5. Discrepancy Detection
        # Check for potential issues
        discrepancies = []
        
        # Check for negative stock after sale
        for item in sale.items.all():
            current_stock = float(item.product.stock_quantity)
            if current_stock < 0:
                discrepancies.append({
                    'type': 'NEGATIVE_STOCK',
                    'severity': 'HIGH',
                    'description': f'Product {item.product.name} has negative stock after sale',
                    'current_stock': current_stock,
                    'product_id': item.product.id
                })
        
        # Check for unusual price changes
        recent_sales = SaleItem.objects.filter(
            product__in=[item.product for item in sale.items.all()],
            sale__created_at__gte=sale.created_at - timedelta(hours=24),
            sale__created_at__lte=sale.created_at + timedelta(hours=24)
        ).exclude(sale=sale)
        
        for item in sale.items.all():
            other_prices = [float(si.unit_price) for si in recent_sales.filter(product=item.product)]
            if other_prices and float(item.unit_price) not in other_prices:
                avg_price = sum(other_prices) / len(other_prices)
                if abs(float(item.unit_price) - avg_price) / avg_price > 0.2:  # 20% difference
                    discrepancies.append({
                        'type': 'PRICE_VARIATION',
                        'severity': 'MEDIUM',
                        'description': f'Unusual price for {item.product.name}',
                        'sale_price': float(item.unit_price),
                        'average_price': round(avg_price, 2),
                        'variation_percentage': round(((float(item.unit_price) - avg_price) / avg_price) * 100, 2)
                    })
        
        audit_trail['discrepancy_flags'] = discrepancies
        
        return Response(audit_trail, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class SalesAnalyticsView(APIView):
    """
    Sales Analytics for Dashboard and Performance Metrics
    GET /api/v1/shop/analytics/ - Main analytics endpoint
    """
    permission_classes = [permissions.AllowAny]  # Allow anonymous access
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Date range parameters
        period = request.query_params.get('period', '30days')  # 7days, 30days, 90days, 1year
        end_date = timezone.now()
        
        if period == '7days':
            start_date = end_date - timedelta(days=7)
        elif period == '30days':
            start_date = end_date - timedelta(days=30)
        elif period == '90days':
            start_date = end_date - timedelta(days=90)
        elif period == '1year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Filter sales in period
        period_sales = Sale.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date],
            status='completed'
        )
        
        # 1. Revenue Analytics
        total_revenue = period_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        total_transactions = period_sales.count()
        average_transaction_value = total_revenue / max(total_transactions, 1)
        
        # Daily revenue breakdown
        daily_revenue = []
        current_date = start_date.date()
        while current_date <= end_date.date():
            day_sales = period_sales.filter(created_at__date=current_date)
            day_revenue = day_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            daily_revenue.append({
                'date': current_date.isoformat(),
                'revenue': float(day_revenue),
                'transactions': day_sales.count()
            })
            current_date += timedelta(days=1)
        
        # 2. Shrinkage Analysis (from Waste and Stock Transfer data)
        shrinkage_data = self._calculate_shrinkage(shop, start_date, end_date)
        
        # 3. Performance Metrics
        performance_data = self._calculate_performance_metrics(shop, period_sales, start_date, end_date)
        
        # 4. Product Performance
        top_products = self._get_top_products(shop, period_sales)
        
        # 5. Cashier Performance
        cashier_performance = self._get_cashier_performance(shop, period_sales)
        
        # 6. Payment Method Analysis
        payment_analysis = self._analyze_payment_methods(period_sales)
        
        return Response({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': (end_date - start_date).days
            },
            'revenue_analytics': {
                'total_revenue': float(total_revenue),
                'total_transactions': total_transactions,
                'average_transaction_value': float(average_transaction_value),
                'daily_breakdown': daily_revenue
            },
            'shrinkage_analysis': shrinkage_data,
            'performance_metrics': performance_data,
            'top_products': top_products,
            'cashier_performance': cashier_performance,
            'payment_analysis': payment_analysis
        }, status=status.HTTP_200_OK)
    
    def _calculate_shrinkage(self, shop, start_date, end_date):
        """Calculate shrinkage analysis from waste and stock transfer data"""
        
        # Waste data
        waste_records = Waste.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date]
        )
        
        total_waste_value = waste_records.aggregate(total=Sum('waste_value'))['total'] or 0
        waste_by_reason = waste_records.values('reason').annotate(
            count=Count('id'),
            total_value=Sum('waste_value')
        ).order_by('-total_value')
        
        # Stock transfer shrinkage
        transfer_shrinkage = StockTransfer.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date],
            status='COMPLETED'
        ).aggregate(
            total_shrinkage=Sum('shrinkage_value')
        )['total_shrinkage'] or 0
        
        return {
            'total_waste_value': float(total_waste_value),
            'total_transfer_shrinkage': float(transfer_shrinkage),
            'total_shrinkage': float(total_waste_value + transfer_shrinkage),
            'waste_by_reason': [{
                'reason': item['reason'],
                'count': item['count'],
                'value': float(item['total_value'])
            } for item in waste_by_reason]
        }
    
    def _calculate_performance_metrics(self, shop, period_sales, start_date, end_date):
        """Calculate performance metrics including basket size and hourly patterns"""
        
        # Basket size analysis
        total_items = SaleItem.objects.filter(
            sale__in=period_sales
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        basket_size = total_items / max(period_sales.count(), 1)
        
        # Hourly sales pattern
        hourly_pattern = []
        for hour in range(24):
            hour_sales = period_sales.filter(
                created_at__hour=hour
            )
            hour_revenue = hour_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            hourly_pattern.append({
                'hour': hour,
                'revenue': float(hour_revenue),
                'transactions': hour_sales.count()
            })
        
        # Currency breakdown
        currency_breakdown = period_sales.values('currency').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        return {
            'basket_size': float(basket_size),
            'total_items_sold': float(total_items),
            'hourly_pattern': hourly_pattern,
            'currency_breakdown': [{
                'currency': item['currency'],
                'total_revenue': float(item['total']),
                'transaction_count': item['count']
            } for item in currency_breakdown]
        }
    
    def _get_top_products(self, shop, period_sales):
        """Get top selling products in the period"""
        top_products = SaleItem.objects.filter(
            sale__in=period_sales
        ).values(
            'product_id',
            'product__name',
            'product__category',
            'product__line_code'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('unit_price')),
            transaction_count=Count('sale_id', distinct=True)
        ).order_by('-total_revenue')[:10]
        
        return [{
            'product_id': item['product_id'],
            'name': item['product__name'],
            'category': item['product__category'],
            'line_code': item['product__line_code'],
            'total_quantity': float(item['total_quantity']),
            'total_revenue': float(item['total_revenue']),
            'transaction_count': item['transaction_count']
        } for item in top_products]
    
    def _get_cashier_performance(self, shop, period_sales):
        """Get cashier performance metrics"""
        cashier_performance = period_sales.values(
            'cashier_id',
            'cashier__name'
        ).annotate(
            total_revenue=Sum('total_amount'),
            transaction_count=Count('id'),
            average_transaction=Avg('total_amount')
        ).order_by('-total_revenue')
        
        return [{
            'cashier_id': item['cashier_id'],
            'cashier_name': item['cashier__name'],
            'total_revenue': float(item['total_revenue']),
            'transaction_count': item['transaction_count'],
            'average_transaction': float(item['average_transaction'])
        } for item in cashier_performance]
    
    def _analyze_payment_methods(self, period_sales):
        """Analyze payment method usage"""
        payment_analysis = period_sales.values('payment_method').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('-total')
        
        return [{
            'payment_method': item['payment_method'],
            'total_revenue': float(item['total']),
            'transaction_count': item['count'],
            'percentage': round((item['count'] / period_sales.count()) * 100, 2) if period_sales.count() > 0 else 0
        } for item in payment_analysis]


@method_decorator(csrf_exempt, name='dispatch')
class SalesExceptionReportView(APIView):
    """
    Exception Reports for voided sales, refunds, and high-discrepancy events
    GET /api/v1/shop/sales/exceptions/ - Get exception reports
    """
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Date range (default: last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                start_date = timezone.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        if date_to:
            try:
                end_date = timezone.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        # 1. Refunded Sales
        refunded_sales = Sale.objects.filter(
            shop=shop,
            status='refunded',
            created_at__range=[start_date, end_date]
        ).select_related('cashier', 'refunded_by')
        
        refunded_data = []
        for sale in refunded_sales:
            refunded_data.append({
                'sale_id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'original_amount': float(sale.total_amount),
                'refund_amount': float(sale.refund_amount),
                'refund_percentage': round((float(sale.refund_amount) / float(sale.total_amount)) * 100, 2) if sale.total_amount > 0 else 0,
                'refund_reason': sale.refund_reason,
                'refund_type': sale.refund_type,
                'original_date': sale.created_at.isoformat(),
                'refund_date': sale.refunded_at.isoformat() if sale.refunded_at else '',
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'refunded_by': sale.refunded_by.name if sale.refunded_by else 'Unknown',
                'items': [{
                    'product_name': item.product.name,
                    'quantity': float(item.quantity),
                    'refunded_quantity': float(item.refund_quantity),
                    'refund_amount': float(item.refund_amount)
                } for item in sale.items.all() if item.refunded]
            })
        
        # 2. High-Value Transactions (potential exceptions)
        high_value_threshold = float(request.query_params.get('threshold', 1000))
        high_value_sales = Sale.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date],
            total_amount__gte=high_value_threshold,
            status='completed'
        ).select_related('cashier')
        
        high_value_data = []
        for sale in high_value_sales:
            high_value_data.append({
                'sale_id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'amount': float(sale.total_amount),
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name or 'Walk-in',
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'created_at': sale.created_at.isoformat(),
                'item_count': sale.items.count()
            })
        
        # 3. Sales with Discrepancies (price variations, etc.)
        discrepancy_sales = self._find_discrepancy_sales(shop, start_date, end_date)
        
        # 4. Summary Statistics
        total_refunds = len(refunded_data)
        total_refund_amount = sum(item['refund_amount'] for item in refunded_data)
        total_high_value = len(high_value_data)
        total_discrepancies = len(discrepancy_sales)
        
        return Response({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_refunds': total_refunds,
                'total_refund_amount': round(total_refund_amount, 2),
                'total_high_value_transactions': total_high_value,
                'total_discrepancies': total_discrepancies
            },
            'refunded_sales': refunded_data,
            'high_value_transactions': high_value_data,
            'discrepancy_sales': discrepancy_sales
        }, status=status.HTTP_200_OK)
    
    def _find_discrepancy_sales(self, shop, start_date, end_date):
        """Find sales with potential discrepancies"""
        discrepancy_sales = []
        
        # Get sales in the period
        period_sales = Sale.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date],
            status='completed'
        )
        
        for sale in period_sales:
            discrepancies = []
            
            # Check for unusual price combinations
            for item in sale.items.all():
                # Check if product price has changed significantly recently
                recent_sales = SaleItem.objects.filter(
                    product=item.product,
                    sale__created_at__gte=sale.created_at - timedelta(hours=24),
                    sale__created_at__lte=sale.created_at + timedelta(hours=24)
                ).exclude(sale=sale)
                
                if recent_sales.exists():
                    recent_prices = [float(si.unit_price) for si in recent_sales]
                    avg_price = sum(recent_prices) / len(recent_prices)
                    current_price = float(item.unit_price)
                    
                    if abs(current_price - avg_price) / avg_price > 0.3:  # 30% price variation
                        discrepancies.append({
                            'type': 'PRICE_VARIATION',
                            'description': f'Price variation: {current_price} vs avg {avg_price:.2f}',
                            'severity': 'HIGH'
                        })
            
            if discrepancies:
                discrepancy_sales.append({
                    'sale_id': sale.id,
                    'receipt_number': f'R{sale.id:03d}',
                    'amount': float(sale.total_amount),
                    'created_at': sale.created_at.isoformat(),
                    'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                    'discrepancies': discrepancies
                })
        
        return discrepancy_sales


@method_decorator(csrf_exempt, name='dispatch')
class ShopDayManagementView(APIView):
    """
    Shop Day Management - Start of Day / End of Day functionality
    GET /api/v1/shop/shop-status/ - Get current shop status
    POST /api/v1/shop/start-day/ - Start the day (owner only)
    POST /api/v1/shop/end-day/ - End the day (owner only)
    """
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        from .models import ShopDay
        
        # Get current shop day
        shop_day = ShopDay.get_current_day(shop)
        
        # Get active shifts for today
        from .models import Shift
        today_shifts = Shift.objects.filter(
            shop=shop,
            start_time__date=shop_day.date,
            is_active=True
        ).select_related('cashier')
        
        return Response({
            'shop_day': {
                'date': shop_day.date.isoformat(),
                'status': shop_day.status,
                'is_open': shop_day.is_open,
                'opened_at': shop_day.opened_at.isoformat() if shop_day.opened_at else None,
                'closed_at': shop_day.closed_at.isoformat() if shop_day.closed_at else None,
                'opening_notes': shop_day.opening_notes,
                'closing_notes': shop_day.closing_notes
            },
            'active_shifts': [{
                'shift_id': shift.id,
                'cashier_id': shift.cashier.id,
                'cashier_name': shift.cashier.name,
                'start_time': shift.start_time.isoformat(),
                'opening_balance': float(shift.opening_balance),
                'is_active': shift.is_active
            } for shift in today_shifts],
            'total_active_cashiers': today_shifts.count()
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        action = request.data.get('action')
        notes = request.data.get('notes', '')
        
        if action not in ['start_day', 'end_day']:
            return Response({"error": "Invalid action. Use 'start_day' or 'end_day'"}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import ShopDay, Shift
        
        # Get current shop day
        shop_day = ShopDay.get_current_day(shop)
        
        try:
            if action == 'start_day':
                # Open the shop
                shop_day.open_shop(notes=notes)
                
                return Response({
                    'message': 'Shop opened successfully',
                    'shop_day': {
                        'date': shop_day.date.isoformat(),
                        'status': shop_day.status,
                        'opened_at': shop_day.opened_at.isoformat(),
                        'opening_notes': shop_day.opening_notes
                    }
                }, status=status.HTTP_200_OK)
                
            elif action == 'end_day':
                # Close the shop
                shop_day.close_shop(notes=notes)
                
                return Response({
                    'message': 'Shop closed successfully',
                    'shop_day': {
                        'date': shop_day.date.isoformat(),
                        'status': shop_day.status,
                        'closed_at': shop_day.closed_at.isoformat(),
                        'closing_notes': shop_day.closing_notes
                    },
                    'shifts_closed': True
                }, status=status.HTTP_200_OK)
                
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Failed to {action.replace('_', ' ')}: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class EODReconciliationView(APIView):
    """
    End of Day Reconciliation functionality
    GET /api/v1/shop/reconciliation/ - Get EOD reconciliation data
    POST /api/v1/shop/reconciliation/ - Process EOD reconciliation
    """
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get today's date
        today = timezone.now().date()
        
        # Get current open shop_day (for session-aware filtering)
        current_shop_day = ShopDay.get_open_shop_day(shop)
        
        # Get all shifts for today
        today_shifts = Shift.objects.filter(
            shop=shop,
            start_time__date=today
        ).select_related('cashier')
        
        # Get all sales for today using shop_day and opened_at for session-aware filtering
        if current_shop_day and current_shop_day.opened_at:
            # Filter by shop_day AND by created_at >= opened_at to ensure we only get sales from THIS session
            # This handles the case where shop was closed and reopened on the same day
            today_sales = Sale.objects.filter(
                shop=shop, 
                shop_day=current_shop_day,
                created_at__gte=current_shop_day.opened_at
            )
        else:
            # Fallback: no open shop day, use today's date
            today_sales = Sale.objects.filter(shop=shop, created_at__date=today)
        
        # Calculate refund totals by payment method
        refunded_sales = today_sales.filter(status='refunded')
        cash_refunds = refunded_sales.filter(payment_method='cash').aggregate(
            total=Sum('refund_amount')
        )['total'] or 0
        card_refunds = refunded_sales.filter(payment_method='card').aggregate(
            total=Sum('refund_amount')
        )['total'] or 0
        ecocash_refunds = refunded_sales.filter(payment_method='ecocash').aggregate(
            total=Sum('refund_amount')
        )['total'] or 0
        
        # Get only completed sales for revenue calculations
        completed_sales = today_sales.filter(status='completed')
        
        # Calculate reconciliation data
        reconciliation_data = {
            'date': today.isoformat(),
            'shifts': [],
            'overall_summary': {},
            'sales_summary': {},
            'expected_cash': {},
            'discrepancies': {}
        }
        
        # Process each shift
        total_cash_expected = 0
        total_card_expected = 0
        total_ecocash_expected = 0
        total_cash_refunds = 0
        total_card_refunds = 0
        total_ecocash_refunds = 0
        
        for shift in today_shifts:
            shift_sales = completed_sales.filter(cashier=shift.cashier)
            shift_refunds = refunded_sales.filter(cashier=shift.cashier)
            
            # Calculate expected amounts by payment method (completed sales only)
            cash_sales = shift_sales.filter(payment_method='cash')
            card_sales = shift_sales.filter(payment_method='card')
            ecocash_sales = shift_sales.filter(payment_method='ecocash')
            
            # Calculate refunds by payment method
            cash_refunds_shift = shift_refunds.filter(payment_method='cash').aggregate(
                total=Sum('refund_amount')
            )['total'] or 0
            card_refunds_shift = shift_refunds.filter(payment_method='card').aggregate(
                total=Sum('refund_amount')
            )['total'] or 0
            ecocash_refunds_shift = shift_refunds.filter(payment_method='ecocash').aggregate(
                total=Sum('refund_amount')
            )['total'] or 0
            
            cash_total = cash_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            card_total = card_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            ecocash_total = ecocash_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Net amounts after refunds
            net_cash = float(cash_total) - float(cash_refunds_shift)
            net_card = float(card_total) - float(card_refunds_shift)
            net_ecocash = float(ecocash_total) - float(ecocash_refunds_shift)
            
            expected_cash = float(shift.opening_balance) + net_cash
            
            reconciliation_data['shifts'].append({
                'shift_id': shift.id,
                'cashier_name': shift.cashier.name,
                'cashier_id': shift.cashier.id,
                'start_time': shift.start_time.isoformat(),
                'end_time': shift.end_time.isoformat() if shift.end_time else '',
                'opening_balance': float(shift.opening_balance),
                'closing_balance': float(shift.closing_balance),
                'expected_cash': expected_cash,
                'actual_cash': float(shift.closing_balance),
                'cash_difference': float(shift.closing_balance) - expected_cash,
                'sales_summary': {
                    'total_sales': shift_sales.count(),
                    'cash_sales': float(cash_total),
                    'card_sales': float(card_total),
                    'ecocash_sales': float(ecocash_total),
                    'total_amount': float(cash_total + card_total + ecocash_total)
                },
                'refund_summary': {
                    'cash_refunds': float(cash_refunds_shift),
                    'card_refunds': float(card_refunds_shift),
                    'ecocash_refunds': float(ecocash_refunds_shift),
                    'total_refunds': float(cash_refunds_shift + card_refunds_shift + ecocash_refunds_shift)
                },
                'net_amounts': {
                    'net_cash': net_cash,
                    'net_card': net_card,
                    'net_ecocash': net_ecocash,
                    'net_total': net_cash + net_card + net_ecocash
                }
            })
            
            total_cash_expected += expected_cash
            total_card_expected += float(card_total)
            total_ecocash_expected += float(ecocash_total)
            total_cash_refunds += float(cash_refunds_shift)
            total_card_refunds += float(card_refunds_shift)
            total_ecocash_refunds += float(ecocash_refunds_shift)
        
        # Overall summary
        total_sales = completed_sales.count()
        total_revenue = completed_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # If no formal shifts exist, create individual cashier entries from sales data
        if not today_shifts.exists():
            # Group sales by cashier (only completed sales)
            cashier_sales = completed_sales.values(
                'cashier_id',
                'cashier__name'
            ).annotate(
                total_sales=Count('id'),
                total_revenue=Sum('total_amount'),
                cash_sales=Sum('total_amount', filter=Q(payment_method='cash')),
                card_sales=Sum('total_amount', filter=Q(payment_method='card')),
                ecocash_sales=Sum('total_amount', filter=Q(payment_method='ecocash'))
            )
            
            # Group refunds by cashier
            cashier_refunds = refunded_sales.values(
                'cashier_id'
            ).annotate(
                cash_refunds=Sum('refund_amount', filter=Q(payment_method='cash')),
                card_refunds=Sum('refund_amount', filter=Q(payment_method='card')),
                ecocash_refunds=Sum('refund_amount', filter=Q(payment_method='ecocash'))
            )
            
            # Create a lookup for refunds by cashier
            refund_lookup = {}
            for refund_data in cashier_refunds:
                refund_lookup[refund_data['cashier_id']] = {
                    'cash_refunds': refund_data['cash_refunds'] or 0,
                    'card_refunds': refund_data['card_refunds'] or 0,
                    'ecocash_refunds': refund_data['ecocash_refunds'] or 0
                }
            
            # Process each cashier's sales
            for cashier_data in cashier_sales:
                if cashier_data['cashier_id']:  # Only include sales with assigned cashiers
                    cash_total = cashier_data['cash_sales'] or 0
                    card_total = cashier_data['card_sales'] or 0
                    ecocash_total = cashier_data['ecocash_sales'] or 0
                    
                    # Get refunds for this cashier
                    cashier_refund_data = refund_lookup.get(cashier_data['cashier_id'], {
                        'cash_refunds': 0, 'card_refunds': 0, 'ecocash_refunds': 0
                    })
                    
                    # Calculate net amounts after refunds
                    net_cash = float(cash_total) - float(cashier_refund_data['cash_refunds'])
                    net_card = float(card_total) - float(cashier_refund_data['card_refunds'])
                    net_ecocash = float(ecocash_total) - float(cashier_refund_data['ecocash_refunds'])
                    
                    reconciliation_data['shifts'].append({
                        'shift_id': f"sales_{cashier_data['cashier_id']}",  # Use prefix to distinguish from real shift IDs
                        'cashier_name': cashier_data['cashier__name'],
                        'cashier_id': cashier_data['cashier_id'],
                        'start_time': today.isoformat() + 'T08:00:00',  # Default start time
                        'end_time': '',
                        'opening_balance': 0,
                        'closing_balance': 0,
                        'expected_cash': net_cash,  # Net cash after refunds
                        'actual_cash': 0,
                        'cash_difference': -net_cash,
                        'sales_summary': {
                            'total_sales': cashier_data['total_sales'],
                            'cash_sales': float(cash_total),
                            'card_sales': float(card_total),
                            'ecocash_sales': float(ecocash_total),
                            'total_amount': float(cashier_data['total_revenue'])
                        },
                        'refund_summary': {
                            'cash_refunds': float(cashier_refund_data['cash_refunds']),
                            'card_refunds': float(cashier_refund_data['card_refunds']),
                            'ecocash_refunds': float(cashier_refund_data['ecocash_refunds']),
                            'total_refunds': float(cashier_refund_data['cash_refunds'] + cashier_refund_data['card_refunds'] + cashier_refund_data['ecocash_refunds'])
                        },
                        'net_amounts': {
                            'net_cash': net_cash,
                            'net_card': net_card,
                            'net_ecocash': net_ecocash,
                            'net_total': net_cash + net_card + net_ecocash
                        }
                    })
                    
                    total_cash_expected += net_cash
                    total_card_expected += net_card
                    total_ecocash_expected += net_ecocash
                    total_cash_refunds += float(cashier_refund_data['cash_refunds'])
                    total_card_refunds += float(cashier_refund_data['card_refunds'])
                    total_ecocash_refunds += float(cashier_refund_data['ecocash_refunds'])
        
        # Calculate overall totals by payment method
        gross_cash_sales = completed_sales.filter(payment_method='cash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        gross_card_sales = completed_sales.filter(payment_method='card').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        gross_ecocash_sales = completed_sales.filter(payment_method='ecocash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Net amounts after refunds
        net_cash_sales = float(gross_cash_sales) - float(cash_refunds)
        net_card_sales = float(gross_card_sales) - float(card_refunds)
        net_ecocash_sales = float(gross_ecocash_sales) - float(ecocash_refunds)
        
        # Calculate sales by currency (multi-currency support)
        # USD sales
        usd_cash_sales = completed_sales.filter(payment_currency='USD', payment_method='cash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        usd_card_sales = completed_sales.filter(payment_currency='USD', payment_method='card').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        usd_ecocash_sales = completed_sales.filter(payment_currency='USD', payment_method='ecocash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        usd_transfer_sales = completed_sales.filter(payment_currency='USD', payment_method='transfer').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # ZIG sales
        zig_cash_sales = completed_sales.filter(payment_currency='ZIG', payment_method='cash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        zig_card_sales = completed_sales.filter(payment_currency='ZIG', payment_method='card').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        zig_ecocash_sales = completed_sales.filter(payment_currency='ZIG', payment_method='ecocash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        zig_transfer_sales = completed_sales.filter(payment_currency='ZIG', payment_method='transfer').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # RAND sales
        rand_cash_sales = completed_sales.filter(payment_currency='RAND', payment_method='cash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        rand_card_sales = completed_sales.filter(payment_currency='RAND', payment_method='card').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        rand_ecocash_sales = completed_sales.filter(payment_currency='RAND', payment_method='ecocash').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        rand_transfer_sales = completed_sales.filter(payment_currency='RAND', payment_method='transfer').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Build sales_by_currency breakdown
        sales_by_currency = {
            'usd': {
                'cash_sales': float(usd_cash_sales),
                'card_sales': float(usd_card_sales),
                'ecocash_sales': float(usd_ecocash_sales),
                'transfer_sales': float(usd_transfer_sales),
                'total_sales': float(usd_cash_sales + usd_card_sales + usd_ecocash_sales + usd_transfer_sales)
            },
            'zig': {
                'cash_sales': float(zig_cash_sales),
                'card_sales': float(zig_card_sales),
                'ecocash_sales': float(zig_ecocash_sales),
                'transfer_sales': float(zig_transfer_sales),
                'total_sales': float(zig_cash_sales + zig_card_sales + zig_ecocash_sales + zig_transfer_sales)
            },
            'rand': {
                'cash_sales': float(rand_cash_sales),
                'card_sales': float(rand_card_sales),
                'ecocash_sales': float(rand_ecocash_sales),
                'transfer_sales': float(rand_transfer_sales),
                'total_sales': float(rand_cash_sales + rand_card_sales + rand_ecocash_sales + rand_transfer_sales)
            }
        }
        
        reconciliation_data['overall_summary'] = {
            'total_transactions': total_sales,
            'total_revenue': float(total_revenue),
            'expected_totals': {
                'cash': total_cash_expected,
                'card': total_card_expected,
                'ecocash': total_ecocash_expected
            }
        }
        
        reconciliation_data['sales_summary'] = {
            'total_sales': total_sales,
            'total_transactions': total_sales,
            'cash_sales': float(gross_cash_sales),
            'card_sales': float(gross_card_sales),
            'ecocash_sales': float(gross_ecocash_sales),
            'cash_refunds': float(cash_refunds),
            'card_refunds': float(card_refunds),
            'ecocash_refunds': float(ecocash_refunds),
            'net_cash_sales': net_cash_sales,
            'net_card_sales': net_card_sales,
            'net_ecocash_sales': net_ecocash_sales,
            'total_refunds': float(cash_refunds + card_refunds + ecocash_refunds),
            'net_total': float(net_cash_sales + net_card_sales + net_ecocash_sales)
        }
        
        # Add multi-currency breakdown to response
        reconciliation_data['sales_by_currency'] = sales_by_currency
        
        reconciliation_data['expected_cash'] = {
            'opening_float': sum(float(shift.opening_balance) for shift in today_shifts),
            'cash_sales': float(gross_cash_sales),
            'cash_refunds': float(cash_refunds),
            'expected_total': float(total_cash_expected)
        }
        
        reconciliation_data['discrepancies'] = {
            'overage': 0,  # Will be calculated by frontend based on actual vs expected
            'shortage': 0,  # Will be calculated by frontend based on actual vs expected
            'variance': 0   # Will be calculated by frontend based on actual vs expected
        }
        
        return Response(reconciliation_data, status=status.HTTP_200_OK)
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Process EOD reconciliation
        shift_id = request.data.get('shift_id')
        closing_balance = request.data.get('closing_balance', 0)
        notes = request.data.get('notes', '')
        
        if not shift_id:
            return Response({"error": "Shift ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shift = Shift.objects.get(id=shift_id, shop=shop)
        except Shift.DoesNotExist:
            return Response({"error": "Shift not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if not shift.is_active:
            return Response({"error": "Shift is already closed"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Close the shift
        shift.closing_balance = closing_balance
        shift.is_active = False
        shift.notes = notes
        shift.save()
        
        return Response({
            'message': 'EOD reconciliation completed successfully',
            'shift_id': shift.id,
            'closing_balance': float(shift.closing_balance),
            'cash_difference': float(shift.closing_balance) - (float(shift.opening_balance) + float(shift.cash_sales))
        }, status=status.HTTP_200_OK)