from rest_framework import serializers
from django.db.models import Sum, F
from django.utils import timezone
from datetime import timedelta
from .models import ShopConfiguration, Cashier, Product, Sale, SaleItem, Customer, Discount, Shift, Expense, StaffLunch, StockTake, StockTakeItem

class ShopConfigurationSerializer(serializers.ModelSerializer):
    shop_owner_master_password = serializers.CharField(write_only=True, required=False)
    recovery_codes = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

    class Meta:
        model = ShopConfiguration
        fields = [
            'shop_id', 'register_id', 'name', 'address', 'business_type', 'industry', 'description', 
            'email', 'phone', 'shop_owner_master_password', 'recovery_codes',
            'device_id', 'owner_id', 'api_key', 'version', 'checksum', 
            'registration_time', 'is_active', 'last_login', 'registered_at'
        ]
        read_only_fields = ['shop_id', 'register_id', 'device_id', 'owner_id', 'api_key', 'checksum', 'registered_at']

    def validate_founder_master_password(self, value):
        """Validate founder master password for super admin access"""
        if value != "morrill95@2001":
            raise serializers.ValidationError("Invalid founder master password.")
        return value

    def create(self, validated_data):
        # Remove shop_owner_master_password and recovery_codes for processing
        shop_owner_master_password = validated_data.pop('shop_owner_master_password', None)
        recovery_codes = validated_data.pop('recovery_codes', [])
        
        shop = super().create(validated_data)
        
        # Set shop-specific security credentials if provided
        if shop_owner_master_password:
            shop.shop_owner_master_password = shop_owner_master_password
        if recovery_codes:
            shop.recovery_codes = recovery_codes
            
        shop.save()
        return shop

    def update(self, instance, validated_data):
        # Handle security credential updates
        shop_owner_master_password = validated_data.pop('shop_owner_master_password', None)
        recovery_codes = validated_data.pop('recovery_codes', None)
        
        # Update basic fields
        instance = super().update(instance, validated_data)
        
        # Update shop-specific security credentials if provided
        if shop_owner_master_password is not None:
            instance.shop_owner_master_password = shop_owner_master_password
        if recovery_codes is not None:
            instance.recovery_codes = recovery_codes
            
        instance.save()
        return instance