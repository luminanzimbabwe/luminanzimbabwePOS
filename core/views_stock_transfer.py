# Add to core/views.py

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Product, StockTransfer, ShopConfiguration, Cashier
from .serializers import StockTransferSerializer, ProductSerializer

class StockTransferViewSet(viewsets.ViewSet):
    """ViewSet for Stock Transfer operations"""
    
    def list(self, request):
        """List all stock transfers for the shop"""
        try:
            # Get shop credentials from request
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            transfers = StockTransfer.objects.filter(shop=shop).order_by('-created_at')
            
            serializer = StockTransferSerializer(transfers, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        """Create a new stock transfer"""
        try:
            # Get shop credentials from request
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Get cashier from request
            cashier_id = request.headers.get('X-Cashier-ID')
            if not cashier_id:
                return Response({'error': 'Cashier ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            cashier = get_object_or_404(Cashier, id=cashier_id, shop=shop)
            
            # Extract transfer data from request
            data = request.data.copy()
            
            # Create transfer instance
            transfer = StockTransfer(
                shop=shop,
                transfer_type=data.get('transfer_type', 'CONVERSION'),
                from_line_code=data.get('from_line_code', ''),
                from_barcode=data.get('from_barcode', ''),
                from_quantity=float(data.get('from_quantity', 0)),
                to_line_code=data.get('to_line_code', ''),
                to_barcode=data.get('to_barcode', ''),
                to_quantity=float(data.get('to_quantity', 0)),
                reason=data.get('reason', ''),
                performed_by=cashier,
                notes=data.get('notes', '')
            )
            
            # Validate transfer
            errors = transfer.validate_transfer()
            if errors:
                return Response({
                    'success': False,
                    'error': 'Validation failed',
                    'details': errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find products if identifiers provided
            if transfer.from_line_code or transfer.from_barcode:
                identifier = transfer.from_line_code or transfer.from_barcode
                transfer.from_product = transfer._find_product_by_identifier(identifier)
            
            if transfer.to_line_code or transfer.to_barcode:
                identifier = transfer.to_line_code or transfer.to_barcode
                transfer.to_product = transfer._find_product_by_identifier(identifier)
            
            # Process the transfer
            success, messages = transfer.process_transfer()
            
            if success:
                serializer = StockTransferSerializer(transfer)
                return Response({
                    'success': True,
                    'message': 'Stock transfer completed successfully',
                    'data': serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'error': 'Transfer failed',
                    'details': messages
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def find_product(self, request):
        """Find a product by line code or barcode"""
        try:
            # Get shop credentials from request
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Get search identifier
            identifier = request.data.get('identifier', '').strip()
            if not identifier:
                return Response({
                    'success': False,
                    'error': 'Identifier (line code or barcode) required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
                serializer = ProductSerializer(product)
                return Response({
                    'success': True,
                    'data': {
                        'product': serializer.data,
                        'search_method': search_method,
                        'current_stock': float(product.stock_quantity or 0),
                        'stock_status': product.stock_status
                    }
                })
            else:
                return Response({
                    'success': False,
                    'error': f'Product not found with identifier: {identifier}'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def validate_transfer(self, request):
        """Validate a transfer without executing it"""
        try:
            # Get shop credentials from request
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Create temporary transfer for validation
            data = request.data.copy()
            transfer = StockTransfer(
                shop=shop,
                transfer_type=data.get('transfer_type', 'CONVERSION'),
                from_line_code=data.get('from_line_code', ''),
                from_barcode=data.get('from_barcode', ''),
                from_quantity=float(data.get('from_quantity', 0)),
                to_line_code=data.get('to_line_code', ''),
                to_barcode=data.get('to_barcode', ''),
                to_quantity=float(data.get('to_quantity', 0)),
                reason=data.get('reason', ''),
            )
            
            # Find products if identifiers provided
            if transfer.from_line_code or transfer.from_barcode:
                identifier = transfer.from_line_code or transfer.from_barcode
                transfer.from_product = transfer._find_product_by_identifier(identifier)
            
            if transfer.to_line_code or transfer.to_barcode:
                identifier = transfer.to_line_code or transfer.to_barcode
                transfer.to_product = transfer._find_product_by_identifier(identifier)
            
            # Validate transfer
            errors = transfer.validate_transfer()
            
            # Calculate conversion ratio
            conversion_ratio = transfer.calculate_conversion_ratio()
            
            return Response({
                'success': True,
                'is_valid': len(errors) == 0,
                'errors': errors,
                'conversion_ratio': float(conversion_ratio),
                'from_product_info': {
                    'name': transfer.from_product.name if transfer.from_product else 'Not found',
                    'current_stock': float(transfer.from_product.stock_quantity or 0) if transfer.from_product else 0,
                    'line_code': transfer.from_line_code,
                    'barcode': transfer.from_barcode
                } if transfer.from_product or transfer.from_line_code or transfer.from_barcode else None,
                'to_product_info': {
                    'name': transfer.to_product.name if transfer.to_product else 'Not found',
                    'current_stock': float(transfer.to_product.stock_quantity or 0) if transfer.to_product else 0,
                    'line_code': transfer.to_line_code,
                    'barcode': transfer.to_barcode
                } if transfer.to_product or transfer.to_line_code or transfer.to_barcode else None
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)