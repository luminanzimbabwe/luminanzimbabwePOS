from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import models
from .models import ShopConfiguration, Cashier, Shift, Sale, SaleItem
from django.db.models import Sum, F

@method_decorator(csrf_exempt, name='dispatch')
class PendingStaffListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        # Get pending staff from default shop
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({
                "message": "No shop configured",
                "staff": [],
                "count": 0
            }, status=status.HTTP_200_OK)
        
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
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        # Get approved staff from default shop
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({
                "message": "No shop configured",
                "staff": [],
                "count": 0
            }, status=status.HTTP_200_OK)
        
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
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # No authentication required - allow anyone to approve staff
        staff_id = request.data.get('staff_id')
        role = request.data.get('role', 'cashier')
        
        if not staff_id:
            return Response({"error": "Staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
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
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        staff_id = request.data.get('staff_id')
        comment = request.data.get('comment', '').strip()
        
        if not staff_id:
            return Response({"error": "Staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
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
            "comment": comment or "No comment provided",
            "removed_staff_id": staff_id
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class DeactivateCashierView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        staff_id = request.data.get('staff_id')
        comment = request.data.get('comment', '').strip()
        
        if not staff_id:
            return Response({"error": "Staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
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
            "comment": comment or "No comment provided",
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
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        staff_id = request.data.get('staff_id')
        comment = request.data.get('comment', '').strip()
        
        if not staff_id:
            return Response({"error": "Staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
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
            "comment": comment or "No comment provided",
            "deleted_staff_id": staff_id
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class InactiveStaffListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({
                "message": "No shop configured",
                "staff": [],
                "count": 0
            }, status=status.HTTP_200_OK)
        
        # Get inactive staff
        inactive_staff = Cashier.objects.filter(shop=shop, status='inactive').order_by('-approved_at')
        
        staff_data = []
        for cashier in inactive_staff:
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
            "message": "Inactive staff retrieved successfully",
            "staff": staff_data,
            "count": len(staff_data)
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ReactivateCashierView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        staff_id = request.data.get('staff_id')
        comment = request.data.get('comment', '').strip()
        
        if not staff_id:
            return Response({"error": "Staff ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the inactive cashier
        try:
            cashier = Cashier.objects.get(id=staff_id, shop=shop, status='inactive')
        except Cashier.DoesNotExist:
            return Response({"error": "Inactive cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Reactivate the cashier
        cashier.status = 'active'
        cashier.save()
        
        return Response({
            "message": f"Cashier {cashier.name} has been reactivated",
            "comment": comment or "No comment provided",
            "cashier": {
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "status": cashier.status,
                "role": cashier.role
            }
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CashierDetailsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        cashier_id = request.data.get('cashier_id')
        
        if not cashier_id:
            return Response({"error": "Cashier ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the cashier
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get cashier activity data
        shifts = Shift.objects.filter(cashier=cashier).order_by('-start_time')[:10]  # Last 10 shifts
        sales = Sale.objects.filter(cashier=cashier).order_by('-created_at')[:20]  # Last 20 sales
        
        # Calculate performance metrics
        total_sales_amount = sales.aggregate(total=Sum('total_amount'))['total'] or 0
        total_shifts = shifts.count()
        total_sales_count = sales.count()
        
        # Calculate shift duration for completed shifts
        completed_shifts = Shift.objects.filter(cashier=cashier, end_time__isnull=False)
        total_hours = 0
        for shift in completed_shifts:
            duration = shift.end_time - shift.start_time
            total_hours += duration.total_seconds() / 3600  # Convert to hours
        
        avg_sales_per_hour = total_sales_amount / total_hours if total_hours > 0 else 0
        avg_sales_per_shift = total_sales_amount / total_shifts if total_shifts > 0 else 0
        
        # Prepare detailed cashier data
        cashier_details = {
            "id": cashier.id,
            "name": cashier.name,
            "email": cashier.email,
            "phone": cashier.phone,
            "status": cashier.status,
            "role": cashier.role,
            "preferred_shift": cashier.preferred_shift,
            "created_at": cashier.created_at.isoformat() if cashier.created_at else None,
            "approved_at": cashier.approved_at.isoformat() if cashier.approved_at else None,
            "approved_by": cashier.approved_by.name if cashier.approved_by else None,
            
            # Performance metrics
            "performance": {
                "total_sales_amount": float(total_sales_amount),
                "total_sales_count": total_sales_count,
                "total_shifts": total_shifts,
                "total_hours_worked": round(total_hours, 2),
                "average_sales_per_hour": round(avg_sales_per_hour, 2),
                "average_sales_per_shift": round(avg_sales_per_shift, 2),
            },
            
            # Recent activity
            "recent_shifts": [
                {
                    "id": shift.id,
                    "start_time": shift.start_time.isoformat(),
                    "end_time": shift.end_time.isoformat() if shift.end_time else None,
                    "total_sales": float(shift.total_sales),
                    "duration_hours": round((shift.end_time - shift.start_time).total_seconds() / 3600, 2) if shift.end_time else None,
                    "status": "Active" if not shift.end_time else "Completed"
                }
                for shift in shifts
            ],
            
            "recent_sales": [
                {
                    "id": sale.id,
                    "total_amount": float(sale.total_amount),
                    "payment_method": sale.payment_method,
                    "status": sale.status,
                    "customer_name": sale.customer_name,
                    "created_at": sale.created_at.isoformat(),
                    "item_count": sale.items.count()
                }
                for sale in sales
            ]
        }
        
        return Response({
            "message": "Cashier details retrieved successfully",
            "cashier": cashier_details
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class EditCashierView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # NO AUTHENTICATION REQUIRED - Public access
        cashier_id = request.data.get('cashier_id')
        
        if not cashier_id:
            return Response({"error": "Cashier ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Find the cashier
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get updated fields
        name = request.data.get('name', cashier.name)
        email_field = request.data.get('email', cashier.email)
        phone = request.data.get('phone', cashier.phone)
        preferred_shift = request.data.get('preferred_shift', cashier.preferred_shift)
        role = request.data.get('role', cashier.role)
        
        # Update cashier
        cashier.name = name
        cashier.email = email_field
        cashier.phone = phone
        cashier.preferred_shift = preferred_shift
        cashier.role = role
        cashier.save()
        
        return Response({
            "message": f"Cashier {cashier.name} has been updated successfully",
            "cashier": {
                "id": cashier.id,
                "name": cashier.name,
                "email": cashier.email,
                "phone": cashier.phone,
                "status": cashier.status,
                "role": cashier.role,
                "preferred_shift": cashier.preferred_shift,
                "updated_at": cashier.approved_at.isoformat() if cashier.approved_at else None
            }
        }, status=status.HTTP_200_OK)