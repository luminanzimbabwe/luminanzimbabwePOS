"""
License Management System for LuminaN POS
Prevents date manipulation and ensures proper license validation
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import hashlib
import secrets
import json
from datetime import datetime, timedelta
import uuid


class License(models.Model):
    """
    Central license model with anti-manipulation features
    """
    LICENSE_TYPES = [
        ('TRIAL', 'Trial License'),
        ('MONTHLY', 'Monthly License'),
        ('ANNUAL', 'Annual License'),
        ('LIFETIME', 'Lifetime License'),
        ('UNLIMITED', 'Unlimited License'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('SUSPENDED', 'Suspended'),
        ('REVOKED', 'Revoked'),
        ('TRIAL', 'Trial Active'),
    ]
    
    # Core license information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.OneToOneField('core.Shop', on_delete=models.CASCADE, related_name='license')
    
    # License details
    license_type = models.CharField(max_length=20, choices=LICENSE_TYPES, default='TRIAL')
    license_key = models.CharField(max_length=255, unique=True, blank=True)
    
    # Dates with validation
    issued_date = models.DateTimeField(auto_now_add=True)
    activation_date = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateTimeField()
    
    # Current status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIAL')
    
    # Anti-manipulation features
    activation_fingerprint = models.TextField(blank=True)  # Hardware fingerprint
    usage_tracking = models.JSONField(default=dict)  # Usage statistics
    last_validation = models.DateTimeField(null=True, blank=True)
    validation_count = models.IntegerField(default=0)
    
    # Security tokens
    security_hash = models.CharField(max_length=255, blank=True)  # Hash of license data
    tampering_detected = models.BooleanField(default=False)
    
    # Trial period tracking
    trial_days_used = models.IntegerField(default=0)
    max_trial_days = models.IntegerField(default=30)
    
    class Meta:
        db_table = 'core_license'
        ordering = ['-issued_date']
    
    def __str__(self):
        return f"License {self.license_key or self.id} for {self.shop.name}"
    
    def generate_license_key(self):
        """Generate a secure license key"""
        if not self.license_key:
            # Create a secure license key
            data = f"{self.shop.id}{self.license_type}{timezone.now().isoformat()}{secrets.token_hex(16)}"
            self.license_key = hashlib.sha256(data.encode()).hexdigest()[:32].upper()
        return self.license_key
    
    def calculate_security_hash(self):
        """Calculate a hash to detect tampering"""
        license_data = {
            'id': str(self.id),
            'shop_id': self.shop.id,
            'license_type': self.license_type,
            'issued_date': self.issued_date.isoformat() if self.issued_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'status': self.status,
            'activation_fingerprint': self.activation_fingerprint,
        }
        
        # Create a hash of the license data
        data_string = json.dumps(license_data, sort_keys=True)
        self.security_hash = hashlib.sha256(data_string.encode()).hexdigest()
        return self.security_hash
    
    def validate_integrity(self):
        """Check if license data has been tampered with"""
        expected_hash = self.calculate_security_hash()
        return self.security_hash == expected_hash and not self.tampering_detected
    
    def is_expired(self):
        """Check if license is expired"""
        # Unlimited licenses never expire
        if self.license_type == 'UNLIMITED':
            return False
        
        if not self.expiry_date:
            return True
        
        # Check if system time has been manipulated
        current_time = timezone.now()
        if current_time < self.issued_date:
            # Possible date manipulation
            self.tampering_detected = True
            self.save(update_fields=['tampering_detected'])
            return True
        
        return current_time > self.expiry_date
    
    def is_valid(self):
        """Check if license is currently valid"""
        if self.status in ['SUSPENDED', 'REVOKED']:
            return False
        
        if self.tampering_detected:
            return False
        
        return not self.is_expired()
    
    def activate_license(self, fingerprint=None):
        """Activate the license with hardware fingerprinting"""
        if not self.activation_date:
            self.activation_date = timezone.now()
            
            # Store hardware fingerprint for anti-tampering
            if fingerprint:
                self.activation_fingerprint = fingerprint
            
            # Set trial or full license expiry
            if self.license_type == 'TRIAL':
                self.expiry_date = timezone.now() + timedelta(days=self.max_trial_days)
                self.status = 'TRIAL'
            elif self.license_type == 'MONTHLY':
                self.expiry_date = timezone.now() + timedelta(days=30)
                self.status = 'ACTIVE'
            elif self.license_type == 'ANNUAL':
                self.expiry_date = timezone.now() + timedelta(days=365)
                self.status = 'ACTIVE'
            elif self.license_type == 'LIFETIME':
                self.expiry_date = timezone.now() + timedelta(days=365*100)  # 100 years
                self.status = 'ACTIVE'
            elif self.license_type == 'UNLIMITED':
                # Unlimited licenses have no expiry date
                self.expiry_date = None
                self.status = 'ACTIVE'
            
            # Generate license key and security hash
            self.generate_license_key()
            self.calculate_security_hash()
            
            self.save()
        
        return self.is_valid()
    
    def update_validation(self, usage_data=None):
        """Update validation timestamp and track usage"""
        self.last_validation = timezone.now()
        self.validation_count += 1
        
        # Track usage patterns to detect anomalies
        if usage_data:
            if 'daily_usage' not in self.usage_tracking:
                self.usage_tracking['daily_usage'] = {}
            
            today = timezone.now().date().isoformat()
            if today not in self.usage_tracking['daily_usage']:
                self.usage_tracking['daily_usage'][today] = 0
            
            self.usage_tracking['daily_usage'][today] += 1
        
        # Detect potential manipulation
        self.detect_manipulation()
        
        self.save(update_fields=['last_validation', 'validation_count', 'usage_tracking'])
    
    def detect_manipulation(self):
        """Detect potential license manipulation"""
        current_time = timezone.now()
        
        # Check if validation is happening too frequently (potential clock manipulation)
        if self.last_validation:
            time_diff = (current_time - self.last_validation).total_seconds()
            if time_diff < 1:  # Less than 1 second between validations
                self.tampering_detected = True
        
        # Check for unusual usage patterns
        if 'daily_usage' in self.usage_tracking:
            recent_usage = list(self.usage_tracking['daily_usage'].values())[-7:]  # Last 7 days
            if len(recent_usage) > 1:
                avg_usage = sum(recent_usage[:-1]) / len(recent_usage[:-1])
                if recent_usage[-1] > avg_usage * 10:  # 10x normal usage
                    self.tampering_detected = True
    
    def suspend_license(self, reason="Manual suspension"):
        """Suspend the license"""
        self.status = 'SUSPENDED'
        self.save(update_fields=['status'])
    
    def revoke_license(self, reason="Manual revocation"):
        """Revoke the license permanently"""
        self.status = 'REVOKED'
        self.save(update_fields=['status'])
    
    def renew_license(self, months=1):
        """Renew the license"""
        if self.license_type in ['TRIAL', 'MONTHLY']:
            # Extend current expiry date
            if self.expiry_date and self.expiry_date > timezone.now():
                # Extend from current expiry
                base_date = self.expiry_date
            else:
                # Extend from now
                base_date = timezone.now()
            
            self.expiry_date = base_date + timedelta(days=30*months)
            self.status = 'ACTIVE'
        elif self.license_type == 'ANNUAL':
            self.expiry_date = timezone.now() + timedelta(days=365)
            self.status = 'ACTIVE'
        
        self.calculate_security_hash()
        self.save()
    
    def get_days_remaining(self):
        """Get days remaining on license"""
        # Unlimited licenses never expire
        if self.license_type == 'UNLIMITED':
            return 999999  # Very large number to indicate unlimited
        
        if not self.expiry_date:
            return 0
        
        remaining = self.expiry_date - timezone.now()
        return max(0, remaining.days)


class LicenseLog(models.Model):
    """
    Log all license-related activities for audit trail
    """
    ACTION_CHOICES = [
        ('ACTIVATED', 'License Activated'),
        ('VALIDATED', 'License Validated'),
        ('EXPIRED', 'License Expired'),
        ('SUSPENDED', 'License Suspended'),
        ('REVOKED', 'License Revoked'),
        ('RENEWED', 'License Renewed'),
        ('TAMPERING_DETECTED', 'Tampering Detected'),
        ('RENEWAL_ATTEMPT', 'Renewal Attempted'),
    ]
    
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'core_license_log'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} - {self.license} at {self.timestamp}"