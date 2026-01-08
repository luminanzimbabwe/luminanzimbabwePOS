# Add to core/serializers.py

from rest_framework import serializers
from .models import StockTransfer, Product

class StockTransferSerializer(serializers.ModelSerializer):
    from_product_name = serializers.CharField(source='from_product.name', read_only=True)
    to_product_name = serializers.CharField(source='to_product.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.name', read_only=True)
    
    class Meta:
        model = StockTransfer
        fields = [
            'id',
            'shop',
            'transfer_type',
            'status',
            'from_product',
            'from_product_name',
            'from_quantity',
            'from_line_code',
            'from_barcode',
            'to_product',
            'to_product_name',
            'to_quantity',
            'to_line_code',
            'to_barcode',
            'conversion_ratio',
            # Financial fields - all money values
            'from_product_cost',
            'to_product_cost',
            'cost_impact',
            'net_inventory_value_change',
            'shrinkage_quantity',
            'shrinkage_value',
            'reason',
            'performed_by',
            'performed_by_name',
            'created_at',
            'completed_at',
            'notes'
        ]
        read_only_fields = [
            'id',
            'shop',
            'from_product_name',
            'to_product_name',
            'performed_by_name',
            'conversion_ratio',
            'from_product_cost',
            'to_product_cost',
            'cost_impact',
            'net_inventory_value_change',
            'shrinkage_quantity',
            'shrinkage_value',
            'created_at',
            'completed_at'
        ]