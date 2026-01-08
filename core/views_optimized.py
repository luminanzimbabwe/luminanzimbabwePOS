"""
Optimized Product API Views for Better Performance
Implements pagination, server-side filtering, and search optimizations
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import models
from django.db.models import Q
from .models import ShopConfiguration, Product
from .serializers import ProductSerializer
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class OptimizedProductListView(APIView):
    """
    Optimized product list with pagination, server-side filtering, and search
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Get products with pagination and server-side filtering"""
        try:
            shop = ShopConfiguration.objects.get()
            
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 50)), 100)  # Max 100 per page
            search = request.GET.get('search', '').strip()
            category = request.GET.get('category', '').strip()
            sort_by = request.GET.get('sort_by', 'name')  # name, price, stock_quantity, updated_at
            sort_order = request.GET.get('sort_order', 'asc')  # asc, desc
            
            # Start with base queryset
            queryset = Product.objects.filter(shop=shop, is_active=True)
            
            # Apply search filter (server-side for better performance)
            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(line_code__icontains=search) |
                    Q(barcode__icontains=search) |
                    Q(category__icontains=search) |
                    Q(additional_barcodes__icontains=search)
                )
            
            # Apply category filter
            if category and category != 'all':
                queryset = queryset.filter(category__iexact=category)
            
            # Apply sorting
            if sort_by in ['name', 'price', 'stock_quantity', 'updated_at', 'created_at']:
                order_field = sort_by
                if sort_order == 'desc':
                    order_field = f'-{order_field}'
                queryset = queryset.order_by(order_field)
            
            # Get total count for pagination
            total_count = queryset.count()
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            products = queryset[start_index:end_index]
            
            # Serialize products
            serializer = ProductSerializer(products, many=True)
            
            # Calculate pagination metadata
            total_pages = (total_count + page_size - 1) // page_size  # Ceiling division
            has_next = page < total_pages
            has_previous = page > 1
            
            return Response({
                'success': True,
                'data': serializer.data,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'page_size': page_size,
                    'has_next': has_next,
                    'has_previous': has_previous,
                    'next_page': page + 1 if has_next else None,
                    'previous_page': page - 1 if has_previous else None
                },
                'filters': {
                    'search': search,
                    'category': category,
                    'sort_by': sort_by,
                    'sort_order': sort_order
                }
            })
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in optimized product list: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ProductCategoriesView(APIView):
    """
    Get all unique categories for filtering (cached for performance)
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Get all unique categories"""
        try:
            shop = ShopConfiguration.objects.get()
            
            # Get unique categories with product counts
            categories = Product.objects.filter(
                shop=shop, 
                is_active=True
            ).exclude(
                category__isnull=True
            ).exclude(
                category__exact=''
            ).values(
                'category'
            ).annotate(
                product_count=models.Count('id')
            ).order_by('category')
            
            # Format response
            category_list = []
            total_products = 0
            
            for cat in categories:
                category_list.append({
                    'name': cat['category'],
                    'product_count': cat['product_count']
                })
                total_products += cat['product_count']
            
            return Response({
                'success': True,
                'data': {
                    'categories': category_list,
                    'total_categories': len(category_list),
                    'total_products': total_products
                }
            })
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting categories: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ProductSearchView(APIView):
    """
    Fast product search with autocomplete suggestions
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Search products with autocomplete"""
        try:
            shop = ShopConfiguration.objects.get()
            query = request.GET.get('q', '').strip()
            limit = min(int(request.GET.get('limit', 10)), 50)
            
            if not query or len(query) < 2:
                return Response({
                    'success': True,
                    'data': {'suggestions': [], 'products': []}
                })
            
            # Search in multiple fields for better results
            products = Product.objects.filter(
                shop=shop,
                is_active=True
            ).filter(
                Q(name__icontains=query) |
                Q(line_code__icontains=query) |
                Q(barcode__icontains=query)
            ).order_by('name')[:limit]
            
            # Generate search suggestions
            suggestions = []
            product_names = set()
            
            for product in products:
                # Add product name suggestions
                if query.lower() in product.name.lower():
                    if product.name not in product_names:
                        suggestions.append({
                            'type': 'product',
                            'text': product.name,
                            'category': product.category
                        })
                        product_names.add(product.name)
                
                # Add category suggestions
                if product.category and query.lower() in product.category.lower():
                    suggestions.append({
                        'type': 'category',
                        'text': product.category,
                        'category': product.category
                    })
            
            # Remove duplicates and limit suggestions
            unique_suggestions = []
            seen_texts = set()
            for suggestion in suggestions:
                if suggestion['text'] not in seen_texts:
                    unique_suggestions.append(suggestion)
                    seen_texts.add(suggestion['text'])
                    
                if len(unique_suggestions) >= 10:
                    break
            
            # Serialize products
            serializer = ProductSerializer(products, many=True)
            
            return Response({
                'success': True,
                'data': {
                    'suggestions': unique_suggestions,
                    'products': serializer.data,
                    'query': query,
                    'result_count': len(products)
                }
            })
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in product search: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ProductStatsView(APIView):
    """
    Get product statistics for dashboard
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Get product statistics"""
        try:
            shop = ShopConfiguration.objects.get()
            
            # Get basic counts
            total_products = Product.objects.filter(shop=shop, is_active=True).count()
            low_stock_products = Product.objects.filter(
                shop=shop, 
                is_active=True,
                stock_quantity__lte=models.F('min_stock_level')
            ).count()
            out_of_stock_products = Product.objects.filter(
                shop=shop, 
                is_active=True,
                stock_quantity=0
            ).count()
            negative_stock_products = Product.objects.filter(
                shop=shop, 
                is_active=True,
                stock_quantity__lt=0
            ).count()
            
            # Get category breakdown
            category_stats = Product.objects.filter(
                shop=shop, 
                is_active=True
            ).exclude(
                category__isnull=True
            ).exclude(
                category__exact=''
            ).values(
                'category'
            ).annotate(
                count=models.Count('id'),
                low_stock=models.Count('id', filter=models.Q(stock_quantity__lte=models.F('min_stock_level'))),
                out_of_stock=models.Count('id', filter=models.Q(stock_quantity=0))
            ).order_by('-count')
            
            return Response({
                'success': True,
                'data': {
                    'total_products': total_products,
                    'low_stock_products': low_stock_products,
                    'out_of_stock_products': out_of_stock_products,
                    'negative_stock_products': negative_stock_products,
                    'categories': list(category_stats),
                    'last_updated': timezone.now().isoformat()
                }
            })
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting product stats: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)