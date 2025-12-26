import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone

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
    line_code = models.CharField(max_length=100, blank=True)
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    supplier = models.CharField(max_length=255, blank=True)
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
    def profit_margin(self):
        if self.cost_price > 0:
            return ((self.price - self.cost_price) / self.cost_price) * 100
        return 0

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
        for item in items:
            discrepancy = item.counted_quantity - item.system_quantity
            item.discrepancy = discrepancy
            item.discrepancy_value = discrepancy * item.product.cost_price
            item.save()
            total_discrepancy += item.discrepancy_value

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