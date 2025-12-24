from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import models
from .models import ShopConfiguration, Cashier
from django.db.models import Sum, F

@method_decorator(csrf_exempt, name='dispatch')
class PendingStaffListView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({"error": "Owner credentials required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get pending staff
        pending_staff = Cashier.objects.filter(shop=shop, status='pending').order_by('-created_at')
        
        staff_data = []
        for cashier in pending_staff:
            staff_data.append({
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "phone": cashier.phone,
                "shift": cashier.preferred_shift,
                "status": cashier.status,
                "created_at": cashier.created_at.isoformat() if cashier.created_at else None
            })
        
        return Response({
            "message": "Pending staff retrieved successfully",
            "staff": staff_data,
            "count": len(staff_data)
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class ApprovedStaffListView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({"error": "Owner credentials required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get approved staff
        approved_staff = Cashier.objects.filter(shop=shop, status='active').order_by('-created_at')
        
        staff_data = []
        for cashier in approved_staff:
            staff_data.append({
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "phone": cashier.phone,
                "shift": cashier.preferred_shift,
                "role": cashier.role,
                "status": cashier.status,
                "approved_at": cashier.approved_at.isoformat() if cashier.approved_at else None,
                "approved_by": cashier.approved_by.name if cashier.approved_by else None
            })
        
        return Response({
            "message": "Approved staff retrieved successfully",
            "staff": staff_data,
            "count": len(staff_data)
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class ApproveStaffView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        staff_id = request.data.get('staff_id')
        role = request.data.get('role', 'cashier')
        
        if not email or not password or not staff_id:
            return Response({"error": "Owner credentials and staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the pending staff member
        try:
            cashier = Cashier.objects.get(id=staff_id, shop=shop, status='pending')
        except Cashier.DoesNotExist:
            return Response({"error": "Pending staff member not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Approve the staff member
        cashier.approve(role=role)
        
        return Response({
            "message": "Staff member approved successfully",
            "staff": {
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "phone": cashier.phone,
                "shift": cashier.preferred_shift,
                "role": cashier.role,
                "status": cashier.status,
                "approved_at": cashier.approved_at.isoformat() if cashier.approved_at else None
            }
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class RejectStaffView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        staff_id = request.data.get('staff_id')
        
        if not email or not password or not staff_id:
            return Response({"error": "Owner credentials and staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the pending staff member
        try:
            cashier = Cashier.objects.get(id=staff_id, shop=shop, status='pending')
        except Cashier.DoesNotExist:
            return Response({"error": "Pending staff member not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete the pending staff member
        cashier_name = cashier.name
        cashier.delete()
        
        return Response({
            "message": f"Registration for {cashier_name} has been rejected and removed",
            "removed_staff_id": staff_id
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class DeactivateCashierView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        staff_id = request.data.get('staff_id')
        
        if not email or not password or not staff_id:
            return Response({"error": "Owner credentials and staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the active cashier
        try:
            cashier = Cashier.objects.get(id=staff_id, shop=shop, status='active')
        except Cashier.DoesNotExist:
            return Response({"error": "Active cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Deactivate the cashier
        cashier.status = 'inactive'
        cashier.save()
        
        return Response({
            "message": f"Cashier {cashier.name} has been deactivated",
            "cashier": {
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "status": cashier.status,
                "role": cashier.role
            }
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class DeleteCashierView(APIView):
    def post(self, request):
        # Verify owner credentials
        email = request.data.get('email')
        password = request.data.get('password')
        staff_id = request.data.get('staff_id')
        
        if not email or not password or not staff_id:
            return Response({"error": "Owner credentials and staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the cashier (can be active, inactive, or pending)
        try:
            cashier = Cashier.objects.get(id=staff_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete the cashier permanently
        cashier_name = cashier.name
        cashier.delete()
        
        return Response({
            "message": f"Cashier {cashier_name} has been permanently deleted",
            "deleted_staff_id": staff_id
        }, status=status.HTTP_200_OK)