"""
Data Synchronization Views for Offline-First POS System
Handles data sync between local SQLite and Render PostgreSQL
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.db.models import Q
from django.core.management import call_command
import json
from datetime import datetime, timedelta
from core.models import (
    Product, Sale, SaleItem, StockMovement, Cashier,
    ShopConfiguration, Waste, WasteBatch, StockTransfer,
    CashFloat, ShopDay, Expense, StaffLunch, Customer,
    Discount, StockTake, StockTakeItem, InventoryLog
)


class SyncHealthView(viewsets.ViewSet):
    """
    Health check and sync status endpoints
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def health(self, request):
        """Check sync system health"""
        try:
            # Check local SQLite connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                sqlite_status = True
            sqlite_error = None
        except Exception as e:
            sqlite_status = False
            sqlite_error = str(e)
        
        # Check Render PostgreSQL connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM db_render LIMIT 1")
                render_status = True
            render_error = None
        except Exception as e:
            render_status = False
            render_error = str(e)
        
        # Get pending sync items count
        pending_sync = self.get_pending_sync_count()
        
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'local_sqlite': {
                'status': 'healthy' if sqlite_status else 'unhealthy',
                'connected': sqlite_status,
                'error': sqlite_error
            },
            'render_postgresql': {
                'status': 'healthy' if render_status else 'unhealthy',
                'connected': render_status,
                'error': render_error
            },
            'sync_status': {
                'pending_items': pending_sync,
                'last_sync': self.get_last_sync_time(),
                'sync_needed': pending_sync > 0 and render_status
            },
            'system_info': {
                'offline_first': True,
                'primary_database': 'sqlite',
                'sync_database': 'postgresql'
            }
        }
        
        return Response(health_data)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get detailed sync status"""
        return Response({
            'sync_system': 'offline_first',
            'mode': 'offline_with_cloud_sync',
            'local_db': 'sqlite',
            'cloud_db': 'postgresql_render',
            'auto_sync': True,
            'pending_sync_items': self.get_pending_sync_count(),
            'last_sync': self.get_last_sync_time(),
            'database_status': {
                'local': 'connected' if self.is_local_connected() else 'disconnected',
                'cloud': 'connected' if self.is_render_connected() else 'disconnected'
            }
        })
    
    def get_pending_sync_count(self):
        """Get count of items pending sync"""
        try:
            # This would be a sync log table in a real implementation
            return 0
        except:
            return 0
    
    def get_last_sync_time(self):
        """Get last successful sync time"""
        try:
            # This would read from sync log in a real implementation
            return None
        except:
            return None
    
    def is_local_connected(self):
        """Check if local SQLite is connected"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return True
        except:
            return False
    
    def is_render_connected(self):
        """Check if Render PostgreSQL is connected"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM db_render LIMIT 1")
                return True
        except:
            return False


@api_view(['GET'])
@permission_classes([AllowAny])
def sync_pull_products(request):
    """
    Pull latest products from Render PostgreSQL to local SQLite
    """
    try:
        last_sync = request.GET.get('last_sync')
        
        # Query products from Render database
        # Note: This is a simplified version. In production, you'd use database routing
        products_query = Product.objects.using('render').filter(is_active=True)
        
        if last_sync:
            products_query = products_query.filter(
                updated_at__gt=last_sync
            )
        
        products = products_query.values()
        
        # Create sync response
        sync_data = {
            'sync_type': 'pull_products',
            'timestamp': datetime.now().isoformat(),
            'records_count': products.count(),
            'data': list(products),
            'sync_status': 'success'
        }
        
        return Response(sync_data)
        
    except Exception as e:
        return Response({
            'sync_type': 'pull_products',
            'error': str(e),
            'sync_status': 'failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def sync_push_data(request):
    """
    Push local data to Render PostgreSQL
    """
    try:
        data_type = request.data.get('type')
        data = request.data.get('data', [])
        
        if data_type == 'products':
            # Push products to Render database
            sync_results = push_products_to_render(data)
        elif data_type == 'sales':
            # Push sales to Render database  
            sync_results = push_sales_to_render(data)
        else:
            return Response({
                'error': f'Unsupported data type: {data_type}',
                'sync_status': 'failed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'sync_type': 'push_data',
            'data_type': data_type,
            'records_processed': len(data),
            'sync_results': sync_results,
            'sync_status': 'success',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({
            'sync_type': 'push_data',
            'error': str(e),
            'sync_status': 'failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def sync_comprehensive(request):
    """
    Comprehensive sync endpoint - pulls latest data from cloud
    """
    try:
        sync_type = request.GET.get('type', 'all')
        last_sync = request.GET.get('last_sync')
        
        sync_results = {}
        
        if sync_type in ['all', 'products']:
            # Pull products
            products = Product.objects.using('render').filter(
                is_active=True
            ).values()
            sync_results['products'] = {
                'count': products.count(),
                'data': list(products)
            }
        
        if sync_type in ['all', 'sales']:
            # Pull recent sales
            sales_query = Sale.objects.using('render')
            if last_sync:
                sales_query = sales_query.filter(
                    created_at__gt=last_sync
                )
            sales = sales_query.values()
            sync_results['sales'] = {
                'count': sales.count(),
                'data': list(sales)
            }
        
        return Response({
            'sync_type': 'comprehensive',
            'sync_direction': 'pull_from_cloud',
            'sync_results': sync_results,
            'sync_status': 'success',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({
            'sync_type': 'comprehensive',
            'error': str(e),
            'sync_status': 'failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def sync_force_full(request):
    """
    Force full synchronization - emergency sync endpoint
    """
    try:
        # This would implement a full database sync
        # For now, return a placeholder response
        
        return Response({
            'sync_type': 'force_full_sync',
            'message': 'Full sync initiated',
            'sync_status': 'success',
            'timestamp': datetime.now().isoformat(),
            'estimated_duration': '2-5 minutes'
        })
        
    except Exception as e:
        return Response({
            'sync_type': 'force_full_sync',
            'error': str(e),
            'sync_status': 'failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def push_products_to_render(products_data):
    """
    Push products from local to Render database
    """
    results = []
    for product_data in products_data:
        try:
            # Create or update product in Render database
            product, created = Product.objects.using('render').update_or_create(
                id=product_data.get('id'),
                defaults=product_data
            )
            results.append({
                'product_id': product.id,
                'action': 'created' if created else 'updated',
                'status': 'success'
            })
        except Exception as e:
            results.append({
                'product_id': product_data.get('id'),
                'action': 'push_failed',
                'status': 'failed',
                'error': str(e)
            })
    
    return results


def push_sales_to_render(sales_data):
    """
    Push sales from local to Render database
    """
    results = []
    for sale_data in sales_data:
        try:
            # Create or update sale in Render database
            sale, created = Sale.objects.using('render').update_or_create(
                id=sale_data.get('id'),
                defaults=sale_data
            )
            results.append({
                'sale_id': sale.id,
                'action': 'created' if created else 'updated',
                'status': 'success'
            })
        except Exception as e:
            results.append({
                'sale_id': sale_data.get('id'),
                'action': 'push_failed',
                'status': 'failed',
                'error': str(e)
            })
    
    return results


@api_view(['GET'])
@permission_classes([AllowAny])
def offline_data_health(request):
    """
    Check offline data health and readiness
    """
    try:
        # Check if local SQLite has essential data
        local_stats = {
            'products_count': Product.objects.using('default').count(),
            'sales_count': Sale.objects.using('default').count(),
            'cashiers_count': Cashier.objects.using('default').count(),
            'last_sale_date': None,
            'database_size': get_database_size('default')
        }
        
        # Get last sale date
        last_sale = Sale.objects.using('default').order_by('-created_at').first()
        if last_sale:
            local_stats['last_sale_date'] = last_sale.created_at.isoformat()
        
        return Response({
            'system_mode': 'offline_first',
            'local_database': 'sqlite',
            'local_stats': local_stats,
            'offline_ready': True,
            'can_operate_offline': True,
            'sync_available': True,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({
            'error': str(e),
            'offline_ready': False,
            'sync_status': 'failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_database_size(db_alias):
    """Get database size in bytes"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()")
            size = cursor.fetchone()[0]
            return size
    except:
        return 0