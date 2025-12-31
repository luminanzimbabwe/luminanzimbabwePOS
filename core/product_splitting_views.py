# Add to core/views.py

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Product, ShopConfiguration
from .serializers import ProductSerializer

class ProductSplittingViewSet(viewsets.ViewSet):
    """ViewSet for Product Splitting operations"""
    
    def create_split_product(self, request):
        """Create a new product by splitting an existing product in half"""
        try:
            # Get shop credentials from request
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Get the source product ID from request data
            source_product_id = request.data.get('source_product_id')
            if not source_product_id:
                return Response({'error': 'Source product ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the source product
            source_product = get_object_or_404(Product, id=source_product_id, shop=shop)
            
            # Generate new product data
            new_product_data = self._generate_split_product_data(source_product)
            
            # Create the new product
            new_product = Product.objects.create(
                shop=shop,
                name=new_product_data['name'],
                description=new_product_data['description'],
                price=new_product_data['price'],  # User can set this manually
                cost_price=new_product_data['cost_price'],  # Automatically calculated
                currency=source_product.currency,
                price_type=source_product.price_type,
                category=source_product.category,
                barcode=new_product_data['barcode'],
                line_code=new_product_data['line_code'],
                additional_barcodes=[],
                stock_quantity=new_product_data['stock_quantity'],  # Start with 0
                min_stock_level=source_product.min_stock_level,
                supplier=source_product.supplier,
                supplier_invoice=source_product.supplier_invoice,
                receiving_notes=f"Split from {source_product.name} (ID: {source_product.id})",
                is_active=True
            )
            
            # Serialize and return the new product
            serializer = ProductSerializer(new_product)
            return Response({
                'success': True,
                'message': f'Successfully created {new_product.name}',
                'data': serializer.data,
                'source_product': {
                    'id': source_product.id,
                    'name': source_product.name,
                    'cost_price': float(source_product.cost_price)
                },
                'split_product': {
                    'id': new_product.id,
                    'name': new_product.name,
                    'cost_price': float(new_product.cost_price),
                    'auto_calculated': True
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to create split product: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_split_product_data(self, source_product):
        """Generate data for the new split product"""
        # Generate new name
        source_name = source_product.name
        
        # Common splitting patterns
        split_patterns = [
            ('full', 'half'),
            ('whole', 'half'),
            ('large', 'small'),
            ('regular', 'small'),
            ('standard', 'mini'),
            ('classic', 'mini'),
            ('normal', 'small'),
            ('big', 'small'),
            ('xl', 'regular'),
            ('medium', 'small')
        ]
        
        # Try to create a logical half product name
        new_name = None
        for full_word, half_word in split_patterns:
            if full_word.lower() in source_name.lower():
                new_name = source_name.lower().replace(full_word.lower(), half_word)
                break
        
        # If no pattern matches, just add "Half" prefix
        if not new_name:
            if source_name.lower().startswith('half'):
                new_name = f"Quarter {source_name[5:]}"  # If already half, make quarter
            else:
                new_name = f"Half {source_name}"
        
        # Capitalize properly
        new_name = ' '.join(word.capitalize() for word in new_name.split())
        
        # Generate new barcode and line code
        new_barcode = f"{source_product.barcode or source_product.line_code}H"
        new_line_code = f"{source_product.line_code}H"
        
        # Calculate cost price (automatically - this is the key feature!)
        original_cost_price = float(source_product.cost_price or 0)
        new_cost_price = original_cost_price / 2  # Half the cost price
        
        return {
            'name': new_name,
            'description': f"Split from {source_product.name}. Automatically calculated cost price.",
            'price': source_product.price / 2,  # Start with half the selling price too
            'cost_price': new_cost_price,  # Automatically calculated
            'barcode': new_barcode,
            'line_code': new_line_code,
            'stock_quantity': 0  # New product starts with 0 stock
        }
    
    @action(detail=False, methods=['post'])
    def validate_split(self, request):
        """Validate if a product can be split"""
        try:
            shop_id = request.headers.get('X-Shop-ID')
            if not shop_id:
                return Response({'error': 'Shop ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            source_product_id = request.data.get('source_product_id')
            if not source_product_id:
                return Response({'error': 'Source product ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            source_product = get_object_or_404(Product, id=source_product_id, shop=shop)
            
            # Validation checks
            validation_result = self._validate_split_possibility(source_product)
            
            # Generate preview of what the new product would look like
            new_product_data = self._generate_split_product_data(source_product)
            
            return Response({
                'success': True,
                'can_split': validation_result['can_split'],
                'validation_errors': validation_result['errors'],
                'warnings': validation_result['warnings'],
                'preview': {
                    'source_product': {
                        'id': source_product.id,
                        'name': source_product.name,
                        'cost_price': float(source_product.cost_price),
                        'price': float(source_product.price),
                        'stock_quantity': float(source_product.stock_quantity)
                    },
                    'new_product': {
                        'name': new_product_data['name'],
                        'cost_price': new_product_data['cost_price'],
                        'price': new_product_data['price'],
                        'line_code': new_product_data['line_code'],
                        'barcode': new_product_data['barcode']
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Validation failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _validate_split_possibility(self, source_product):
        """Validate if a product can be split"""
        errors = []
        warnings = []
        can_split = True
        
        # Check if product has cost price
        if float(source_product.cost_price or 0) <= 0:
            warnings.append("Source product has $0.00 cost price. Split product will also have $0.00 cost price.")
        
        # Check if product is active
        if not source_product.is_active:
            errors.append("Source product is not active.")
            can_split = False
        
        # Check if product has stock
        if float(source_product.stock_quantity or 0) <= 0:
            warnings.append("Source product has no stock. Split product will start with 0 stock.")
        
        # Check for duplicate names (basic check)
        existing_half_products = Product.objects.filter(
            shop=source_product.shop,
            name__icontains='half',
            category=source_product.category
        ).exclude(id=source_product.id)
        
        if existing_half_products.exists():
            warnings.append(f"Found {existing_half_products.count()} existing 'half' products in the same category.")
        
        return {
            'can_split': can_split,
            'errors': errors,
            'warnings': warnings
        }