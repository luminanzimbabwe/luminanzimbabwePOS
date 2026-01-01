import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from decimal import Decimal

# Forward declaration to avoid circular import
from django.apps import apps
def get_stock_movement_model():
    return apps.get_model('core', 'StockMovement')

class ShopConfiguration(models.Model):
    shop_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    register_id = models.CharField(max_length=5, unique=True)
    name = models.CharField(max_length=255)
    address = models.TextField()
    business_type = models.CharField(max_length=100, default='', help_text="e.g., Retail, Wholesale, Service")
    industry = models.CharField(max_length=100, default='', help_text="e.g., Grocery, Electronics, Clothing")
    description = models.TextField(blank=True, help_text="Optional business description")
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    password = models.CharField(max_length=255)  # hashed
    registered_at = models.DateTimeField(auto_now_add=True)
    
    # Additional generated identifiers and credentials
    device_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    owner_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    api_key = models.CharField(max_length=100, unique=True, blank=True, null=True)
    shop_owner_master_password = models.CharField(max_length=255, blank=True, null=True, help_text="Master password for individual shop owner account recovery")
    recovery_codes = models.JSONField(default=list, blank=True, help_text="List of 8 recovery codes for shop owner")
    version = models.CharField(max_length=20, default='1.0.0')
    checksum = models.CharField(max_length=50, blank=True, null=True)
    registration_time = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Shop Configuration"
        verbose_name_plural = "Shop Configuration"

    def __str__(self):
        return self.name

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(self.password, raw_password)
    
    def save(self, *args, **kwargs):
        # Set registration time if not set
        if not self.registration_time:
            self.registration_time = timezone.now()
        super().save(*args, **kwargs)
    
    def validate_shop_owner_master_password(self, master_password):
        """Validate shop owner master password for individual shop recovery"""
        return self.shop_owner_master_password == master_password if self.shop_owner_master_password else False
    
    @staticmethod
    def validate_founder_credentials(username, password):
        """Validate founder credentials for super admin access"""
        # Founder credentials: username = "thisismeprivateisaacngirazi" with master password
        founder_username = "thisismeprivateisaacngirazi"
        founder_master_password = "morrill95@2001"  # Your master password
        
        return username == founder_username and password == founder_master_password
    
    def validate_recovery_code(self, recovery_code):
        """Validate if recovery code is valid and unused"""
        if not self.recovery_codes:
            return False
        return recovery_code.upper() in [code.upper() for code in self.recovery_codes]
    
    def mark_recovery_code_used(self, recovery_code):
        """Mark a recovery code as used"""
        if self.recovery_codes and recovery_code.upper() in [code.upper() for code in self.recovery_codes]:
            # Remove the used code from the list
            self.recovery_codes = [code for code in self.recovery_codes if code.upper() != recovery_code.upper()]
            self.save()
            return True
        return False

class Product(models.Model):
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('ZIG', 'Zimbabwe Gold'),
    ]

    PRICE_TYPE_CHOICES = [
        ('unit', 'Per Unit'),
        ('kg', 'Per Kilogram'),
        ('g', 'Per Gram'),
        ('lb', 'Per Pound'),
        ('oz', 'Per Ounce'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    price_type = models.CharField(max_length=10, choices=PRICE_TYPE_CHOICES, default='unit')
    category = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=100, blank=True, help_text="Primary barcode for scanning during sales")
    line_code = models.CharField(max_length=100, blank=True, help_text="Auto-generated unique identifier")
    additional_barcodes = models.JSONField(default=list, blank=True, help_text="Additional barcodes for the same product (supports multiple barcodes per product)")
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    supplier = models.CharField(max_length=255, blank=True)
    supplier_invoice = models.CharField(max_length=255, blank=True, help_text="Last supplier invoice number")
    receiving_notes = models.TextField(blank=True, help_text="Notes about receiving the product")
    is_active = models.BooleanField(default=True, help_text="Set to False to delist/hide product from main list")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.min_stock_level

    @property
    def stock_status(self):
        """Return stock status with business logic for negative stock"""
        if self.stock_quantity <= 0:
            return 'Out of Stock'
        elif self.stock_quantity <= self.min_stock_level:
            return 'Low Stock'
        elif self.stock_quantity > self.min_stock_level * 3:
            return 'Well Stocked'
        else:
            return 'Normal'

    @property
    def stock_value(self):
        """Stock value - never negative (business logic fix)"""
        return max(0, self.stock_quantity) * self.cost_price

    @property
    def actual_stock_quantity(self):
        """Return actual stock quantity, but ensure non-negative for reporting"""
        return max(0, self.stock_quantity)

    @property
    def profit_margin(self):
        if self.cost_price > 0:
            return ((self.price - self.cost_price) / self.cost_price) * 100
        return 0

    @classmethod
    def generate_random_line_code(cls):
        """Generate a random 8-digit line code"""
        import random
        import string
        while True:
            # Generate 8-digit random code
            code = ''.join([str(random.randint(0, 9)) for _ in range(8)])
            # Check if code already exists
            if not cls.objects.filter(line_code=code).exists():
                return code

    def save(self, *args, **kwargs):
        # Store previous stock for transition detection
        previous_stock = getattr(self, '_previous_stock', None)
        previous_cost_price = getattr(self, '_previous_cost_price', None)
        
        # Auto-generate line_code if not provided
        if not self.line_code:
            self.line_code = self.generate_random_line_code()
            
        # Call super save first to get the actual instance
        super().save(*args, **kwargs)
        
        # Check for stock transitions and create movement records
        if previous_stock is not None and previous_stock != self.stock_quantity:
            self._create_stock_movement_record(previous_stock, self.stock_quantity, previous_cost_price)
            
        # Clear the stored previous values
        if hasattr(self, '_previous_stock'):
            delattr(self, '_previous_stock')
        if hasattr(self, '_previous_cost_price'):
            delattr(self, '_previous_cost_price')

    def _create_stock_movement_record(self, previous_stock, new_stock, previous_cost_price):
        """Create a stock movement record when stock changes"""
        try:
            # Get StockMovement model dynamically to avoid circular import
            StockMovement = get_stock_movement_model()
            
            quantity_change = new_stock - previous_stock
            
            # Create StockMovement record
            StockMovement.objects.create(
                shop=self.shop,
                product=self,
                movement_type='ADJUSTMENT',  # Default, will be updated by save method
                previous_stock=previous_stock,
                quantity_change=quantity_change,
                new_stock=new_stock,
                cost_price=self.cost_price,
                notes=f'Stock transition: {previous_stock} -> {new_stock}',
                performed_by=None  # Will be set by the save method
            )
        except Exception as e:
            # Log error but don't fail the stock update
            print(f"Warning: Could not create stock movement record: {e}")
    
    def update_stock_with_movement(self, quantity_change, movement_type='ADJUSTMENT', 
                                 reference_number='', supplier_name='', notes='', performed_by=None):
        """Update stock and create movement record in one operation"""
        previous_stock = self.stock_quantity
        previous_cost_price = self.cost_price
        
        # Update stock
        self.stock_quantity += quantity_change
        
        # Create movement record
        StockMovement.objects.create(
            shop=self.shop,
            product=self,
            movement_type=movement_type,
            previous_stock=previous_stock,
            quantity_change=quantity_change,
            new_stock=self.stock_quantity,
            cost_price=self.cost_price,
            reference_number=reference_number,
            supplier_name=supplier_name,
            notes=notes,
            performed_by=performed_by
        )
        
        # Save the product
        self.save()
        
        return self.stock_quantity
    
    @property
    def stock_transition_info(self):
        """Get information about recent stock transitions"""
        try:
            StockMovement = get_stock_movement_model()
            latest_movement = StockMovement.objects.filter(product=self).latest('created_at')
            return {
                'latest_transition': latest_movement.transition_type,
                'latest_movement_date': latest_movement.created_at,
                'latest_stock_change': latest_movement.quantity_change,
                'is_recent_restock': latest_movement.is_restock_event,
                'transition_status': latest_movement.stock_status_change
            }
        except Exception:
            return {
                'latest_transition': 'NORMAL',
                'latest_movement_date': None,
                'latest_stock_change': 0,
                'is_recent_restock': False,
                'transition_status': self.stock_status
            }
    
    @property
    def needs_restock(self):
        """Check if product needs restocking (negative or very low stock)"""
        return self.stock_quantity <= 0 or self.is_low_stock
    
    @property
    def restock_priority(self):
        """Calculate restock priority score (higher = more urgent)"""
        if self.stock_quantity < 0:
            # Negative stock gets highest priority
            return abs(self.stock_quantity) * 10 + 100
        elif self.stock_quantity == 0:
            return 50
        elif self.is_low_stock:
            return (self.min_stock_level - self.stock_quantity) * 5
        else:
            return 0
    
    def get_restock_suggestion(self):
        """Get intelligent restock suggestion"""
        if self.stock_quantity < 0:
            # Suggest enough to clear oversell plus safety stock
            suggested_quantity = abs(self.stock_quantity) + self.min_stock_level
            return {
                'suggested_quantity': suggested_quantity,
                'reason': f'Clear oversell of {abs(self.stock_quantity)} units + safety stock',
                'priority': 'URGENT',
                'estimated_cost': suggested_quantity * self.cost_price
            }
        elif self.stock_quantity == 0:
            return {
                'suggested_quantity': self.min_stock_level * 2,
                'reason': 'Out of stock - need to reorder',
                'priority': 'HIGH',
                'estimated_cost': self.min_stock_level * 2 * self.cost_price
            }
        elif self.is_low_stock:
            return {
                'suggested_quantity': self.min_stock_level,
                'reason': f'Low stock - only {self.stock_quantity} units left',
                'priority': 'MEDIUM',
                'estimated_cost': self.min_stock_level * self.cost_price
            }
        else:
            return None

class Customer(models.Model):
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    loyalty_points = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"

    def __str__(self):
        return self.name

class Discount(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Discount"
        verbose_name_plural = "Discounts"

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_valid(self):
        now = timezone.now()
        return (self.is_active and
                self.valid_from <= now <= self.valid_until and
                (self.usage_limit is None or self.usage_count < self.usage_limit))

class ShopDay(models.Model):
    """
    Shop Day Management - Controls when the shop is open/closed
    Owner must start the day before any cashier can login
    """
    STATUS_CHOICES = [
        ('CLOSED', 'Shop Closed'),
        ('OPEN', 'Shop Open'),
        ('CLOSING', 'Shop Closing'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    date = models.DateField(unique=True, help_text="Business date")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CLOSED')
    opened_at = models.DateTimeField(null=True, blank=True, help_text="When shop was opened")
    closed_at = models.DateTimeField(null=True, blank=True, help_text="When shop was closed")
    opened_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, related_name='opened_shop_days', help_text="Who opened the shop")
    closed_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_shop_days', help_text="Who closed the shop")
    opening_notes = models.TextField(blank=True, help_text="Notes when opening")
    closing_notes = models.TextField(blank=True, help_text="Notes when closing")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Shop Day"
        verbose_name_plural = "Shop Days"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['shop', 'date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.shop.name} - {self.date} ({self.get_status_display()})"
    
    @property
    def is_open(self):
        return self.status == 'OPEN'
    
    @property
    def is_closed(self):
        return self.status == 'CLOSED'
    
    @property
    def duration(self):
        if self.opened_at and self.closed_at:
            return self.closed_at - self.opened_at
        elif self.opened_at:
            return timezone.now() - self.opened_at
        return None
    
    def open_shop(self, opened_by=None, notes=''):
        """Open the shop for business"""
        if self.status != 'CLOSED':
            raise ValueError("Shop can only be opened when closed")
        
        self.status = 'OPEN'
        self.opened_at = timezone.now()
        self.opened_by = opened_by
        self.opening_notes = notes
        self.save()
        # Ensure each active cashier has a CashFloat record for today (zeroed) so UI shows drawers
        try:
            from decimal import Decimal
            today = self.date
            active_cashiers = Cashier.objects.filter(shop=self.shop, status='active')
            for cashier in active_cashiers:
                try:
                    CashFloat.objects.get_or_create(
                        shop=self.shop,
                        cashier=cashier,
                        date=today,
                        defaults={
                            'float_amount': Decimal('0.00'),
                            'current_cash': Decimal('0.00'),
                            'current_card': Decimal('0.00'),
                            'current_ecocash': Decimal('0.00'),
                            'current_transfer': Decimal('0.00'),
                            'current_total': Decimal('0.00'),
                            'session_cash_sales': Decimal('0.00'),
                            'session_card_sales': Decimal('0.00'),
                            'session_ecocash_sales': Decimal('0.00'),
                            'session_transfer_sales': Decimal('0.00'),
                            'session_total_sales': Decimal('0.00'),
                            'expected_cash_at_eod': Decimal('0.00'),
                            'status': 'INACTIVE'
                        }
                    )
                except Exception:
                    continue
        except Exception:
            # Non-fatal: do not block opening the shop if float creation fails
            pass
        return self
    
    def close_shop(self, closed_by=None, notes=''):
        """Close the shop for business"""
        if self.status != 'OPEN':
            raise ValueError("Shop can only be closed when open")
        
        self.status = 'CLOSED'
        self.closed_at = timezone.now()
        self.closed_by = closed_by
        self.closing_notes = notes
        self.save()
        # At close of day, mark/clear all today's cash floats so the next day starts fresh.
        try:
            from decimal import Decimal
            today = self.date
            drawers = CashFloat.objects.filter(shop=self.shop, date=today)
            for d in drawers:
                try:
                    # Mark as settled and clear running totals to avoid showing previous day data
                    d.status = 'SETTLED'
                    d.current_cash = Decimal('0.00')
                    d.current_card = Decimal('0.00')
                    d.current_ecocash = Decimal('0.00')
                    d.current_transfer = Decimal('0.00')
                    d.current_total = Decimal('0.00')
                    d.session_cash_sales = Decimal('0.00')
                    d.session_card_sales = Decimal('0.00')
                    d.session_ecocash_sales = Decimal('0.00')
                    d.session_transfer_sales = Decimal('0.00')
                    d.session_total_sales = Decimal('0.00')
                    d.expected_cash_at_eod = Decimal('0.00')
                    d.save()
                except Exception:
                    continue
        except Exception:
            # Non-fatal: do not block closing the shop if drawer reset fails
            pass

        # Close all active shifts
        from django.db.models import Q
        active_shifts = Shift.objects.filter(
            shop=self.shop,
            start_time__date=self.date,
            is_active=True
        )
        
        for shift in active_shifts:
            shift.is_active = False
            shift.end_time = timezone.now()
            shift.save()
        
        return self
    
    @classmethod
    def get_current_day(cls, shop):
        """Get or create today's shop day"""
        today = timezone.now().date()
        shop_day, created = cls.objects.get_or_create(
            shop=shop,
            date=today,
            defaults={'status': 'CLOSED'}
        )
        return shop_day
    
    @classmethod
    def is_shop_open(cls, shop):
        """Check if shop is currently open"""
        today = timezone.now().date()
        try:
            shop_day = cls.objects.get(shop=shop, date=today)
            return shop_day.is_open
        except cls.DoesNotExist:
            return False

class Shift(models.Model):
    cashier = models.ForeignKey('Cashier', on_delete=models.CASCADE)
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ecocash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Shift"
        verbose_name_plural = "Shifts"

    def __str__(self):
        return f"{self.cashier.name} - {self.start_time.date()}"

    @property
    def duration(self):
        if self.end_time:
            return self.end_time - self.start_time
        return timezone.now() - self.start_time

    @property
    def expected_balance(self):
        return self.opening_balance + self.cash_sales

class Sale(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('ecocash', 'EcoCash'),
        ('card', 'Card'),
        ('transfer', 'Bank Transfer'),
    ]

    REFUND_TYPE_CHOICES = [
        ('cash', 'Cash Refund'),
        ('credit', 'Store Credit'),
        ('replacement', 'Product Replacement'),
        ('exchange', 'Product Exchange'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    cashier = models.ForeignKey('Cashier', on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Product.CURRENCY_CHOICES, default='USD')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, default='completed', choices=[
        ('pending', 'Pending Confirmation'),
        ('completed', 'Completed'),
        ('refunded', 'Refunded')
    ])
    refund_reason = models.TextField(blank=True)
    refund_type = models.CharField(max_length=20, choices=REFUND_TYPE_CHOICES, blank=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, related_name='refunded_sales')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sale"
        verbose_name_plural = "Sales"

    def __str__(self):
        return f"Sale #{self.id}"

class SaleItem(models.Model):
    REFUND_TYPE_CHOICES = [
        ('cash', 'Cash Refund'),
        ('credit', 'Store Credit'),
        ('replacement', 'Product Replacement'),
        ('exchange', 'Product Exchange'),
    ]

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    refunded = models.BooleanField(default=False)
    refund_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_reason = models.TextField(blank=True)
    refund_type = models.CharField(max_length=20, choices=REFUND_TYPE_CHOICES, blank=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, related_name='refunded_items')

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    @property
    def is_refunded(self):
        return self.refunded

    @property
    def remaining_quantity(self):
        """Quantity that hasn't been refunded"""
        return self.quantity - self.refund_quantity

    def refund_item(self, quantity, refund_type, reason='', refunded_by=None):
        """Refund a portion or all of this sale item"""
        if self.refunded:
            return False, "Item already fully refunded"

        if quantity > self.remaining_quantity:
            return False, f"Cannot refund {quantity} items, only {self.remaining_quantity} remaining"

        refund_amount = quantity * self.unit_price

        self.refund_quantity += quantity
        self.refund_type = refund_type
        self.refund_reason = reason
        self.refund_amount += refund_amount
        self.refunded_at = timezone.now()
        self.refunded_by = refunded_by

        # Mark as fully refunded if all quantity is refunded
        if self.refund_quantity >= self.quantity:
            self.refunded = True

        self.save()

        # Restore stock for refunded quantity
        self.product.stock_quantity += quantity
        self.product.save()

        return True, f"Successfully refunded {quantity} x {self.product.name}"

class Cashier(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('rejected', 'Rejected'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, help_text="Optional email for cashier")
    phone = models.CharField(max_length=20)
    password = models.CharField(max_length=255)  # hashed
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    preferred_shift = models.CharField(max_length=50, blank=True, help_text="Preferred shift (e.g., morning, afternoon, night)")
    role = models.CharField(max_length=50, default='cashier', help_text="Role of the cashier")
    
    # Enhanced HR Profile Fields
    # Personal Information
    gender = models.CharField(max_length=20, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ], blank=True, help_text="Gender")
    date_of_birth = models.DateField(null=True, blank=True, help_text="Date of birth")
    national_id = models.CharField(max_length=50, blank=True, help_text="National ID number")
    address = models.TextField(blank=True, help_text="Full address")
    emergency_contact_name = models.CharField(max_length=255, blank=True, help_text="Emergency contact name")
    emergency_contact_phone = models.CharField(max_length=20, blank=True, help_text="Emergency contact phone")
    
    # Employment Information
    employee_id = models.CharField(max_length=50, blank=True, help_text="Employee ID")
    department = models.CharField(max_length=100, blank=True, help_text="Department")
    position = models.CharField(max_length=100, blank=True, help_text="Job position/title")
    hire_date = models.DateField(null=True, blank=True, help_text="Date hired")
    
    # Compensation Information
    salary_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Salary amount")
    salary_currency = models.CharField(max_length=3, choices=[
        ('USD', 'US Dollar'),
        ('ZIG', 'Zimbabwe Gold'),
    ], default='USD', help_text="Currency for salary")
    payment_frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('bi_weekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
        ('hourly', 'Hourly'),
    ], blank=True, help_text="How often they get paid")
    pay_day = models.PositiveIntegerField(null=True, blank=True, help_text="Day of the month they get paid (1-31)")
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Hourly rate if applicable")
    
    # Additional Information
    notes = models.TextField(blank=True, help_text="Additional notes about the employee")
    profile_image = models.ImageField(upload_to='cashier_profiles/', null=True, blank=True, help_text="Profile photo")
    
    # System Fields
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_staff')

    class Meta:
        verbose_name = "Cashier"
        verbose_name_plural = "Cashiers"
        # Removed unique_together constraint to allow same names with different emails

    def __str__(self):
        return self.name

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        # Direct call to Django's check_password to avoid any method resolution issues
        from django.contrib.auth.hashers import check_password as django_check_password
        return django_check_password(raw_password, self.password)
    
    @property
    def is_active(self):
        """Return True if cashier status is active"""
        return self.status == 'active'
    
    def approve(self, approved_by=None, role='cashier'):
        """Approve this cashier and activate their account"""
        self.status = 'active'
        self.role = role
        self.approved_at = timezone.now()
        if approved_by:
            self.approved_by = approved_by
        self.save()

class Expense(models.Model):
    EXPENSE_TYPE_CHOICES = [
        ('supplies', 'Office/Store Supplies'),
        ('utilities', 'Utilities (Electricity, Water, etc.)'),
        ('rent', 'Rent/Mortgage'),
        ('marketing', 'Marketing/Advertising'),
        ('maintenance', 'Equipment Maintenance'),
        ('insurance', 'Insurance'),
        ('taxes', 'Taxes/Fees'),
        ('other', 'Other Expenses'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Product.CURRENCY_CHOICES, default='USD')
    recorded_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"

    def __str__(self):
        return f"{self.expense_type} - {self.amount} {self.currency}"

class StaffLunch(models.Model):
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Cost price at time of lunch
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Product.CURRENCY_CHOICES, default='USD')
    recorded_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Staff Lunch"
        verbose_name_plural = "Staff Lunches"

    def __str__(self):
        return f"Staff Lunch: {self.product.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        # Calculate total cost based on current cost price
        self.unit_price = self.product.cost_price
        self.total_cost = self.unit_price * self.quantity
        self.currency = self.product.currency

        # Reduce inventory
        if self.product.stock_quantity >= self.quantity:
            self.product.stock_quantity -= self.quantity
            self.product.save()
        else:
            raise ValueError(f"Insufficient stock for {self.product.name}")

        super().save(*args, **kwargs)

class StockTake(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, help_text="Name/description of the stock take")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    started_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='started_stock_takes')
    completed_by = models.ForeignKey(Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_stock_takes')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    total_products_counted = models.PositiveIntegerField(default=0)
    total_discrepancy_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock Take"
        verbose_name_plural = "Stock Takes"
        ordering = ['-started_at']

    def __str__(self):
        return f"Stock Take: {self.name} ({self.get_status_display()})"

    @property
    def duration(self):
        if self.completed_at:
            return self.completed_at - self.started_at
        return timezone.now() - self.started_at

    def complete_stock_take(self, completed_by=None):
        """Complete the stock take and calculate final discrepancies"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.completed_by = completed_by

        # Calculate total products counted and discrepancy value
        items = self.items.all()
        self.total_products_counted = items.count()

        total_discrepancy = 0
        # Get StockMovement model for creating movement records
        StockMovement = get_stock_movement_model()
        
        for item in items:
            discrepancy = item.counted_quantity - item.system_quantity
            item.discrepancy = discrepancy
            item.discrepancy_value = discrepancy * item.product.cost_price
            item.save()
            total_discrepancy += item.discrepancy_value
            
            # CRITICAL: Update actual product stock to match counted quantity
            if discrepancy != 0:  # Only update if there's a difference
                previous_stock = item.product.stock_quantity
                new_stock = item.counted_quantity
                
                # Update the product stock
                item.product.stock_quantity = new_stock
                item.product.save()
                
                # Create stock movement record for the adjustment
                try:
                    StockMovement.objects.create(
                        shop=self.shop,
                        product=item.product,
                        movement_type='STOCKTAKE',
                        previous_stock=previous_stock,
                        quantity_change=new_stock - previous_stock,
                        new_stock=new_stock,
                        cost_price=item.product.cost_price,
                        notes=f'Stock Take Adjustment: {previous_stock} -> {new_stock} (Counted: {item.counted_quantity})',
                        performed_by=completed_by
                    )
                except Exception as e:
                    print(f"Warning: Could not create stock movement record for {item.product.name}: {e}")

        self.total_discrepancy_value = total_discrepancy
        self.save()

class StockTakeItem(models.Model):
    stock_take = models.ForeignKey(StockTake, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    system_quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity in system at time of stock take")
    counted_quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity counted during stock take")
    discrepancy = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Difference between counted and system quantity")
    discrepancy_value = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Value of discrepancy based on cost price")
    notes = models.TextField(blank=True)
    counted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Stock Take Item"
        verbose_name_plural = "Stock Take Items"
        unique_together = ['stock_take', 'product']

    def __str__(self):
        return f"{self.product.name}: {self.counted_quantity} (System: {self.system_quantity})"

    @property
    def is_overstock(self):
        return self.discrepancy > 0

    @property
    def is_understock(self):
        return self.discrepancy < 0

    @property
    def is_exact_match(self):
        return self.discrepancy == 0

class InventoryLog(models.Model):
    REASON_CODE_CHOICES = [
        ('RECEIPT', 'Stock Receipt - New Delivery'),
        ('SALE', 'Stock Sale - Product Sold'),
        ('RETURN', 'Customer Return - Item Returned'),
        ('ADJUSTMENT', 'Manual Adjustment - Stock Count Correction'),
        ('DAMAGE', 'Damage/Spoilage - Items Damaged or Spoiled'),
        ('THEFT', 'Theft/Loss - Missing Items'),
        ('TRANSFER', 'Transfer - Stock Moved to/from Location'),
        ('STOCKTAKE', 'Stock Take - Physical Count Adjustment'),
        ('SUPPLIER_RETURN', 'Supplier Return - Returned to Supplier'),
        ('EXPIRED', 'Expired Items - Removed Due to Expiry'),
        ('OTHER', 'Other - Miscellaneous Reason'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    reason_code = models.CharField(max_length=20, choices=REASON_CODE_CHOICES)
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for additions, negative for deductions")
    previous_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    new_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True, help_text="Invoice number, transaction ID, etc.")
    notes = models.TextField(blank=True, help_text="Additional notes about the stock movement")
    performed_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, help_text="Who performed this stock movement")
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost price at time of movement")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Inventory Log"
        verbose_name_plural = "Inventory Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.get_reason_code_display()} ({self.quantity_change:+.2f})"

    @property
    def is_addition(self):
        return self.quantity_change > 0

    @property
    def is_deduction(self):
        return self.quantity_change < 0

    @property
    def movement_type(self):
        return "IN" if self.is_addition else "OUT"

    @property
    def total_value(self):
        return abs(self.quantity_change) * self.cost_price


class StockMovement(models.Model):
    """Enhanced stock movement tracking for professional inventory management"""
    
    MOVEMENT_TYPE_CHOICES = [
        ('SALE', 'Sale - Product Sold'),
        ('RECEIPT', 'Receipt - New Stock Received'),
        ('ADJUSTMENT', 'Adjustment - Manual Stock Correction'),
        ('RETURN', 'Return - Customer Return'),
        ('DAMAGE', 'Damage - Damaged/Spoiled Items'),
        ('THEFT', 'Theft - Missing Items'),
        ('TRANSFER', 'Transfer - Stock Movement'),
        ('STOCKTAKE', 'Stock Take - Physical Count'),
        ('SUPPLIER_RETURN', 'Supplier Return - Returned to Supplier'),
        ('EXPIRED', 'Expired - Removed Due to Expiry'),
        ('OTHER', 'Other - Miscellaneous'),
    ]
    
    TRANSITION_TYPE_CHOICES = [
        ('NORMAL', 'Normal Stock Movement'),
        ('NEGATIVE_TO_POSITIVE', 'Transition from Negative to Positive Stock'),
        ('POSITIVE_TO_NEGATIVE', 'Transition from Positive to Negative Stock'),
        ('RESTOCK', 'Restock of Oversold Items'),
        ('OVERSTOCK_CORRECTION', 'Overstock Correction'),
    ]

    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    transition_type = models.CharField(max_length=25, choices=TRANSITION_TYPE_CHOICES, default='NORMAL')
    
    # Stock quantity details
    previous_stock = models.DecimalField(max_digits=10, decimal_places=2, help_text="Stock quantity before movement")
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity added or removed (positive for additions)")
    new_stock = models.DecimalField(max_digits=10, decimal_places=2, help_text="Stock quantity after movement")
    
    # Financial details
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Cost price at time of movement")
    total_cost_value = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total value of stock movement (quantity × cost_price)")
    inventory_value_change = models.DecimalField(max_digits=12, decimal_places=2, help_text="Change in total inventory value")
    
    # Reference and tracking
    reference_number = models.CharField(max_length=100, blank=True, help_text="Invoice number, transaction ID, etc.")
    supplier_name = models.CharField(max_length=255, blank=True, help_text="Supplier name for receipts")
    notes = models.TextField(blank=True, help_text="Additional notes about the movement")
    
    # User tracking
    performed_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, help_text="Who performed this movement")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop', 'product', '-created_at']),
            models.Index(fields=['movement_type', '-created_at']),
            models.Index(fields=['transition_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.get_movement_type_display()} ({self.quantity_change:+.2f})"

    @property
    def is_addition(self):
        return self.quantity_change > 0

    @property
    def is_deduction(self):
        return self.quantity_change < 0

    @property
    def is_negative_to_positive_transition(self):
        return self.previous_stock < 0 and self.new_stock >= 0

    @property
    def is_positive_to_negative_transition(self):
        return self.previous_stock >= 0 and self.new_stock < 0

    @property
    def is_restock_event(self):
        return self.transition_type == 'RESTOCK' or self.is_negative_to_positive_transition

    @property
    def movement_direction(self):
        return "IN" if self.is_addition else "OUT"

    @property
    def stock_status_change(self):
        """Return the change in stock status (e.g., 'Out' → 'Low', 'Low' → 'OK')"""
        previous_status = self._get_stock_status(self.previous_stock)
        new_status = self._get_stock_status(self.new_stock)
        if previous_status != new_status:
            return f"{previous_status} -> {new_status}"
        return new_status

    def _get_stock_status(self, stock_quantity):
        """Helper method to determine stock status"""
        min_stock = self.product.min_stock_level if self.product else 5
        if stock_quantity <= 0:
            return "Out"
        elif stock_quantity <= min_stock:
            return "Low"
        else:
            return "OK"

    def save(self, *args, **kwargs):
        # Auto-calculate total cost value and inventory value change
        if not self.total_cost_value:
            self.total_cost_value = abs(self.quantity_change) * self.cost_price
        
        # Calculate inventory value change
        previous_inventory_value = max(0, self.previous_stock) * self.cost_price
        new_inventory_value = max(0, self.new_stock) * self.cost_price
        self.inventory_value_change = new_inventory_value - previous_inventory_value
        
        # Determine transition type automatically
        if self.is_negative_to_positive_transition:
            self.transition_type = 'NEGATIVE_TO_POSITIVE'
        elif self.is_positive_to_negative_transition:
            self.transition_type = 'POSITIVE_TO_NEGATIVE'
        elif self.is_addition and self.previous_stock < 0:
            self.transition_type = 'RESTOCK'
        elif self.is_deduction and self.previous_stock > self.product.min_stock_level and self.new_stock <= self.product.min_stock_level:
            self.transition_type = 'OVERSTOCK_CORRECTION'
        
        super().save(*args, **kwargs)


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
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
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
    shrinkage_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, help_text="Quantity lost due to shrinkage, damage, or processing loss")
    shrinkage_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, help_text="Financial value of shrinkage")
    from_product_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, help_text="Cost of source products")
    to_product_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, help_text="Cost of destination products")
    net_inventory_value_change = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, help_text="Change in total inventory value")
    reason = models.TextField(blank=True)
    
    # Tracking
    performed_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
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
        """Validate if the transfer can be processed with business impact analysis"""
        errors = []
        warnings = []
        print(f"DEBUG: Starting validation for transfer")
        
        # Check if from product exists
        if not self.from_product and not (self.from_line_code or self.from_barcode):
            errors.append("Source product must be specified")
        elif not self.from_product:
            # Try to find the from product
            identifier = self.from_line_code or self.from_barcode
            print(f"DEBUG: Attempting to find source product with identifier: {identifier}")
            self.from_product = self._find_product_by_identifier(identifier)
            if not self.from_product:
                errors.append(f"Source product not found: {identifier}")
            else:
                print(f"DEBUG: Source product found: {self.from_product.name}")
        
        # Check if to product exists
        if not self.to_product and not (self.to_line_code or self.to_barcode):
            errors.append("Destination product must be specified")
        elif not self.to_product:
            # For SPLIT operations, we'll create the product during processing
            if self.transfer_type == 'SPLIT':
                print(f"DEBUG: SPLIT operation - will create destination product during processing")
                # For SPLIT operations, we allow the product to not exist yet
                # It will be created in the process_transfer method
                pass
            else:
                # Try to find the to product for other transfer types
                identifier = self.to_line_code or self.to_barcode
                print(f"DEBUG: Attempting to find destination product with identifier: {identifier}")
                self.to_product = self._find_product_by_identifier(identifier)
                if not self.to_product:
                    errors.append(f"Destination product not found: {identifier}")
                else:
                    print(f"DEBUG: Destination product found: {self.to_product.name}")
        
        # COST VALIDATION - Now treated as WARNINGS (user can confirm)
        if self.from_product and float(self.from_product.cost_price) <= 0:
            warnings.append(f"WARNING: Source product '{self.from_product.name}' has $0.00 cost price. This will mask shrinkage losses!")
        
        if self.to_product and float(self.to_product.cost_price) <= 0:
            warnings.append(f"WARNING: Destination product '{self.to_product.name}' has $0.00 cost price. This will mask shrinkage losses!")
        
        # Check quantities
        if self.from_quantity <= 0:
            errors.append("Source quantity must be greater than 0")
        
        if self.to_quantity <= 0:
            errors.append("Destination quantity must be greater than 0")
        
        # Check if we have enough stock for transfer (if applicable)
        if self.from_product and self.from_quantity > 0:
            current_stock = float(self.from_product.stock_quantity) if self.from_product.stock_quantity else 0
            print(f"DEBUG: Source product stock check - Current: {current_stock}, Required: {self.from_quantity}")
            if current_stock < float(self.from_quantity):
                errors.append(f"Insufficient stock. Available: {current_stock}, Required: {self.from_quantity}")
        
        # SHRINKAGE DETECTION - Expected vs Actual Yield Analysis
        if self.from_product and self.to_product and self.from_quantity > 0 and self.to_quantity > 0:
            conversion_ratio = self.calculate_conversion_ratio()
            expected_yield = float(self.from_quantity) * float(conversion_ratio)
            actual_yield = float(self.to_quantity)
            
            print(f"DEBUG: Yield Analysis - Expected: {expected_yield}, Actual: {actual_yield}")
            
            # Calculate potential shrinkage
            if actual_yield < expected_yield:
                shrinkage_qty = expected_yield - actual_yield
                shrinkage_value = shrinkage_qty * float(self.to_product.cost_price)
                warnings.append(f"SHRINKAGE DETECTED: Expected {expected_yield} units but only {actual_yield} produced. Loss: {shrinkage_qty:.2f} units (${shrinkage_value:.2f})")
            elif actual_yield > expected_yield:
                surplus_qty = actual_yield - expected_yield
                surplus_value = surplus_qty * float(self.to_product.cost_price)
                warnings.append(f"SURPLUS DETECTED: Expected {expected_yield} units but produced {actual_yield}. Gain: {surplus_qty:.2f} units (${surplus_value:.2f})")
        
        print(f"DEBUG: Validation complete. Errors: {len(errors)}, Warnings: {len(warnings)}")
        for error in errors:
            print(f"DEBUG: Validation error: {error}")
        for warning in warnings:
            print(f"DEBUG: Validation warning: {warning}")
        
        return {
            'errors': errors,
            'warnings': warnings,
            'can_proceed': len(errors) == 0,  # Can proceed if no critical errors
            'has_warnings': len(warnings) > 0
        }
    
    def process_transfer(self):
        """Execute the stock transfer"""
        print(f"DEBUG: process_transfer called for transfer ID: {self.id}")
        print(f"DEBUG: Transfer status: {self.status}")
        print(f"DEBUG: Transfer type: {self.transfer_type}")
        
        if self.status != 'PENDING':
            print(f"DEBUG: Transfer is not in pending status: {self.status}")
            return False, ["Transfer is not in pending status"]
        
        # Validate transfer
        validation_result = self.validate_transfer()
        print(f"DEBUG: Validation result: {validation_result}")
        if not validation_result['can_proceed']:
            print(f"DEBUG: Validation failed with errors: {validation_result['errors']}")
            return False, validation_result['errors']
        
        try:
            from django.db import transaction
            
            print(f"DEBUG: Finding products...")
            # Find products if not already set
            if not self.from_product and (self.from_line_code or self.from_barcode):
                self.from_product = self._find_product_by_identifier(self.from_line_code or self.from_barcode)
                print(f"DEBUG: Found from_product: {self.from_product.name if self.from_product else 'Not found'}")
                if not self.from_product:
                    return False, [f"Source product not found: {self.from_line_code or self.from_barcode}"]
            
            # Handle destination product creation for SPLIT operations
            if not self.to_product:
                if self.transfer_type == 'SPLIT':
                    # For SPLIT operations, check if we have new product data in notes
                    # This would be passed from the frontend via the notes field or a separate field
                    # For now, we'll try to create a basic product
                    try:
                        # Try to find existing product first
                        identifier = self.to_line_code or self.to_barcode
                        self.to_product = self._find_product_by_identifier(identifier)
                        
                        if not self.to_product:
                            # Create new product for split operation
                            # Extract new product data from notes if available (format: "Product split: OLD -> NEW\n{"name": "...", "price": ..., ...}")
                            new_product_data = None
                            if self.notes and 'Product split:' in self.notes:
                                try:
                                    # Look for JSON data in notes after "Product split:"
                                    lines = self.notes.split('\n')
                                    for line in lines:
                                        if line.strip().startswith('{'):
                                            import json
                                            new_product_data = json.loads(line.strip())
                                            break
                                except:
                                    pass
                            
                            if new_product_data:
                                self.to_product = Product.objects.create(
                                    shop=self.shop,
                                    name=new_product_data['name'],
                                    price=new_product_data['price'],
                                    cost_price=new_product_data['cost_price'],
                                    category=new_product_data.get('category', 'Bakery'),
                                    currency=new_product_data.get('currency', 'USD'),
                                    line_code=self.to_line_code,  # Use the provided line code
                                    barcode=self.to_barcode or '',
                                    stock_quantity=0  # Start with 0, will be updated below
                                )
                                print(f"DEBUG: Created new product for split: {self.to_product.name}")
                            else:
                                # Create basic product without detailed data
                                self.to_product = Product.objects.create(
                                    shop=self.shop,
                                    name=f"Split Product from {self.from_product.name if self.from_product else 'Unknown'}",
                                    price=1.00,  # Default price
                                    cost_price=0.50,  # Default cost
                                    category='Bakery',
                                    currency='USD',
                                    line_code=self.to_line_code,
                                    barcode=self.to_barcode or '',
                                    stock_quantity=0
                                )
                                print(f"DEBUG: Created basic product for split: {self.to_product.name}")
                    except Exception as e:
                        print(f"DEBUG: Error creating new product: {e}")
                        return False, [f"Failed to create new product for split: {str(e)}"]
                else:
                    # Try to find existing product for other transfer types
                    identifier = self.to_line_code or self.to_barcode
                    self.to_product = self._find_product_by_identifier(identifier)
                    print(f"DEBUG: Found to_product: {self.to_product.name if self.to_product else 'Not found'}")
                    if not self.to_product:
                        return False, [f"Destination product not found: {self.to_line_code or self.to_barcode}"]
            
            # Final check - ensure we have both products
            if not self.from_product:
                return False, ["Source product is required but not found"]
            if not self.to_product:
                if self.transfer_type == 'SPLIT':
                    return False, ["Failed to create destination product for split operation"]
                else:
                    return False, ["Destination product is required but not found"]
            
            # Process the transfer
            with transaction.atomic():
                print(f"DEBUG: Processing transfer in transaction...")
                # Deduct from source product
                if self.from_product and self.from_quantity > 0:
                    old_from_stock = float(self.from_product.stock_quantity) or 0
                    new_from_stock = old_from_stock - float(self.from_quantity)
                    print(f"DEBUG: Updating from_product stock: {old_from_stock} -> {new_from_stock}")
                    self.from_product.stock_quantity = new_from_stock
                    self.from_product.save()
                
                # Calculate financial impacts before updating stock
                from_product_cost = 0
                to_product_cost = 0
                net_inventory_value_change = 0
                
                # CRITICAL: Use actual cost prices from database
                if self.from_product:
                    from_cost_price = float(self.from_product.cost_price or 0)
                    from_product_cost = float(self.from_quantity) * from_cost_price
                    print(f"DEBUG: Source product cost calculation:")
                    print(f"DEBUG: Product name: {self.from_product.name}")
                    print(f"DEBUG: Cost price from DB: ${from_cost_price}")
                    print(f"DEBUG: Quantity: {self.from_quantity}")
                    print(f"DEBUG: Total source cost: {self.from_quantity} × ${from_cost_price} = ${from_product_cost}")
                else:
                    print(f"DEBUG: No source product found for cost calculation")
                
                if self.to_product:
                    to_cost_price = float(self.to_product.cost_price or 0)
                    # Calculate quantity to add based on transfer type
                    old_to_stock = float(self.to_product.stock_quantity) or 0
                    
                    # Calculate conversion ratio for all transfer types
                    conversion_ratio = self.calculate_conversion_ratio()
                    
                    if self.transfer_type == 'SPLIT':
                        quantity_to_add = float(self.from_quantity) * float(conversion_ratio)
                        new_to_stock = old_to_stock + quantity_to_add
                        print(f"DEBUG: SPLIT operation - Adding {quantity_to_add} (from {self.from_quantity} × {conversion_ratio})")
                    else:
                        quantity_to_add = float(self.to_quantity)
                        new_to_stock = old_to_stock + quantity_to_add
                        print(f"DEBUG: ADD operation - Adding {self.to_quantity}")
                    
                    to_product_cost = quantity_to_add * to_cost_price
                    print(f"DEBUG: Destination product cost calculation:")
                    print(f"DEBUG: Product name: {self.to_product.name}")
                    print(f"DEBUG: Cost price from DB: ${to_cost_price}")
                    print(f"DEBUG: Quantity to add: {quantity_to_add}")
                    print(f"DEBUG: Total destination cost: {quantity_to_add} × ${to_cost_price} = ${to_product_cost}")
                    
                    # Calculate inventory value change
                    old_inventory_value = max(0, old_to_stock) * float(self.to_product.cost_price)
                    new_inventory_value = max(0, new_to_stock) * float(self.to_product.cost_price)
                    to_inventory_change = new_inventory_value - old_inventory_value
                    
                    # Add source product inventory value change (removal)
                    if self.from_product:
                        from_old_stock = float(self.from_product.stock_quantity) + float(self.from_quantity)
                        from_new_stock = float(self.from_product.stock_quantity)
                        from_old_value = max(0, from_old_stock) * float(self.from_product.cost_price)
                        from_new_value = max(0, from_new_stock) * float(self.from_product.cost_price)
                        from_inventory_change = from_new_value - from_old_value
                        net_inventory_value_change = to_inventory_change + from_inventory_change
                    else:
                        net_inventory_value_change = to_inventory_change
                    
                    print(f"DEBUG: Inventory value change: ${net_inventory_value_change}")
                    
                    # Update destination product stock
                    self.to_product.stock_quantity = new_to_stock
                    self.to_product.save()
                    
                    # Calculate shrinkage detection
                    expected_yield = float(self.from_quantity) * float(conversion_ratio)
                    actual_yield = quantity_to_add
                    shrinkage_qty = max(0, expected_yield - actual_yield)
                    shrinkage_val = shrinkage_qty * float(self.to_product.cost_price)
                    
                    print(f"DEBUG: Shrinkage Analysis:")
                    print(f"DEBUG: Expected yield: {expected_yield}")
                    print(f"DEBUG: Actual yield: {actual_yield}")
                    print(f"DEBUG: Shrinkage quantity: {shrinkage_qty}")
                    print(f"DEBUG: Shrinkage value: ${shrinkage_val}")
                    
                    # Store all financial calculations including shrinkage
                    self.from_product_cost = from_product_cost
                    self.to_product_cost = to_product_cost
                    self.net_inventory_value_change = net_inventory_value_change
                    self.cost_impact = to_product_cost - from_product_cost
                    self.shrinkage_quantity = shrinkage_qty
                    self.shrinkage_value = shrinkage_val
                
                # Conversion ratio already calculated above
                
                # Mark as completed
                self.status = 'COMPLETED'
                self.completed_at = timezone.now()
                self.save()
                
                print(f"DEBUG: Transfer completed successfully!")
                return True, ["Transfer completed successfully"]
                
        except Exception as e:
            print(f"DEBUG: Exception in process_transfer: {str(e)}")
            print(f"DEBUG: Exception type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return False, [f"Error processing transfer: {str(e)}"]
    
    def get_financial_impact_summary(self):
        """Get a summary of financial impacts for business intelligence"""
        summary = {
            'transfer_type': self.get_transfer_type_display(),
            'conversion_ratio': float(self.conversion_ratio),
            'from_product': self.get_from_product_display(),
            'to_product': self.get_to_product_display(),
            'quantities': {
                'from': float(self.from_quantity),
                'to': float(self.to_quantity)
            },
            'costs': {
                'source_cost': float(self.from_product_cost or 0),
                'destination_cost': float(self.to_product_cost or 0),
                'net_cost_impact': float(self.cost_impact or 0),
                'inventory_value_change': float(self.net_inventory_value_change or 0)
            },
            'shrinkage': {
                'quantity': float(self.shrinkage_quantity or 0),
                'value': float(self.shrinkage_value or 0)
            },
            'business_impact': self.get_business_impact_analysis()
        }
        return summary
    
    def get_business_impact_analysis(self):
        """Analyze the business impact of this transfer with aggressive shrinkage detection"""
        cost_impact = float(self.cost_impact or 0)
        inventory_change = float(self.net_inventory_value_change or 0)
        shrinkage_value = float(self.shrinkage_value or 0)
        
        # ENHANCED IMPACT ANALYSIS - More aggressive for losses
        if shrinkage_value > 0:
            impact_type = "SHRINKAGE LOSS"
            impact_level = "CRITICAL" if shrinkage_value > 20 else "HIGH" if shrinkage_value > 5 else "MEDIUM"
        elif cost_impact > 0:
            impact_type = "Cost Increase"
            impact_level = "HIGH" if cost_impact > 50 else "MEDIUM" if cost_impact > 10 else "LOW"
        elif cost_impact < 0:
            impact_type = "Cost Savings"
            impact_level = "HIGH" if abs(cost_impact) > 50 else "MEDIUM" if abs(cost_impact) > 10 else "LOW"
        else:
            # Check if this is a zero-cost transfer (which should trigger alerts)
            if self.from_product and self.to_product:
                from_cost = float(self.from_product.cost_price or 0)
                to_cost = float(self.to_product.cost_price or 0)
                if from_cost == 0 or to_cost == 0:
                    impact_type = "ZERO COST ALERT"
                    impact_level = "CRITICAL"
                else:
                    impact_type = "Cost Neutral"
                    impact_level = "NONE"
            else:
                impact_type = "Cost Neutral"
                impact_level = "NONE"
        
        # Enhanced inventory impact with shrinkage focus
        if shrinkage_value > 0:
            inventory_impact = f"Shrinkage Loss: -${shrinkage_value:.2f}"
        elif inventory_change > 0:
            inventory_impact = f"Inventory Value Increased: +${inventory_change:.2f}"
        elif inventory_change < 0:
            inventory_impact = f"Inventory Value Decreased: -${abs(inventory_change):.2f}"
        else:
            inventory_impact = "Inventory Value Unchanged"
        
        # AGGRESSIVE RECOMMENDATIONS - Make owners care about losses
        recommendations = []
        
        # Shrinkage-specific recommendations
        if shrinkage_value > 0:
            recommendations.append(f"INVESTIGATE SHRINKAGE: ${shrinkage_value:.2f} loss detected - Check handling procedures")
            recommendations.append("Review staff training on product handling")
            recommendations.append("Implement quality control checkpoints")
            
            if shrinkage_value > 20:
                recommendations.append("MANAGEMENT REVIEW REQUIRED: High shrinkage cost")
        
        # Zero cost alerts
        if self.from_product and self.to_product:
            from_cost = float(self.from_product.cost_price or 0)
            to_cost = float(self.to_product.cost_price or 0)
            if from_cost == 0 or to_cost == 0:
                recommendations.append("URGENT: Set proper cost prices to track real losses")
                recommendations.append("Zero-cost products mask shrinkage and waste")
        
        # Transfer type specific recommendations
        if self.transfer_type == 'SPLIT':
            recommendations.append("Monitor splitting process for waste")
            recommendations.append("Review cutting accuracy and tool quality")
        elif self.transfer_type == 'CONVERSION':
            recommendations.append("Verify conversion process efficiency")
        
        # General cost management
        if abs(cost_impact) > 10:
            recommendations.append("Review supplier costs and process efficiency")
        
        # Calculate if this needs immediate review
        needs_review = (
            shrinkage_value > 5 or  # Any shrinkage over $5
            abs(cost_impact) > 50 or  # High cost impact
            abs(inventory_change) > 100 or  # High inventory value change
            (self.from_product and self.to_product and 
             (float(self.from_product.cost_price or 0) == 0 or float(self.to_product.cost_price or 0) == 0))  # Zero cost products
        )
        
        return {
            'cost_impact_type': impact_type,
            'cost_impact_level': impact_level,
            'inventory_impact': inventory_impact,
            'shrinkage_detected': shrinkage_value > 0,
            'shrinkage_amount': shrinkage_value,
            'recommendations': recommendations,
            'needs_review': needs_review,
            'alert_level': 'CRITICAL' if (shrinkage_value > 20 or needs_review) else 'HIGH' if shrinkage_value > 5 else 'MEDIUM' if needs_review else 'LOW'
        }
    
    def _find_product_by_identifier(self, identifier):
        """Find product by line code or barcode with comprehensive search"""
        print(f"DEBUG: Searching for product with identifier: '{identifier}'")
        
        # Get shop context - we need to filter by shop
        shop = self.shop
        
        # Search by line code first
        try:
            product = Product.objects.get(line_code=identifier, shop=shop)
            print(f"DEBUG: Found product by line_code: {product.name}")
            return product
        except Product.DoesNotExist:
            print(f"DEBUG: Product not found by line_code: {identifier}")
        
        # Search by primary barcode
        try:
            product = Product.objects.get(barcode=identifier, shop=shop)
            print(f"DEBUG: Found product by barcode: {product.name}")
            return product
        except Product.DoesNotExist:
            print(f"DEBUG: Product not found by barcode: {identifier}")
        
        # Search in additional barcodes
        try:
            product = Product.objects.filter(
                shop=shop,
                additional_barcodes__contains=identifier
            ).first()
            if product:
                print(f"DEBUG: Found product by additional_barcodes: {product.name}")
                return product
        except Exception as e:
            print(f"DEBUG: Error searching additional_barcodes: {e}")
        
        # Search by product name (case insensitive, partial match)
        try:
            product = Product.objects.filter(
                shop=shop,
                name__icontains=identifier
            ).first()
            if product:
                print(f"DEBUG: Found product by name search: {product.name}")
                return product
        except Exception as e:
            print(f"DEBUG: Error searching by name: {e}")
        
        print(f"DEBUG: Product not found with identifier: '{identifier}'")
        return None

class WasteBatch(models.Model):
    """
    Batch Waste Management Model
    Allows recording waste for multiple products in a single transaction
    """
    WASTE_REASON_CHOICES = [
        ('EXPIRED', 'Expired Products'),
        ('DAMAGED', 'Damaged Products'),
        ('SPOILED', 'Spoiled Products'),
        ('STALE', 'Stale Products'),
        ('CONTAMINATED', 'Contaminated Products'),
        ('DEFECTIVE', 'Defective Products'),
        ('OTHER', 'Other Reasons'),
    ]
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    batch_number = models.CharField(max_length=50, unique=True, help_text="Auto-generated batch identifier")
    reason = models.CharField(max_length=20, choices=WASTE_REASON_CHOICES, default='OTHER')
    reason_details = models.TextField(blank=True, help_text="Detailed explanation for the entire batch")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Financial tracking
    total_waste_value = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total value of all wasted items in batch")
    total_waste_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total quantity of all wasted items")
    
    # Tracking
    recorded_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Waste Batch"
        verbose_name_plural = "Waste Batches"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['batch_number']),
        ]
    
    def __str__(self):
        return f"Waste Batch {self.batch_number} - {self.get_reason_display()} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Generate batch number if not provided
        if not self.batch_number:
            self.batch_number = self._generate_batch_number()
        super().save(*args, **kwargs)
    
    def _generate_batch_number(self):
        """Generate unique batch number"""
        import uuid
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"WB-{timestamp}-{unique_id}"
    
    def add_waste_item(self, product, quantity, specific_reason=None, specific_details=None):
        """Add a product to this waste batch"""
        if self.status != 'DRAFT':
            raise ValueError("Cannot add items to completed or cancelled batch")
        
        try:
            # Create individual waste record for this product
            waste_item = Waste.objects.create(
                shop=self.shop,
                shop_batch=self,  # Associate with this batch
                product=product,
                quantity=quantity,
                reason=specific_reason or self.reason,
                reason_details=specific_details or self.reason_details,
                recorded_by=self.recorded_by
            )
            
            # Update batch totals
            self._update_totals()
            
            return waste_item
        except Exception as e:
            raise ValueError(f"Failed to add waste item: {str(e)}")
    
    def _update_totals(self):
        """Update batch totals based on individual waste records"""
        waste_items = Waste.objects.filter(shop_batch=self)
        self.total_waste_value = waste_items.aggregate(
            total=models.Sum('waste_value')
        )['total'] or 0
        self.total_waste_quantity = waste_items.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
        self.save()
    
    def complete_batch(self):
        """Mark batch as completed"""
        if self.status != 'DRAFT':
            raise ValueError("Only draft batches can be completed")
        
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self._update_totals()
        self.save()
    
    def cancel_batch(self):
        """Cancel the batch (reverses all waste records)"""
        if self.status != 'DRAFT':
            raise ValueError("Only draft batches can be cancelled")
        
        # Delete all waste records in this batch
        Waste.objects.filter(shop_batch=self).delete()
        
        self.status = 'CANCELLED'
        self.save()
    
    def get_waste_items(self):
        """Get all waste items in this batch"""
        return Waste.objects.filter(shop_batch=self).order_by('created_at')
    
    @property
    def item_count(self):
        """Number of different products in this batch"""
        return self.get_waste_items().count()
    
    @property
    def severity_level(self):
        """Determine severity based on total waste value"""
        if self.total_waste_value > 100:
            return "HIGH"
        elif self.total_waste_value > 50:
            return "MEDIUM"
        else:
            return "LOW"

class Waste(models.Model):
    """
    Waste Management Model
    Tracks products that have been wasted/damaged/expired
    """
    WASTE_REASON_CHOICES = [
        ('EXPIRED', 'Expired Products'),
        ('DAMAGED', 'Damaged Products'),
        ('SPOILED', 'Spoiled Products'),
        ('STALE', 'Stale Products'),
        ('CONTAMINATED', 'Contaminated Products'),
        ('DEFECTIVE', 'Defective Products'),
        ('OTHER', 'Other Reasons'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    shop_batch = models.ForeignKey('WasteBatch', on_delete=models.CASCADE, null=True, blank=True, related_name='waste_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity wasted")
    reason = models.CharField(max_length=20, choices=WASTE_REASON_CHOICES, default='OTHER')
    reason_details = models.TextField(blank=True, help_text="Detailed explanation of why items were wasted")
    line_code = models.CharField(max_length=100, blank=True, help_text="Product line code at time of waste")
    barcode = models.CharField(max_length=100, blank=True, help_text="Product barcode at time of waste")
    
    # Financial tracking
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost price at time of waste")
    waste_value = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total value of wasted items")
    
    # Tracking
    recorded_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Waste Record"
        verbose_name_plural = "Waste Records"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop', '-created_at']),
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['reason', '-created_at']),
        ]
    
    def __str__(self):
        return f"Waste: {self.product.name} - {self.quantity} units ({self.get_reason_display()})"
    
    def save(self, *args, **kwargs):
        # Calculate waste value based on current cost price
        if not self.cost_price:
            self.cost_price = self.product.cost_price
        # Ensure proper type conversion to avoid float * Decimal errors
        self.waste_value = float(self.quantity) * float(self.cost_price)
        
        # Store product identifiers
        if not self.line_code:
            self.line_code = self.product.line_code
        if not self.barcode:
            self.barcode = self.product.barcode
        
        super().save(*args, **kwargs)
        
        # Automatically reduce product stock when waste is recorded
        self._reduce_stock()
    
    def _reduce_stock(self):
        """Reduce product stock when waste is recorded"""
        try:
            # Get StockMovement model dynamically to avoid circular import
            StockMovement = get_stock_movement_model()
            
            previous_stock = float(self.product.stock_quantity or 0)
            new_stock = previous_stock - float(self.quantity)
            
            # Update product stock
            self.product.stock_quantity = new_stock
            self.product.save()
            
            # Create stock movement record for waste
            StockMovement.objects.create(
                shop=self.shop,
                product=self.product,
                movement_type='DAMAGE',  # Waste is treated as damage
                previous_stock=previous_stock,
                quantity_change=-float(self.quantity),  # Negative for waste
                new_stock=new_stock,
                cost_price=float(self.cost_price),  # Convert to float to avoid type issues
                notes=f'Waste recorded: {self.get_reason_display()} - {self.reason_details[:100] if self.reason_details else "No details"}',
                performed_by=self.recorded_by
            )
            
        except Exception as e:
            print(f"Warning: Could not create stock movement record for waste: {e}")
    
    @property
    def waste_type(self):
        return "SHRINKAGE" if self.reason in ['EXPIRED', 'DAMAGED', 'SPOILED', 'STALE'] else "OTHER"
    
    @property
    def severity_level(self):
        """Determine severity based on waste value and reason"""
        if self.waste_value > 50:
            return "HIGH"
        elif self.waste_value > 20:
            return "MEDIUM"
        else:
            return "LOW"
    
    @classmethod
    def get_waste_summary(cls, shop, start_date=None, end_date=None):
        """Get waste summary for a shop"""
        from django.db.models import Sum, Count
        from django.utils import timezone
        from datetime import timedelta
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        waste_records = cls.objects.filter(
            shop=shop,
            created_at__range=[start_date, end_date]
        )
        
        summary = waste_records.aggregate(
            total_waste_value=Sum('waste_value'),
            total_waste_quantity=Sum('quantity'),
            waste_count=Count('id')
        )
        
        # Get breakdown by reason
        reason_breakdown = waste_records.values('reason').annotate(
            count=Count('id'),
            total_value=Sum('waste_value'),
            total_quantity=Sum('quantity')
        ).order_by('-total_value')
        
        return {
            'summary': summary,
            'reason_breakdown': list(reason_breakdown),
            'period': {
                'start_date': start_date,
                'end_date': end_date
            }
        }


class CashFloat(models.Model):
    """
    Cash Float Management System
    Tracks float amounts, drawer contents, and real-time cash flow
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active Drawer'),
        ('INACTIVE', 'Inactive Drawer'),
        ('SETTLED', 'Settled at EOD'),
    ]
    
    shop = models.ForeignKey(ShopConfiguration, on_delete=models.CASCADE)
    cashier = models.ForeignKey('Cashier', on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    
    # Float Management
    float_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Owner-set float amount")
    float_set_by = models.ForeignKey('Cashier', on_delete=models.SET_NULL, null=True, blank=True, related_name='floats_set', help_text="Who set the float")
    float_set_at = models.DateTimeField(null=True, blank=True, help_text="When float was last set")
    
    # Current Drawer Contents (Real-time tracking)
    current_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current cash in drawer")
    current_card = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current card payments in drawer")
    current_ecocash = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current EcoCash in drawer")
    current_transfer = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current bank transfers in drawer")
    current_total = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total current amount in drawer")
    
    # Sales Tracking (for current session)
    session_cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    session_card_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    session_ecocash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    session_transfer_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    session_total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # EOD Integration
    expected_cash_at_eod = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Expected cash at end of day (float + cash sales)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INACTIVE')
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True, help_text="Last time drawer was updated")
    
    class Meta:
        verbose_name = "Cash Float"
        verbose_name_plural = "Cash Floats"
        ordering = ['-date', '-created_at']
        unique_together = ['shop', 'cashier', 'date']
        indexes = [
            models.Index(fields=['shop', 'date']),
            models.Index(fields=['cashier', 'date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.cashier.name} - {self.date} - ${self.current_total}"
    
    @property
    def is_active(self):
        return self.status == 'ACTIVE'
    
    @property
    def expected_drawer_total(self):
        """Expected total in drawer: float + all cash sales"""
        return self.float_amount + self.session_cash_sales
    
    @property
    def cash_variance(self):
        """Difference between current cash and expected cash"""
        return self.current_cash - self.expected_drawer_total
    
    @property
    def drawer_efficiency(self):
        """Calculate drawer efficiency percentage"""
        expected = self.expected_drawer_total
        if expected == 0:
            return 100
        actual = self.current_cash
        return min(100, (float(actual) / float(expected)) * 100)
    
    def activate_drawer(self, cashier):
        """Activate the drawer for a cashier"""
        self.status = 'ACTIVE'
        self.cashier = cashier
        self.float_set_by = cashier
        self.float_set_at = timezone.now()
        self.save()
        return self
    
    def set_float_amount(self, amount, set_by):
        """Set or update float amount"""
        # Ensure amount is Decimal for consistency
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        self.float_amount = amount
        self.float_set_by = set_by
        self.float_set_at = timezone.now()
        self.update_expected_cash()
        self.save()
        return self
    
    def add_sale(self, amount, payment_method):
        """Add a sale to the drawer"""
        # Ensure amount is Decimal for consistency
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        
        if payment_method == 'cash':
            self.session_cash_sales += amount
            self.current_cash += amount
        elif payment_method == 'card':
            self.session_card_sales += amount
            self.current_card += amount
        elif payment_method == 'ecocash':
            self.session_ecocash_sales += amount
            self.current_ecocash += amount
        elif payment_method == 'transfer':
            self.session_transfer_sales += amount
            self.current_transfer += amount
        
        # Update totals
        self.session_total_sales += amount
        self.current_total = (self.current_cash + self.current_card + 
                             self.current_ecocash + self.current_transfer)
        
        self.update_expected_cash()
        self.last_activity = timezone.now()
        self.save()
        
        return self
    
    def update_expected_cash(self):
        """Update expected cash amount at EOD"""
        self.expected_cash_at_eod = self.float_amount + self.session_cash_sales
    
    def get_drawer_summary(self):
        """Get comprehensive drawer summary"""
        return {
            'cashier': self.cashier.name,
            'float_amount': float(self.float_amount),
            'current_breakdown': {
                'cash': float(self.current_cash),
                'card': float(self.current_card),
                'ecocash': float(self.current_ecocash),
                'transfer': float(self.current_transfer),
                'total': float(self.current_total)
            },
            'session_sales': {
                'cash': float(self.session_cash_sales),
                'card': float(self.session_card_sales),
                'ecocash': float(self.session_ecocash_sales),
                'transfer': float(self.session_transfer_sales),
                'total': float(self.session_total_sales)
            },
            'eod_expectations': {
                'expected_cash': float(self.expected_cash_at_eod),
                'variance': float(self.cash_variance),
                'efficiency': float(self.drawer_efficiency)
            },
            'status': self.status,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }
    
    def settle_at_eod(self, actual_cash_counted):
        """Settle drawer at end of day"""
        # Ensure amount is Decimal for consistency
        if not isinstance(actual_cash_counted, Decimal):
            actual_cash_counted = Decimal(str(actual_cash_counted))
        
        expected_cash = self.expected_cash_at_eod
        variance = actual_cash_counted - expected_cash
        
        self.current_cash = actual_cash_counted
        self.current_total = (actual_cash_counted + self.current_card + 
                             self.current_ecocash + self.current_transfer)
        self.status = 'SETTLED'
        self.save()
        
        return {
            'expected_cash': float(expected_cash),
            'actual_cash': float(actual_cash_counted),
            'variance': float(variance),
            'variance_percentage': (float(variance) / float(expected_cash) * 100) if expected_cash > 0 else 0,
            'settled_at': timezone.now()
        }
    
    @classmethod
    def get_active_drawer(cls, shop, cashier):
        """Get or create active drawer for cashier"""
        today = timezone.now().date()
        drawer, created = cls.objects.get_or_create(
            shop=shop,
            cashier=cashier,
            date=today,
            defaults={
                'status': 'INACTIVE',
                'float_amount': 0
            }
        )
        return drawer
    
    @classmethod
    def get_shop_drawer_status(cls, shop):
        """Get status of all drawers in shop"""
        today = timezone.now().date()
        drawers = cls.objects.filter(shop=shop, date=today)
        
        active_drawers = drawers.filter(status='ACTIVE')
        inactive_drawers = drawers.filter(status='INACTIVE')
        settled_drawers = drawers.filter(status='SETTLED')
        
        total_expected_cash = sum([d.expected_cash_at_eod for d in active_drawers])
        total_current_cash = sum([d.current_cash for d in active_drawers])
        
        return {
            'shop': shop.name,
            'date': today.isoformat(),
            'total_drawers': drawers.count(),
            'active_drawers': active_drawers.count(),
            'inactive_drawers': inactive_drawers.count(),
            'settled_drawers': settled_drawers.count(),
            'cash_flow': {
                'total_expected_cash': float(total_expected_cash),
                'total_current_cash': float(total_current_cash),
                'variance': float(total_current_cash - total_expected_cash)
            },
            'drawers': [d.get_drawer_summary() for d in drawers]
        }


# ============================================================================
# CASH FLOAT API VIEWS
# ============================================================================

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET', 'POST'])
def cash_float_management(request):
    """
    GET: Get cash float status for current user's shop
    POST: Set or update cash float for a cashier
    """
    try:
        # Get shop from request data (owner context) or use default shop
        if request.method == 'POST':
            # Owner setting float - get from request data
            shop_email = request.data.get('shop_email')
            if shop_email:
                try:
                    shop = ShopConfiguration.objects.get(email=shop_email)
                    cashier = None  # Owner operation
                except ShopConfiguration.DoesNotExist:
                    return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                shop = ShopConfiguration.objects.get()
                cashier = None
        else:
            # GET request - get current shop
            shop = ShopConfiguration.objects.get()
            cashier = None
        
        if request.method == 'GET':
            # Get drawer status for current user
            if cashier:
                # Cashier requesting their own drawer status
                drawer = CashFloat.get_active_drawer(shop, cashier)
                return Response({
                    'success': True,
                    'drawer': drawer.get_drawer_summary()
                })
            else:
                # Owner requesting all drawers status
                drawer_status = CashFloat.get_shop_drawer_status(shop)
                return Response({
                    'success': True,
                    'shop_status': drawer_status
                })
        
        elif request.method == 'POST':
            data = request.data
            target_cashier_id = data.get('cashier_id')
            float_amount = data.get('float_amount')
            
            if not target_cashier_id or float_amount is None:
                return Response({
                    'error': 'cashier_id and float_amount are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                target_cashier = Cashier.objects.get(id=target_cashier_id, shop=shop)
                float_amount = float(float_amount)
                
                if float_amount < 0:
                    return Response({
                        'error': 'Float amount cannot be negative'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get or create drawer for target cashier
                drawer = CashFloat.get_active_drawer(shop, target_cashier)
                # For now, set by owner (no specific cashier)
                drawer.set_float_amount(float_amount, None)
                
                return Response({
                    'success': True,
                    'message': f'Float of ${float_amount:.2f} set for {target_cashier.name}',
                    'drawer': drawer.get_drawer_summary()
                })
                
            except Cashier.DoesNotExist:
                return Response({
                    'error': 'Cashier not found'
                }, status=status.HTTP_404_NOT_FOUND)
            except ValueError:
                return Response({
                    'error': 'Invalid float amount'
                }, status=status.HTTP_400_BAD_REQUEST)
                
    except Exception as e:
        return Response({
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def activate_cashier_drawer(request):
    """
    Activate a cashier's drawer (called when cashier starts their shift)
    """
    try:
        data = request.data
        cashier_id = data.get('cashier_id')
        
        if not cashier_id:
            return Response({'error': 'cashier_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        shop = ShopConfiguration.objects.get()
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({'error': 'Cashier not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get or create drawer for today
        drawer = CashFloat.get_active_drawer(shop, cashier)
        drawer.activate_drawer(cashier)
        
        return Response({
            'success': True,
            'message': f'Drawer activated for {cashier.name}',
            'drawer': drawer.get_drawer_summary()
        })
        
    except Exception as e:
        return Response({
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def update_drawer_sale(request):
    """
    Update drawer with a new sale
    """
    try:
        data = request.data
        cashier_id = data.get('cashier_id')
        sale_amount = data.get('amount')
        payment_method = data.get('payment_method')
        
        if not cashier_id or not sale_amount or not payment_method:
            return Response({
                'error': 'cashier_id, amount, and payment_method are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shop = ShopConfiguration.objects.get()
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({'error': 'Cashier not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Remove the duplicate data assignment since we already have it
        # data = request.data  # This was moved up
        # sale_amount = data.get('amount')  # This was moved up
        # payment_method = data.get('payment_method')  # This was moved up

        
        valid_payment_methods = ['cash', 'card', 'ecocash', 'transfer']
        if payment_method not in valid_payment_methods:
            return Response({
                'error': f'Invalid payment method. Must be one of: {", ".join(valid_payment_methods)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sale_amount = float(sale_amount)
            if sale_amount <= 0:
                return Response({
                    'error': 'Sale amount must be positive'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create active drawer
            drawer = CashFloat.get_active_drawer(shop, cashier)
            if drawer.status != 'ACTIVE':
                drawer.activate_drawer(cashier)
            
            # NOTE: Drawer is updated automatically via Django signals
            # Manual drawer updates removed to prevent double-counting
            # REMOVED: drawer.add_sale(sale_amount, payment_method) - Now handled by signal
            print(f"INFO: Sale will be added to drawer automatically via signal handler")
            
            return Response({
                'success': True,
                'message': f'${sale_amount:.2f} {payment_method} sale recorded',
                'drawer': drawer.get_drawer_summary()
            })
            
        except ValueError:
            return Response({
                'error': 'Invalid sale amount'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def settle_drawer_at_eod(request):
    """
    Settle a cashier's drawer at end of day
    """
    try:
        data = request.data
        cashier_id = data.get('cashier_id')
        actual_cash_counted = data.get('actual_cash_counted')
        
        if not cashier_id or actual_cash_counted is None:
            return Response({
                'error': 'cashier_id and actual_cash_counted are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shop = ShopConfiguration.objects.get()
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({'error': 'Cashier not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            actual_cash_counted = float(actual_cash_counted)
            
            # Get active drawer
            drawer = CashFloat.get_active_drawer(shop, cashier)
            
            # Settle drawer
            settlement_result = drawer.settle_at_eod(actual_cash_counted)
            
            return Response({
                'success': True,
                'message': 'Drawer settled successfully',
                'settlement': settlement_result,
                'drawer': drawer.get_drawer_summary()
            })
            
        except ValueError:
            return Response({
                'error': 'Invalid cash amount'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_cashiers_drawer_status(request):
    """
    Get drawer status for all cashiers in the shop (owners only)
    """
    try:
        shop = ShopConfiguration.objects.get()
        drawer_status = CashFloat.get_shop_drawer_status(shop)
        
        return Response({
            'success': True,
            'shop_status': drawer_status
        })
        
    except Exception as e:
        return Response({
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)