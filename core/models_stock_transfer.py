# Add this to core/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class StockTransfer(models.Model):
    """
    Stock Transfer/Adjustment Model
    Tracks movements of stock between products or within the same product
    """
    TRANSFER_TYPES = [
        ('CONVERSION', 'Product Conversion'),
        ('TRANSFER', 'Transfer Between Products'),
        ('ADJUSTMENT', 'Stock Adjustment'),
        ('SPLIT', 'Product Splitting'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    transfer_type = models.CharField(max_length=20, choices=TRANSFER_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Transfer details
    from_product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='transfers_from', null=True, blank=True)
    from_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    from_line_code = models.CharField(max_length=100, blank=True)
    from_barcode = models.CharField(max_length=100, blank=True)
    
    to_product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='transfers_to', null=True, blank=True)
    to_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    to_line_code = models.CharField(max_length=100, blank=True)
    to_barcode = models.CharField(max_length=100, blank=True)
    
    # Conversion details (e.g., 1 loaf → 2 half-loaves)
    conversion_ratio = models.DecimalField(max_digits=10, decimal_places=4, default=1.0)
    
    # Financial details
    cost_impact = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    reason = models.TextField(blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'transfer_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_transfer_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def get_from_product_display(self):
        """Get display name for source product"""
        if self.from_product:
            return f"{self.from_product.name} ({self.from_line_code or self.from_barcode})"
        return f"Unknown ({self.from_line_code or self.from_barcode})"
    
    def get_to_product_display(self):
        """Get display name for destination product"""
        if self.to_product:
            return f"{self.to_product.name} ({self.to_line_code or self.to_barcode})"
        return f"Unknown ({self.to_line_code or self.to_barcode})"
    
    def calculate_conversion_ratio(self):
        """Calculate the conversion ratio based on quantities"""
        if self.from_quantity > 0 and self.to_quantity > 0:
            self.conversion_ratio = self.to_quantity / self.from_quantity
            return self.conversion_ratio
        return 1.0
    
    def validate_transfer(self):
        """Validate if the transfer can be processed"""
        errors = []
        
        # Check if from product exists
        if not self.from_product and not (self.from_line_code or self.from_barcode):
            errors.append("Source product must be specified")
        
        # Check if to product exists
        if not self.to_product and not (self.to_line_code or self.to_barcode):
            errors.append("Destination product must be specified")
        
        # Check quantities
        if self.from_quantity <= 0:
            errors.append("Source quantity must be greater than 0")
        
        if self.to_quantity <= 0:
            errors.append("Destination quantity must be greater than 0")
        
        # Check if we have enough stock for transfer (if applicable)
        if self.from_product and self.from_quantity > 0:
            current_stock = float(self.from_product.stock_quantity) if self.from_product.stock_quantity else 0
            if current_stock < float(self.from_quantity):
                errors.append(f"Insufficient stock. Available: {current_stock}, Required: {self.from_quantity}")
        
        return errors
    
    def process_transfer(self):
        """Execute the stock transfer"""
        if self.status != 'PENDING':
            return False, ["Transfer is not in pending status"]
        
        # Validate transfer
        errors = self.validate_transfer()
        if errors:
            return False, errors
        
        try:
            # Find products if not already set
            if not self.from_product and (self.from_line_code or self.from_barcode):
                self.from_product = self._find_product_by_identifier(self.from_line_code or self.from_barcode)
            
            if not self.to_product and (self.to_line_code or self.to_barcode):
                self.to_product = self._find_product_by_identifier(self.to_line_code or self.to_barcode)
            
            # Process the transfer
            with transaction.atomic():
                # Deduct from source product
                if self.from_product and self.from_quantity > 0:
                    old_from_stock = float(self.from_product.stock_quantity) or 0
                    new_from_stock = old_from_stock - float(self.from_quantity)
                    self.from_product.stock_quantity = new_from_stock
                    self.from_product.save()
                
                # Add to destination product
                if self.to_product and self.to_quantity > 0:
                    old_to_stock = float(self.to_product.stock_quantity) or 0
                    new_to_stock = old_to_stock + float(self.to_quantity)
                    self.to_product.stock_quantity = new_to_stock
                    self.to_product.save()
                
                # Calculate conversion ratio
                self.calculate_conversion_ratio()
                
                # Mark as completed
                self.status = 'COMPLETED'
                self.completed_at = timezone.now()
                self.save()
                
                return True, ["Transfer completed successfully"]
                
        except Exception as e:
            return False, [f"Error processing transfer: {str(e)}"]
    
    def _find_product_by_identifier(self, identifier):
        """Find product by line code or barcode"""
        try:
            return Product.objects.get(line_code=identifier)
        except Product.DoesNotExist:
            try:
                return Product.objects.get(barcode=identifier)
            except Product.DoesNotExist:
                return None