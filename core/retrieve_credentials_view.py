from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class RetrieveCredentialsView(APIView):
    def post(self, request):
        from .serializers import ResetPasswordSerializer
        from .models import ShopConfiguration
        
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            try:
                shop = ShopConfiguration.objects.get()  # assuming only one shop
                recovery_method = serializer.validated_data['recovery_method']
                
                # Check the recovery method
                if recovery_method == 'shop_owner_master_password':
                    master_password = serializer.validated_data['shop_owner_master_password']
                    if not shop.validate_shop_owner_master_password(master_password):
                        return Response({"error": "Invalid shop owner master password"}, status=status.HTTP_401_UNAUTHORIZED)
                elif recovery_method == 'recovery_codes':
                    recovery_code = serializer.validated_data['recovery_code']
                    if not shop.validate_recovery_code(recovery_code):
                        return Response({"error": "Invalid recovery code"}, status=status.HTTP_401_UNAUTHORIZED)
                elif recovery_method == 'founder_master_password':
                    founder_password = serializer.validated_data['founder_master_password']
                    if not ShopConfiguration.validate_founder_credentials('thisismeprivateisaacngirazi', founder_password):
                        return Response({"error": "Invalid founder master password"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Return existing credentials without changing anything
                return Response({
                    "message": "Credentials retrieved successfully",
                    "shop_id": str(shop.shop_id),
                    "register_id": shop.register_id,
                    "name": shop.name,
                    "email": shop.email,
                    "phone": shop.phone,
                    "password": "",  # Don't expose the actual password for security
                    "shop_owner_master_password": shop.shop_owner_master_password,
                    "recovery_codes": shop.recovery_codes,
                    "device_id": shop.device_id,
                    "owner_id": shop.owner_id,
                    "api_key": shop.api_key,
                    "version": shop.version,
                    "checksum": shop.checksum,
                    "registration_time": shop.registration_time.isoformat() if shop.registration_time else None
                }, status=status.HTTP_200_OK)
            except ShopConfiguration.DoesNotExist:
                return Response({"error": "Shop not registered"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)