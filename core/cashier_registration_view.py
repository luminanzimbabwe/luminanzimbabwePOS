from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import IntegrityError
from .models import ShopConfiguration, Cashier
from .serializers_new import CashierSerializer

@method_decorator(csrf_exempt, name='dispatch')
class CashierSelfRegistrationView(APIView):
    """
    Endpoint for cashiers to register themselves.
    Creates a cashier with 'pending' status that needs owner approval.
    """
    def post(self, request):
        # Validate required fields
        required_fields = ['name', 'phone', 'password', 'preferred_shift']
        missing_fields = [field for field in required_fields if not request.data.get(field)]
        
        if missing_fields:
            return Response({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get the shop (assuming only one shop per installation)
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({
                "error": "No shop is registered on this device. Please contact your shop owner."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if email is provided and already exists
        email = request.data.get('email')
        if email:
            existing_cashier = Cashier.objects.filter(shop=shop, email=email).first()
            if existing_cashier:
                return Response({
                    "error": "A cashier with this email already exists. Please use a different email or contact the shop owner."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prepare cashier data
        cashier_data = {
            'name': request.data.get('name'),
            'email': request.data.get('email', ''),
            'phone': request.data.get('phone'),
            'password': request.data.get('password'),
            'preferred_shift': request.data.get('preferred_shift'),
            'status': 'pending',  # Always start as pending
            'role': 'cashier'
        }
        
        try:
            # Create the cashier
            cashier = Cashier.objects.create(shop=shop, **cashier_data)
            
            # Hash the password
            cashier.set_password(request.data.get('password'))
            cashier.save()
            
            return Response({
                "message": "Registration submitted successfully",
                "cashier": {
                    "id": cashier.id,
                    "name": cashier.name,
                    "email": cashier.email,
                    "phone": cashier.phone,
                    "preferred_shift": cashier.preferred_shift,
                    "status": cashier.status,
                    "role": cashier.role,
                    "created_at": cashier.created_at.isoformat() if cashier.created_at else None
                }
            }, status=status.HTTP_201_CREATED)
            
        except IntegrityError as e:
            # More specific error handling
            error_msg = str(e).lower()
            if "email" in error_msg:
                return Response({
                    "error": "A cashier with this email already exists. Please use a different email."
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": f"Registration failed due to database constraint: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "error": f"Registration failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)