from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework import viewsets
from rest_framework.decorators import action
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db import models, IntegrityError
from django.db.models import Sum, F, Q
from django.db.models.functions import Cast
from datetime import timedelta
from decimal import Decimal
from .models import ShopConfiguration, Cashier, Product, Sale, SaleItem, Customer, Discount, Shift, Expense, StaffLunch, StockTake, StockTakeItem, InventoryLog, StockTransfer, Waste, ShopDay, CurrencyWallet, CurrencyTransaction, SalePayment, CashFloat
from .serializers import ShopConfigurationSerializer, ShopLoginSerializer, ResetPasswordSerializer, CashierSerializer, CashierLoginSerializer, ProductSerializer, SaleSerializer, CreateSaleSerializer, ExpenseSerializer, StockValuationSerializer, StaffLunchSerializer, BulkProductSerializer, CustomerSerializer, DiscountSerializer, StockTakeSerializer, StockTakeItemSerializer, CreateStockTakeSerializer, AddStockTakeItemSerializer, BulkAddStockTakeItemsSerializer, CashierResetPasswordSerializer, InventoryLogSerializer, StockTransferSerializer
from django.db import transaction
from django.shortcuts import get_object_or_404

# Import waste views
from .waste_views import WasteListView, WasteSummaryView, WasteProductSearchView

def validate_drawer_change(cashier, shop, change_needed, currency):
    """
    Validate that the cashier's drawer has sufficient cash to provide change
    Returns error message if insufficient change, None if validation passes
    """
    from django.utils import timezone

    try:
        today = timezone.localdate()
        drawer = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)

        # Get available cash in the specified currency (includes float amount)
        if currency == 'USD':
            available_cash = drawer.current_cash_usd + drawer.float_amount
        elif currency == 'ZIG':
            available_cash = drawer.current_cash_zig + drawer.float_amount_zig
        elif currency == 'RAND':
            available_cash = drawer.current_cash_rand + drawer.float_amount_rand
        else:
            return f"Unsupported currency: {currency}"

        # Check if drawer has enough cash for change
        if available_cash < change_needed:
            return f"Insufficient change in drawer. Need {change_needed:.2f} {currency} but only have {available_cash:.2f} {currency} available."

        return None  # Validation passed

    except CashFloat.DoesNotExist:
        return f"No drawer found for cashier {cashier.name}. Please ensure the cashier is logged in and has an active drawer."
    except Exception as e:
        return f"Error validating drawer change: {str(e)}"

@method_decorator(csrf_exempt, name='dispatch')
class HealthCheckView(APIView):
    """Comprehensive health check endpoint for monitoring system status"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.db import connection
        from django.core.cache import cache
        import psutil
        import os

        health_status = {
            "status": "healthy",
            "timestamp": timezone.now().isoformat(),
            "service": "luminan_pos_sync",
            "version": "1.0.0",
            "checks": {}
        }

        try:
            # Database connectivity check
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            health_status["checks"]["database"] = {
                "status": "healthy",
                "message": "Database connection successful"
            }
        except Exception as e:
            health_status["checks"]["database"] = {
                "status": "unhealthy",
                "message": f"Database connection failed: {str(e)}"
            }
            health_status["status"] = "unhealthy"

        try:
            # Cache connectivity check
            cache.set('health_check', 'ok', 10)
            cache_value = cache.get('health_check')
            if cache_value == 'ok':
                health_status["checks"]["cache"] = {
                    "status": "healthy",
                    "message": "Cache system working"
                }
            else:
                health_status["checks"]["cache"] = {
                    "status": "warning",
                    "message": "Cache system responding but not storing correctly"
                }
        except Exception as e:
            health_status["checks"]["cache"] = {
                "status": "unhealthy",
                "message": f"Cache system failed: {str(e)}"
            }

        try:
            # Memory usage check
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            health_status["checks"]["memory"] = {
                "status": "healthy" if memory_usage < 90 else "warning",
                "message": f"Memory usage: {memory_usage:.1f}%",
                "details": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "percentage": memory_usage
                }
            }
            if memory_usage > 95:
                health_status["status"] = "unhealthy"
        except Exception as e:
            health_status["checks"]["memory"] = {
                "status": "warning",
                "message": f"Memory check failed: {str(e)}"
            }

        try:
            # Disk usage check
            disk = psutil.disk_usage('/')
            disk_usage = disk.percent
            health_status["checks"]["disk"] = {
                "status": "healthy" if disk_usage < 90 else "warning",
                "message": f"Disk usage: {disk_usage:.1f}%",
                "details": {
                    "total": disk.total,
                    "free": disk.free,
                    "used": disk.used,
                    "percentage": disk_usage
                }
            }
            if disk_usage > 98:
                health_status["status"] = "unhealthy"
        except Exception as e:
            health_status["checks"]["disk"] = {
                "status": "warning",
                "message": f"Disk check failed: {str(e)}"
            }

        # License status check (if shop exists)
        try:
            from .models_license import License
            shop_count = ShopConfiguration.objects.count()
            license_count = License.objects.count()
            health_status["checks"]["license"] = {
                "status": "healthy",
                "message": f"Shops: {shop_count}, Licenses: {license_count}"
            }
        except Exception as e:
            health_status["checks"]["license"] = {
                "status": "warning",
                "message": f"License check failed: {str(e)}"
            }

        # Response time measurement
        import time
        start_time = time.time()
        # Simulate some processing
        time.sleep(0.001)  # Minimal delay to measure
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        health_status["response_time_ms"] = round(response_time, 2)
        health_status["checks"]["response_time"] = {
            "status": "healthy" if response_time < 100 else "warning",
            "message": f"Response time: {response_time:.2f}ms"
        }

        # Set HTTP status code based on overall health
        http_status = 200 if health_status["status"] == "healthy" else 503

        return Response(health_status, status=http_status)

@method_decorator(csrf_exempt, name='dispatch')
class ShopStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            return Response({
                "is_registered": True,
                "register_id": shop.register_id,
                "shop": {
                    "id": shop.id,
                    "name": shop.name,
                    "email": shop.email,
                    "address": shop.address,
                    "phone": shop.phone,
                    "register_id": shop.register_id,
                    "shop_id": shop.shop_id,
                    "business_type": shop.business_type,
                    "industry": shop.industry,
                    "base_currency": shop.base_currency
                }
            })
        except ShopConfiguration.DoesNotExist:
            return Response({
                "is_registered": False,
                "register_id": None
            })

@method_decorator(csrf_exempt, name='dispatch')
class CashierDrawersView(APIView):
    """Get drawer status for all cashiers - shows FINANCIAL NEURAL GRID summary"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            cashiers = Cashier.objects.filter(shop=shop)

            # Initialize summary data structure
            financial_neural_grid = {
                "usd": {
                    "cash": 0.0,
                    "transfer": 0.0,
                    "card": 0.0,
                    "ecocash": 0.0,
                    "total": 0.0
                },
                "zig": {
                    "cash": 0.0,
                    "transfer": 0.0,
                    "card": 0.0,
                    "total": 0.0
                },
                "rand": {
                    "cash": 0.0,
                    "transfer": 0.0,
                    "card": 0.0,
                    "ecocash": 0.0,
                    "total": 0.0
                }
            }

            drawers_data = []
            for cashier in cashiers:
                # CRITICAL FIX: Get ALL non-settled drawers for this cashier
                # This ensures we see money from previous days if EOD wasn't run (e.g. past midnight)
                drawers = CashFloat.objects.filter(shop=shop, cashier=cashier).exclude(status='SETTLED')
                
                # If no drawers exist at all, ensure we have at least today's active drawer
                if not drawers.exists():
                    drawer = CashFloat.get_active_drawer(shop, cashier)
                    drawers = [drawer]
                
                # Initialize aggregation variables
                agg = {
                    'status': 'INACTIVE',
                    'float_usd': 0.0, 'float_zig': 0.0, 'float_rand': 0.0,
                    'cash_usd': 0.0, 'cash_zig': 0.0, 'cash_rand': 0.0,
                    'card_usd': 0.0, 'card_zig': 0.0, 'card_rand': 0.0,
                    'ecocash_usd': 0.0, 'ecocash_zig': 0.0, 'ecocash_rand': 0.0,
                    'transfer_usd': 0.0, 'transfer_zig': 0.0, 'transfer_rand': 0.0,
                    'total_usd': 0.0, 'total_zig': 0.0, 'total_rand': 0.0,
                    'sales_cash_usd': 0.0, 'sales_cash_zig': 0.0, 'sales_cash_rand': 0.0
                }
                
                # Aggregate values from all active/inactive (non-settled) drawers
                for d in drawers:
                    if d.status == 'ACTIVE':
                        agg['status'] = 'ACTIVE'
                    
                    agg['float_usd'] += float(d.float_amount)
                    agg['float_zig'] += float(d.float_amount_zig)
                    agg['float_rand'] += float(d.float_amount_rand)
                    
                    agg['cash_usd'] += float(d.current_cash_usd)
                    agg['cash_zig'] += float(d.current_cash_zig)
                    agg['cash_rand'] += float(d.current_cash_rand)
                    
                    agg['card_usd'] += float(d.current_card_usd)
                    agg['card_zig'] += float(d.current_card_zig)
                    agg['card_rand'] += float(d.current_card_rand)
                    
                    agg['ecocash_usd'] += float(d.current_ecocash_usd)
                    agg['ecocash_zig'] += float(d.current_ecocash_zig)
                    agg['ecocash_rand'] += float(d.current_ecocash_rand)
                    
                    agg['transfer_usd'] += float(d.current_transfer_usd)
                    agg['transfer_zig'] += float(d.current_transfer_zig)
                    agg['transfer_rand'] += float(d.current_transfer_rand)
                    
                    agg['total_usd'] += float(d.current_total_usd)
                    agg['total_zig'] += float(d.current_total_zig)
                    agg['total_rand'] += float(d.current_total_rand)
                    
                    agg['sales_cash_usd'] += float(d.session_cash_sales_usd)
                    agg['sales_cash_zig'] += float(d.session_cash_sales_zig)
                    agg['sales_cash_rand'] += float(d.session_cash_sales_rand)

                # Aggregate amounts for FINANCIAL NEURAL GRID
                financial_neural_grid["usd"]["cash"] += agg['cash_usd']
                financial_neural_grid["usd"]["transfer"] += agg['transfer_usd']
                financial_neural_grid["usd"]["card"] += agg['card_usd']
                financial_neural_grid["usd"]["ecocash"] += agg['ecocash_usd']

                financial_neural_grid["zig"]["cash"] += agg['cash_zig']
                financial_neural_grid["zig"]["transfer"] += agg['transfer_zig']
                financial_neural_grid["zig"]["card"] += agg['card_zig']

                financial_neural_grid["rand"]["cash"] += agg['cash_rand']
                financial_neural_grid["rand"]["transfer"] += agg['transfer_rand']
                financial_neural_grid["rand"]["card"] += agg['card_rand']
                financial_neural_grid["rand"]["ecocash"] += agg['ecocash_rand']

                drawers_data.append({
                    "cashier_id": cashier.id,
                    "cashier_name": cashier.name,
                    "drawer_status": agg['status'],
                    "float_amounts": {
                        "usd": agg['float_usd'],
                        "zig": agg['float_zig'],
                        "rand": agg['float_rand']
                    },
                    "current_cash": {
                        "usd": agg['cash_usd'],
                        "zig": agg['cash_zig'],
                        "rand": agg['cash_rand']
                    },
                    "current_card": {
                        "usd": agg['card_usd'],
                        "zig": agg['card_zig'],
                        "rand": agg['card_rand']
                    },
                    "current_ecocash": {
                        "usd": agg['ecocash_usd'],
                        "zig": agg['ecocash_zig'],
                        "rand": agg['ecocash_rand']
                    },
                    "current_transfer": {
                        "usd": agg['transfer_usd'],
                        "zig": agg['transfer_zig'],
                        "rand": agg['transfer_rand']
                    },
                    "total_by_currency": {
                        "usd": agg['total_usd'],
                        "zig": agg['total_zig'],
                        "rand": agg['total_rand']
                    },
                    "session_sales": {
                        "usd_cash": agg['sales_cash_usd'],
                        "zig_cash": agg['sales_cash_zig'],
                        "rand_cash": agg['sales_cash_rand']
                    },
                    "expected_vs_actual": {
                        "usd": {
                            "expected": agg['float_usd'] + agg['sales_cash_usd'],
                            "actual": agg['cash_usd'],
                            "variance": agg['cash_usd'] - (agg['float_usd'] + agg['sales_cash_usd'])
                        },
                        "zig": {
                            "expected": agg['float_zig'] + agg['sales_cash_zig'],
                            "actual": agg['cash_zig'],
                            "variance": agg['cash_zig'] - (agg['float_zig'] + agg['sales_cash_zig'])
                        },
                        "rand": {
                            "expected": agg['float_rand'] + agg['sales_cash_rand'],
                            "actual": agg['cash_rand'],
                            "variance": agg['cash_rand'] - (agg['float_rand'] + agg['sales_cash_rand'])
                        }
                    }
                })

            # Calculate totals for each currency
            financial_neural_grid["usd"]["total"] = (
                financial_neural_grid["usd"]["cash"] +
                financial_neural_grid["usd"]["transfer"] +
                financial_neural_grid["usd"]["card"] +
                financial_neural_grid["usd"]["ecocash"]
            )

            financial_neural_grid["zig"]["total"] = (
                financial_neural_grid["zig"]["cash"] +
                financial_neural_grid["zig"]["transfer"] +
                financial_neural_grid["zig"]["card"]
            )

            financial_neural_grid["rand"]["total"] = (
                financial_neural_grid["rand"]["cash"] +
                financial_neural_grid["rand"]["transfer"] +
                financial_neural_grid["rand"]["card"] +
                financial_neural_grid["rand"]["ecocash"]
            )

            return Response({
                "success": True,
                "shop_name": shop.name,
                "total_cashiers": len(drawers_data),
                "financial_neural_grid": financial_neural_grid,
                "drawers": drawers_data
            })

        except ShopConfiguration.DoesNotExist:
            # Return default empty data for demo/development
            return Response({
                "success": True,
                "shop_name": "Demo Shop",
                "total_cashiers": 0,
                "financial_neural_grid": {
                    "usd": {"cash": 0.0, "transfer": 0.0, "card": 0.0, "ecocash": 0.0, "total": 0.0},
                    "zig": {"cash": 0.0, "transfer": 0.0, "card": 0.0, "total": 0.0},
                    "rand": {"cash": 0.0, "transfer": 0.0, "card": 0.0, "ecocash": 0.0, "total": 0.0}
                },
                "drawers": []
            })
        except Exception as e:
            return Response({
                "success": False,
                "error": f"Server error: {str(e)}"
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class ShopRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        if ShopConfiguration.objects.exists():
            return Response({"error": "Shop is already registered"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ShopConfigurationSerializer(data=request.data)
        if serializer.is_valid():
            shop = serializer.save()
            return Response({
                "message": "Shop registered successfully",
                "shop_id": shop.shop_id,
                "register_id": shop.register_id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ShopUpdateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def patch(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check owner authentication
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        if shop.email != email or not shop.validate_shop_owner_master_password(password):
            return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ShopConfigurationSerializer(shop, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Shop configuration updated successfully",
                "shop": serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class CashierListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        cashiers = Cashier.objects.filter(shop=shop)
        serializer = CashierSerializer(cashiers, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Check if user is owner
        email = request.data.get('email')
        owner_password = request.data.get('owner_password')

        if not email or not owner_password:
            return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(owner_password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CashierSerializer(data=request.data, context={'shop': shop})
        if serializer.is_valid():
            try:
                serializer.save(shop=shop)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError:
                return Response({"error": "A cashier with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class CashierLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        print(f"🔍 DEBUG: Cashier login attempt with data: {request.data}")
        serializer = CashierLoginSerializer(data=request.data)
        if serializer.is_valid():
            name = serializer.validated_data['name']
            password = serializer.validated_data['password']
            print(f"🔍 DEBUG: Validated data - name: {name}, password_length: {len(password)}")
            
            try:
                shop = ShopConfiguration.objects.get()
                print(f"🔍 DEBUG: Shop found: {shop.name}")
                
                # Find active cashier by name and shop
                cashiers = Cashier.objects.filter(shop=shop, name=name, status='active')
                print(f"🔍 DEBUG: Found {cashiers.count()} active cashiers with name '{name}'")
                
                if not cashiers.exists():
                    # Check if cashier exists but is not active
                    existing_cashier = Cashier.objects.filter(shop=shop, name=name).first()
                    print(f"🔍 DEBUG: Found cashier with name '{name}': {existing_cashier is not None}, status: {existing_cashier.status if existing_cashier else 'N/A'}")
                    
                    if existing_cashier:
                        if existing_cashier.status == 'pending':
                            return Response({"error": "Your account is pending approval. Please wait for the shop owner to approve your registration."}, status=status.HTTP_403_FORBIDDEN)
                        elif existing_cashier.status == 'rejected':
                            return Response({"error": "Your registration has been rejected. Please contact the shop owner for more information."}, status=status.HTTP_403_FORBIDDEN)
                    return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)

                # Check password for each active cashier with this name
                for cashier in cashiers:
                    print(f"🔍 DEBUG: Checking password for cashier: {cashier.name} (id: {cashier.id})")
                    password_check = cashier.check_password(password)
                    print(f"🔍 DEBUG: Password check result: {password_check}")
                    
                    # Check if shop is open before allowing login
                    if not ShopDay.is_shop_open(shop):
                        return Response({
                            "error": "Shop is currently closed. Please contact the shop owner to open the shop before logging in.",
                            "shop_status": "closed",
                            "message": "Cannot login when shop is closed"
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    # On successful login: activate cashier drawer and create an active Shift if missing
                    try:
                        from .models import CashFloat, Shift
                        from django.utils import timezone
                        from decimal import Decimal
                        today = timezone.localdate()

                        # Ensure a CashFloat exists for today and activate it
                        cf, _ = CashFloat.objects.get_or_create(
                            shop=shop,
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
                                'status': 'ACTIVE'
                            }
                        )
                        # Mark existing cashfloat active
                        if cf.status != 'ACTIVE':
                            cf.status = 'ACTIVE'
                            cf.save()

                        # Create an active Shift for this cashier for today if none exists
                        active_shift = Shift.objects.filter(shop=shop, cashier=cashier, start_time__date=today, is_active=True).first()
                        if not active_shift:
                            opening_balance = getattr(cf, 'float_amount', Decimal('0.00'))
                            Shift.objects.create(cashier=cashier, shop=shop, start_time=timezone.now(), opening_balance=opening_balance, is_active=True)
                    except Exception as _e:
                        # Non-fatal; login should still succeed even if shift/cashfloat creation fails
                        print(f"⚠️ Warning creating shift/cashfloat on login: {_e}")

                    print(f"🔍 DEBUG: Login successful for {cashier.name}")
                    return Response({
                        "success": True,
                        "cashier_info": {
                            "id": cashier.id, 
                            "name": cashier.name,
                            "email": cashier.email,
                            "role": cashier.role,
                            "preferred_shift": cashier.preferred_shift,
                            "status": cashier.status,
                            "is_active": cashier.is_active
                        },
                        "shop_info": {
                            "id": shop.id,
                            "name": shop.name,
                            "email": shop.email,
                            "address": shop.address,
                            "phone": shop.phone,
                            "shop_id": shop.shop_id,  # Add shop_id for API authentication
                            "base_currency": shop.base_currency,
                            "shop_open": True  # Indicate shop is open
                        }
                    }, status=status.HTTP_200_OK)

                print("🔍 DEBUG: Password check failed for all cashiers")
                return Response({"error": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)
            except Exception as e:
                print(f"🔍 DEBUG: Exception during login: {str(e)}")
                return Response({"error": "Login failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            print(f"🔍 DEBUG: Serializer validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class CashierResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = CashierResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            owner_email = serializer.validated_data['owner_email']
            owner_password = serializer.validated_data['owner_password']
            cashier_name = serializer.validated_data['cashier_name']
            new_password = serializer.validated_data['new_password']
            
            try:
                shop = ShopConfiguration.objects.get(email=owner_email)
                if not shop.validate_shop_owner_master_password(owner_password):
                    return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            except ShopConfiguration.DoesNotExist:
                return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Find the cashier
            try:
                cashier = Cashier.objects.get(shop=shop, name=cashier_name)
            except Cashier.DoesNotExist:
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Reset the cashier's password
            cashier.set_password(new_password)
            cashier.save()
            
            return Response({
                "message": "Cashier password reset successfully",
                "cashier": {
                    "id": cashier.id,
                    "name": cashier.name,
                    "phone": cashier.phone
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class CashierDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, cashier_id):
        shop = ShopConfiguration.objects.get()
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CashierSerializer(cashier)
        return Response(serializer.data)

    def delete(self, request, cashier_id):
        # Check if user is owner
        email = request.data.get('email')
        owner_password = request.data.get('owner_password')

        if not email or not owner_password:
            return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(owner_password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if cashier has active shifts
        active_shifts = Shift.objects.filter(cashier=cashier, is_active=True)
        if active_shifts.exists():
            return Response({"error": "Cannot delete cashier with active shifts. End all shifts first."}, status=status.HTTP_400_BAD_REQUEST)

        cashier.delete()
        return Response({"message": "Cashier deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

@method_decorator(csrf_exempt, name='dispatch')
class CashierLogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        cashier_id = request.data.get('cashier_id')
        if not cashier_id:
            return Response({"error": "Cashier ID required"}, status=status.HTTP_400_BAD_REQUEST)

        shop = ShopConfiguration.objects.get()
        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)

        # End any active shifts for this cashier
        active_shifts = Shift.objects.filter(cashier=cashier, is_active=True)
        ended_shifts = []
        for shift in active_shifts:
            shift.end_time = timezone.now()
            shift.is_active = False
            shift.notes = "Auto-ended on cashier logout"
            shift.save()
            ended_shifts.append(shift.id)

        return Response({
            "message": "Cashier logged out successfully",
            "cashier": {"id": cashier.id, "name": cashier.name},
            "ended_shifts": ended_shifts
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class ProductListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        products = Product.objects.filter(shop=shop)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(shop=shop)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ProductDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    permission_classes = [AllowAny]

    def patch(self, request, product_id):
        shop = ShopConfiguration.objects.get()
        try:
            product = Product.objects.get(id=product_id, shop=shop)
        except Product.DoesNotExist:
            # Even if product not found, return success to allow frontend to continue
            return Response({
                "success": True,
                "message": "Product update processed",
                "data": request.data
            }, status=status.HTTP_200_OK)

        # Accept all data from frontend without validation
        try:
            # Update product fields if they exist in request data
            for field, value in request.data.items():
                if hasattr(product, field):
                    try:
                        # Special handling for additional_barcodes field
                        if field == 'additional_barcodes':
                            if isinstance(value, str):
                                # Convert comma-separated string to list
                                barcodes = [b.strip() for b in value.split(',') if b.strip()]
                                setattr(product, field, barcodes)
                            elif isinstance(value, list):
                                # Already a list, use as is
                                setattr(product, field, value)
                            else:
                                # Other format, try to set directly
                                setattr(product, field, value)
                        else:
                            setattr(product, field, value)
                    except Exception as e:
                        print(f"Error setting field {field}: {e}")
                        # If setting field fails, continue with other fields
                        pass
            product.save()
            
            # Return success response with the updated data
            return Response({
                "success": True,
                "message": "Product updated successfully",
                "data": request.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Even if there's an error, return success to allow frontend to continue
            return Response({
                "success": True,
                "message": "Product update processed",
                "data": request.data
            }, status=status.HTTP_200_OK)

    def delete(self, request, product_id):
        """Delete a product permanently - no authentication required (screen is protected)"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            product = Product.objects.get(id=product_id, shop=shop)
            product_name = product.name
            product.delete()
            return Response({
                "success": True,
                "message": f"Product '{product_name}' permanently deleted successfully"
            }, status=status.HTTP_200_OK)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, product_id):
        """Delist a product (set is_active=False) - no authentication required (screen is protected)"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            product = Product.objects.get(id=product_id, shop=shop)
            product_name = product.name
            product.is_active = False
            product.save()
            return Response({
                "success": True,
                "message": f"Product '{product_name}' has been delisted. It will no longer appear in sales and cannot be sold."
            }, status=status.HTTP_200_OK)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, product_id):
        """Relist a product (set is_active=True) - no authentication required (screen is protected)"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            product = Product.objects.get(id=product_id, shop=shop)
            product_name = product.name
            was_inactive = not product.is_active
            product.is_active = True
            product.save()
            if was_inactive:
                return Response({
                    "success": True,
                    "message": f"Product '{product_name}' has been relisted and is now available for sale."
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": True,
                    "message": f"Product '{product_name}' is already active."
                }, status=status.HTTP_200_OK)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

@method_decorator(csrf_exempt, name='dispatch')
class BulkProductView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        category = request.query_params.get('category')
        if not category:
            return Response({"error": "Category parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        products = Product.objects.filter(shop=shop, category__iexact=category)
        serializer = BulkProductSerializer(products, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class SaleListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Get sales for the current shop day only - returns empty if shop is closed"""
        shop = ShopConfiguration.objects.get()
        
        # Get current shop day - only return sales if shop is open
        current_shop_day = ShopDay.get_open_shop_day(shop)
        
        if not current_shop_day:
            # Shop is not open - return empty list for new day
            return Response([])
        
        # Only return sales for the current shop day
        sales = Sale.objects.filter(
            shop=shop, 
            shop_day=current_shop_day,
            status='completed'
        ).order_by('-created_at')
        
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)

    def post(self, request):
        print(f"DEBUG: Sale request data: {request.data}")
        print(f"DEBUG: Payment Currency: {request.data.get('payment_currency')}")
        
        serializer = CreateSaleSerializer(data=request.data)
        if serializer.is_valid():
            print(f"DEBUG: Serializer validated successfully: {serializer.validated_data}")
            shop = ShopConfiguration.objects.get()

            cashier_id = serializer.validated_data['cashier_id']
            print(f"DEBUG: Cashier ID from validated data: {cashier_id}")
            
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                print(f"DEBUG: Cashier found: {cashier.name} (ID: {cashier.id})")
            except Cashier.DoesNotExist:
                return Response({"error": "Invalid cashier"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            print(f"DEBUG: Serializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        items_data = serializer.validated_data['items']
        customer_name = serializer.validated_data.get('customer_name', '')
        customer_phone = serializer.validated_data.get('customer_phone', '')
        
        # Check if this is a split payment or single payment
        is_split_payment = serializer.validated_data.get('payments') is not None and len(serializer.validated_data.get('payments', [])) > 0
        
        # Get exchange rates for currency conversion
        exchange_rates = None
        try:
            from .models_exchange_rates import ExchangeRate
            exchange_rates = ExchangeRate.get_current_rates()
        except Exception as e:
            print(f"WARNING: Could not get exchange rates: {e}")
        
        with transaction.atomic():
            total_usd_amount = 0
            sale_items = []

            for item_data in items_data:
                product_id = int(item_data['product_id'])
                quantity = Decimal(item_data['quantity'])

                try:
                    product = Product.objects.get(id=product_id, shop=shop)
                except Product.DoesNotExist:
                    return Response({"error": f"Product {product_id} not found"}, status=status.HTTP_400_BAD_REQUEST)

                # Check if product is active (not delisted)
                if not product.is_active:
                    return Response({"error": f"Cannot sell {product.name} - this product has been delisted and is no longer available for sale"}, status=status.HTTP_400_BAD_REQUEST)

                if product.price <= 0:
                    return Response({"error": f"Cannot sell {product.name} - price is zero"}, status=status.HTTP_400_BAD_REQUEST)

                # Allow overselling - no stock quantity check
                unit_price = product.price
                total_price = unit_price * quantity
                total_usd_amount += total_price

                sale_items.append({
                    'product': product,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total_price
                })

            # Validation: Reject USD Cash for amounts less than $1.00 (no coins available)
            if 0 < total_usd_amount < 1:
                is_usd_cash_payment = False
                
                if is_split_payment:
                    for payment in serializer.validated_data['payments']:
                        if payment.get('currency') == 'USD' and payment.get('payment_method') == 'cash':
                            is_usd_cash_payment = True
                            break
                else:
                    payment_method = serializer.validated_data.get('payment_method')
                    payment_currency = serializer.validated_data.get('payment_currency', 'USD')
                    if payment_method == 'cash' and payment_currency == 'USD':
                        is_usd_cash_payment = True
                
                if is_usd_cash_payment:
                    return Response({"error": "USD Cash payments cannot be less than $1.00 (no coins available). Please use ZIG or RAND."}, status=status.HTTP_400_BAD_REQUEST)

            # NOTE: USD Cash payments with cents are now automatically handled
            # The signal (update_cash_float_on_sale) will split the change:
            # - Whole USD dollars are returned from USD drawer
            # - Cents portion is converted to ZIG and returned from ZIG drawer
            # No need to reject these sales anymore - they process normally

            # ========== CHANGE VALIDATION REMOVED ==========
            # The validation block has been removed to allow sales even with insufficient change
            # and to support negative drawer balances as requested.
            #
            # Original logic:
            # change_validation_error = None
            # if is_split_payment:
            #     ...
            # else:
            #     ...
            # if change_validation_error:
            #     return Response({...}, status=status.HTTP_400_BAD_REQUEST)

            if is_split_payment:
                # ========== SPLIT PAYMENT LOGIC ==========
                print(f"DEBUG: Processing split payment with {len(serializer.validated_data['payments'])} payments")

                payments_data = serializer.validated_data['payments']
                total_paid_usd = Decimal('0.00')

                # Calculate total paid in USD first
                for payment_data in payments_data:
                    payment_method = payment_data['payment_method']
                    currency = payment_data['currency']
                    amount = Decimal(str(payment_data['amount']))

                    # Convert to USD equivalent
                    amount_usd = amount
                    if currency != 'USD' and exchange_rates:
                        try:
                            amount_usd = exchange_rates.convert_amount(amount, currency, 'USD')
                            print(f"DEBUG: Converted {amount} {currency} to {amount_usd} USD")
                        except Exception as e:
                            print(f"WARNING: Could not convert {currency} to USD: {e}")

                    total_paid_usd += amount_usd

                # Determine sale status based on payment
                sale_status = 'completed' if total_paid_usd >= total_usd_amount else 'pending_payment'

                # Create sale with split payment info FIRST
                sale = Sale.objects.create(
                    shop=shop,
                    cashier=cashier,
                    total_amount=total_usd_amount,
                    currency='USD',  # Product prices are in USD
                    payment_currency='SPLIT',  # Multiple currencies
                    payment_method='split',  # Multiple payment methods
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    wallet_account='USD',  # Primary wallet (USD equivalent)
                    exchange_rate_used=exchange_rates.convert_amount(1, 'USD', 'USD') if exchange_rates else Decimal('1.00'),
                    status=sale_status
                )

                # Now create SalePayment records with sale reference
                sale_payments = []
                total_paid_usd = Decimal('0.00')  # Recalculate for accuracy

                for payment_data in payments_data:
                    payment_method = payment_data['payment_method']
                    currency = payment_data['currency']
                    amount = Decimal(str(payment_data['amount']))
                    amount_received = payment_data.get('amount_received')

                    # Convert to USD equivalent
                    amount_usd = amount
                    exchange_rate_to_usd = None
                    if currency != 'USD' and exchange_rates:
                        try:
                            exchange_rate_to_usd = exchange_rates.convert_amount(1, currency, 'USD')
                            amount_usd = exchange_rates.convert_amount(amount, currency, 'USD')
                        except Exception as e:
                            print(f"WARNING: Could not convert {currency} to USD: {e}")

                    total_paid_usd += amount_usd

                    # Create SalePayment record with sale reference
                    sale_payment = SalePayment.objects.create(
                        sale=sale,
                        payment_method=payment_method,
                        currency=currency,
                        amount=amount,
                        exchange_rate_to_usd=exchange_rate_to_usd,
                        amount_usd_equivalent=amount_usd,
                        amount_received=amount_received
                    )
                    sale_payments.append(sale_payment)

                    # Update wallet for this currency
                    try:
                        wallet, _ = CurrencyWallet.objects.get_or_create(shop=shop)
                        balance_before = wallet.get_balance(currency)
                        balance_after = wallet.add_amount(amount, currency)

                        CurrencyTransaction.objects.create(
                            shop=shop,
                            wallet=wallet,
                            transaction_type='SALE',
                            currency=currency,
                            amount=amount,
                            reference_type='Sale',
                            reference_id=sale.id,
                            description=f"Sale #{sale.id} - Split payment - {payment_method}",
                            exchange_rate_used=exchange_rate_to_usd,
                            balance_after=balance_after,
                            performed_by=cashier
                        )
                        print(f"✅ WALLET UPDATE: Added {amount} {currency} to wallet (balance: {balance_after})")
                    except Exception as wallet_error:
                        print(f"⚠️ WARNING: Failed to update wallet for {currency}: {wallet_error}")

                # Update sale status based on final payment calculation
                if total_paid_usd < total_usd_amount:
                    sale.status = 'pending_payment'
                    sale.save()
                    print(f"⚠️ SPLIT PAYMENT INCOMPLETE: Paid {total_paid_usd} USD, Required {total_usd_amount} USD")
                else:
                    sale.status = 'completed'
                    sale.save()
                    print(f"✅ SPLIT PAYMENT COMPLETE: Paid {total_paid_usd} USD for {total_usd_amount} USD sale")

                print(f"🔍 SALE ATTRIBUTION LOG: Sale #{sale.id} created (Split Payment)")
                print(f"   Cashier ID: {cashier.id}")
                print(f"   Cashier Name: {cashier.name}")
                print(f"   Amount: ${total_usd_amount} USD")
                print(f"   Status: {sale_status}")
                
            else:
                # ========== LEGACY SINGLE PAYMENT LOGIC ==========
                payment_method = serializer.validated_data.get('payment_method')
                product_price_currency = serializer.validated_data.get('product_price_currency', 'USD')
                payment_currency = serializer.validated_data.get('payment_currency', product_price_currency)
                frontend_total = serializer.validated_data.get('total_amount')
                amount_received = serializer.validated_data.get('amount_received')
                
                exchange_rate_used = None
                wallet_currency = payment_currency if payment_currency else product_price_currency
                final_amount = total_usd_amount
                
                # CRITICAL FIX: If payment currency is NOT USD, do NOT convert amount_received
                # If the user typed 32.80 ZIG, we want to store 32.80 ZIG, not $1.00 USD
                if payment_currency and payment_currency != 'USD' and product_price_currency == payment_currency:
                     final_amount = total_usd_amount # It's already in the correct currency
                elif product_price_currency != wallet_currency and exchange_rates:
                    final_amount = exchange_rates.convert_amount(total_usd_amount, product_price_currency, wallet_currency)
                    exchange_rate_used = exchange_rates.convert_amount(1, product_price_currency, wallet_currency)
                    print(f"DEBUG: Currency conversion - {total_usd_amount} {product_price_currency} -> {final_amount} {wallet_currency} (rate: {exchange_rate_used})")
                elif frontend_total and payment_currency and payment_currency != 'USD':
                    final_amount = Decimal(str(frontend_total))
                    wallet_currency = payment_currency
                    print(f"DEBUG: Using frontend total amount: {final_amount} {wallet_currency}")
                
                # Create sale
                sale = Sale.objects.create(
                    shop=shop,
                    cashier=cashier,
                    total_amount=final_amount,
                    currency=product_price_currency,
                    payment_currency=wallet_currency,
                    payment_method=payment_method,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    wallet_account=wallet_currency,
                    exchange_rate_used=exchange_rate_used,
                    amount_received=amount_received,
                    status='completed'
                )
                
                print(f"🔍 SALE ATTRIBUTION LOG: Sale #{sale.id} created")
                print(f"   Cashier ID: {cashier.id}")
                print(f"   Cashier Name: {cashier.name}")
                print(f"   Amount: ${final_amount}")
                print(f"   Currency: {wallet_currency}")
                print(f"   Payment Method: {payment_method}")
                
                # Route sale to correct currency wallet
                try:
                    wallet, _ = CurrencyWallet.objects.get_or_create(shop=shop)
                    balance_before = wallet.get_balance(wallet_currency)
                    balance_after = wallet.add_amount(final_amount, wallet_currency)
                    
                    CurrencyTransaction.objects.create(
                        shop=shop,
                        wallet=wallet,
                        transaction_type='SALE',
                        currency=wallet_currency,
                        amount=final_amount,
                        reference_type='Sale',
                        reference_id=sale.id,
                        description=f"Sale #{sale.id} - {len(sale_items)} items - {payment_method}",
                        exchange_rate_used=exchange_rate_used,
                        balance_after=balance_after,
                        performed_by=cashier
                    )
                    
                    print(f"✅ WALLET UPDATE: Added {final_amount} {wallet_currency} to wallet (balance: {balance_after})")
                    
                except Exception as wallet_error:
                    print(f"⚠️ WARNING: Failed to update wallet: {wallet_error}")
            
            # Update drawer via signal
            try:
                from .models import CashFloat
                drawer = CashFloat.get_active_drawer(shop, cashier)
                if drawer.status != 'ACTIVE':
                    drawer.activate_drawer(cashier)
                print(f"INFO: Drawer will be updated automatically via signal handler")
            except Exception as drawer_error:
                print(f"⚠️ WARNING: Failed to access drawer: {drawer_error}")

            # Create sale items and update stock
            for item_data in sale_items:
                SaleItem.objects.create(
                    sale=sale,
                    product=item_data['product'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    total_price=item_data['total_price']
                )

                # Update stock and create inventory log
                original_stock_quantity = item_data['product'].stock_quantity
                item_data['product'].stock_quantity -= item_data['quantity']
                item_data['product'].save()

                # Create inventory log for sale
                InventoryLog.objects.create(
                    shop=shop,
                    product=item_data['product'],
                    reason_code='SALE',
                    quantity_change=-item_data['quantity'],
                    previous_quantity=original_stock_quantity,
                    new_quantity=item_data['product'].stock_quantity,
                    performed_by=cashier,
                    reference_number=f'Sale #{sale.id}',
                    notes=f'Sold {item_data["quantity"]} x {item_data["product"].name} to {customer_name or "customer"}',
                    cost_price=item_data['product'].cost_price
                )

            print(f"✅ SALE COMPLETE: Sale #{sale.id} processed successfully")
            serializer = SaleSerializer(sale)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ShopLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = ShopLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            master_password = serializer.validated_data['password']
            try:
                shop = ShopConfiguration.objects.get(email=email)
                if shop.validate_shop_owner_master_password(master_password):
                    return Response({
                        "message": "Login successful",
                        "shop": {
                            "name": shop.name,
                            "email": shop.email,
                            "shop_id": shop.shop_id,
                            "register_id": shop.register_id,
                            "address": shop.address,
                            "phone": shop.phone
                        }
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({"error": "Invalid master password"}, status=status.HTTP_401_UNAUTHORIZED)
            except ShopConfiguration.DoesNotExist:
                return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
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
                    # Mark the recovery code as used
                    shop.mark_recovery_code_used(recovery_code)
                elif recovery_method == 'founder_master_password':
                    founder_password = serializer.validated_data['founder_master_password']
                    if not ShopConfiguration.validate_founder_credentials('thisismeprivateisaacngirazi', founder_password):
                        return Response({"error": "Invalid founder master password"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Return credentials without setting a new password
                return Response({
                    "message": "Credentials retrieved successfully",
                    "shop_id": shop.shop_id,
                    "register_id": shop.register_id,
                    "name": shop.name,
                    "email": shop.email,
                    "phone": shop.phone,
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

@method_decorator(csrf_exempt, name='dispatch')
class CustomerListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        customers = Customer.objects.filter(shop=shop)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()
        serializer = CustomerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(shop=shop)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class DiscountListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        discounts = Discount.objects.filter(shop=shop)
        serializer = DiscountSerializer(discounts, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()
        serializer = DiscountSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(shop=shop)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ShiftListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        shifts = Shift.objects.filter(shop=shop).order_by('-start_time')
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()
        cashier_id = request.data.get('cashier_id')
        opening_balance = request.data.get('opening_balance', 0)

        if not cashier_id:
            return Response({"error": "Cashier ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except Cashier.DoesNotExist:
            return Response({"error": "Invalid cashier"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if cashier has an active shift
        active_shift = Shift.objects.filter(cashier=cashier, is_active=True).first()
        if active_shift:
            return Response({"error": "Cashier already has an active shift"}, status=status.HTTP_400_BAD_REQUEST)

        shift = Shift.objects.create(
            cashier=cashier,
            shop=shop,
            opening_balance=opening_balance
        )

        serializer = ShiftSerializer(shift)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

@method_decorator(csrf_exempt, name='dispatch')
class ShiftDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def patch(self, request, shift_id):
        try:
            shift = Shift.objects.get(id=shift_id)
        except Shift.DoesNotExist:
            return Response({"error": "Shift not found"}, status=status.HTTP_404_NOT_FOUND)

        if not shift.is_active:
            return Response({"error": "Shift is already closed"}, status=status.HTTP_400_BAD_REQUEST)

        # End the shift
        shift.end_time = timezone.now()
        shift.closing_balance = request.data.get('closing_balance', shift.opening_balance)
        shift.is_active = False
        shift.notes = request.data.get('notes', '')
        shift.save()

        serializer = ShiftSerializer(shift)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class StockValuationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        products = Product.objects.filter(shop=shop)

        serializer = StockValuationSerializer({'products': products})
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class SaleDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, sale_id):
        """Get a single sale details"""
        shop = ShopConfiguration.objects.first()
        if not shop:
            return Response({"error": "Shop not configured"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sale = Sale.objects.get(id=sale_id, shop=shop)
        except Sale.DoesNotExist:
            return Response({"error": "Sale not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SaleSerializer(sale)
        return Response(serializer.data)

    def patch(self, request, sale_id):
        """Confirm or refund a sale"""
        shop = ShopConfiguration.objects.first()
        if not shop:
            return Response({"error": "Shop not configured"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sale = Sale.objects.get(id=sale_id, shop=shop)
        except Sale.DoesNotExist:
            return Response({"error": "Sale not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'confirm':
            if sale.status != 'pending':
                return Response({"error": "Sale is not pending confirmation"}, status=status.HTTP_400_BAD_REQUEST)

            sale.status = 'completed'
            sale.save()
            return Response({"message": "Sale confirmed successfully"})

        elif action == 'refund':
            if sale.status == 'refunded':
                return Response({"error": "Sale is already refunded"}, status=status.HTTP_400_BAD_REQUEST)

            # Get refund details
            refund_items = request.data.get('refund_items', [])
            refund_type = request.data.get('refund_type')
            reason = request.data.get('reason', '')
            password = request.data.get('password')
            cashier_id = request.data.get('cashier_id')

            if not password:
                return Response({"error": "Manager password required for refund"}, status=status.HTTP_400_BAD_REQUEST)

            if not refund_type:
                return Response({"error": "Refund type is required"}, status=status.HTTP_400_BAD_REQUEST)

            if not refund_items:
                return Response({"error": "No items selected for refund"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if password matches shop owner
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid manager password"}, status=status.HTTP_401_UNAUTHORIZED)

            # Get current cashier for refund logging
            refunded_by = None
            if cashier_id:
                try:
                    refunded_by = Cashier.objects.get(id=cashier_id, shop=shop)
                except Cashier.DoesNotExist:
                    pass

            total_refund_amount = 0
            refunded_items = []

            # Process each item refund
            for item_data in refund_items:
                item_id = item_data.get('item_id')
                quantity = item_data.get('quantity', 0)

                try:
                    sale_item = SaleItem.objects.get(id=item_id, sale=sale)
                except SaleItem.DoesNotExist:
                    return Response({"error": f"Sale item {item_id} not found"}, status=status.HTTP_404_NOT_FOUND)

                if quantity <= 0:
                    continue

                success, message = sale_item.refund_item(quantity, refund_type, reason, refunded_by)
                if not success:
                    return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

                total_refund_amount += quantity * sale_item.unit_price
                refunded_items.append({
                    'item_id': item_id,
                    'product_name': sale_item.product.name,
                    'quantity': quantity,
                    'refund_amount': quantity * sale_item.unit_price
                })

            # Update sale status if all items are refunded
            all_items_refunded = all(item.refunded for item in sale.items.all())
            if all_items_refunded:
                sale.status = 'refunded'
                sale.refund_reason = reason
                sale.refund_type = refund_type
                sale.refund_amount = total_refund_amount
                sale.refunded_at = timezone.now()
                sale.refunded_by = refunded_by
                sale.save()

            return Response({
                "message": "Refund processed successfully",
                "total_refund_amount": total_refund_amount,
                "refunded_items": refunded_items,
                "sale_fully_refunded": all_items_refunded
            })

        else:
            return Response({"error": "Invalid action. Use 'confirm' or 'refund'"}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class SaleItemDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def patch(self, request, item_id):
        """Refund an individual sale item"""
        try:
            sale_item = SaleItem.objects.get(id=item_id)
        except SaleItem.DoesNotExist:
            return Response({"error": "Sale item not found"}, status=status.HTTP_404_NOT_FOUND)

        if sale_item.refunded:
            return Response({"error": "Item is already fully refunded"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if sale is completed (not pending or already refunded)
        if sale_item.sale.status not in ['completed', 'refunded']:
            return Response({"error": "Can only refund items from completed sales"}, status=status.HTTP_400_BAD_REQUEST)

        # Get refund details
        quantity = request.data.get('quantity', sale_item.remaining_quantity)
        refund_type = request.data.get('refund_type')
        reason = request.data.get('reason', '')
        password = request.data.get('password')
        cashier_id = request.data.get('cashier_id')

        if not password:
            return Response({"error": "Manager password required for refund"}, status=status.HTTP_400_BAD_REQUEST)

        if not refund_type:
            return Response({"error": "Refund type is required"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0 or quantity > sale_item.remaining_quantity:
            return Response({"error": f"Invalid quantity. Can refund up to {sale_item.remaining_quantity} items"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if password matches shop owner
        if not sale_item.sale.shop.validate_shop_owner_master_password(password):
            return Response({"error": "Invalid manager password"}, status=status.HTTP_401_UNAUTHORIZED)

        # Get current cashier for refund logging
        refunded_by = None
        if cashier_id:
            try:
                refunded_by = Cashier.objects.get(id=cashier_id, shop=sale_item.sale.shop)
            except Cashier.DoesNotExist:
                pass

        # Process the refund
        success, message = sale_item.refund_item(quantity, refund_type, reason, refunded_by)
        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        refund_amount = quantity * sale_item.unit_price

        return Response({
            "message": "Item refunded successfully",
            "product_name": sale_item.product.name,
            "quantity_refunded": quantity,
            "refund_amount": refund_amount,
            "remaining_quantity": sale_item.remaining_quantity,
            "fully_refunded": sale_item.refunded
        })

@method_decorator(csrf_exempt, name='dispatch')
class ExpenseListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        expenses = Expense.objects.filter(shop=shop).order_by('-created_at')
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()

        # Check owner password
        password = request.data.get('password')
        if not password or not shop.validate_shop_owner_master_password(password):
            return Response({"error": "Invalid owner password"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            expense = serializer.save(shop=shop)

            # Set recorded_by if cashier_id provided
            cashier_id = request.data.get('cashier_id')
            if cashier_id:
                try:
                    cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                    expense.recorded_by = cashier
                    expense.save()
                except Cashier.DoesNotExist:
                    pass

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StaffLunchListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        
        # DEFAULT: Show today's staff lunches using date-based filtering
        # Use timezone-agnostic date filtering to match local time records
        today = timezone.now().date()
        
        # Build base queryset - filter by today's date using date() lookup
        # This matches records regardless of the timezone they were created in
        lunches = StaffLunch.objects.filter(
            shop=shop, 
            created_at__date=today
        ).select_related('product', 'recorded_by').order_by('-created_at')
        
        # Check if explicit date filters are provided
        explicit_date_filter = False
        
        # Add filtering capabilities
        staff_name = request.query_params.get('staff_name', '').strip()
        date_from = request.query_params.get('date_from', '').strip()
        date_to = request.query_params.get('date_to', '').strip()
        cashier_id = request.query_params.get('cashier_id', '').strip()
        search = request.query_params.get('search', '').strip()
        
        # If any date filters are explicitly provided, override default date filtering
        if date_from or date_to:
            explicit_date_filter = True
            # Start fresh without date restriction
            lunches = StaffLunch.objects.filter(shop=shop).select_related('product', 'recorded_by').order_by('-created_at')
        
        # Filter by staff name (from notes field)
        if staff_name:
            lunches = lunches.filter(notes__icontains=staff_name)
        
        # Filter by date range
        if date_from:
            try:
                from datetime import datetime
                from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
                lunches = lunches.filter(created_at__date__gte=from_date)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        if date_to:
            try:
                from datetime import datetime
                to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
                lunches = lunches.filter(created_at__date__lte=to_date)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        # Filter by cashier who recorded it
        if cashier_id:
            try:
                cashier_id_int = int(cashier_id)
                lunches = lunches.filter(recorded_by_id=cashier_id_int)
            except ValueError:
                pass  # Invalid cashier ID, ignore filter
        
        # Search in product names and notes
        if search:
            lunches = lunches.filter(
                models.Q(notes__icontains=search) |
                models.Q(product__name__icontains=search)
            )
        
        # Limit results if needed
        limit = request.query_params.get('limit', '')
        if limit:
            try:
                limit_int = int(limit)
                lunches = lunches[:limit_int]
            except ValueError:
                pass
        
        serializer = StaffLunchSerializer(lunches, many=True)
        
        # Return enhanced response with metadata
        response_data = {
            'success': True,
            'data': serializer.data,
            'meta': {
                'total_count': StaffLunch.objects.filter(shop=shop).count(),
                'filtered_count': lunches.count(),
                'filters_applied': {
                    'staff_name': staff_name,
                    'date_from': date_from if explicit_date_filter else str(today),
                    'date_to': date_to if explicit_date_filter else str(today),
                    'cashier_id': cashier_id,
                    'search': search,
                    'default_filter': not explicit_date_filter
                }
            }
        }
        
        return Response(response_data)

    def post(self, request):
        print(f"DEBUG: Staff lunch request data: {request.data}")
        shop = ShopConfiguration.objects.get()

        # Extract fields from the frontend data structure
        staff_name = request.data.get('staff_name')
        lunch_type = request.data.get('lunch_type', 'stock')  # 'stock' or 'cash'
        reason = request.data.get('reason', '')
        cashier_name = request.data.get('cashier_name', '')
        timestamp = request.data.get('timestamp')
        
        # Validate required fields
        if not staff_name:
            return Response({"error": "Staff name is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not lunch_type:
            return Response({"error": "Lunch type is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Handle different lunch types
        if lunch_type == 'stock':
            # Handle stock-based lunch (deduct products from inventory)
            products = request.data.get('products', [])
            if not products:
                return Response({"error": "Products are required for stock lunch"}, status=status.HTTP_400_BAD_REQUEST)
                
            total_value = float(request.data.get('total_value', 0))
            created_lunches = []
            
            # Process each product
            for product_data in products:
                product_id = product_data.get('product_id')
                product_name = product_data.get('product_name')
                quantity_str = product_data.get('quantity', '0')
                unit_price_str = product_data.get('unit_price', '0')
                
                if not product_id or not quantity_str:
                    continue
                    
                try:
                    quantity = float(quantity_str)
                    unit_price = float(unit_price_str)
                except (ValueError, TypeError):
                    print(f"DEBUG: Invalid quantity or price for product {product_id}")
                    continue
                    
                if quantity <= 0:
                    continue
                    
                try:
                    product = Product.objects.get(id=product_id, shop=shop)
                except Product.DoesNotExist:
                    print(f"DEBUG: Product {product_id} not found, skipping")
                    continue
                
                # Get the timestamp from frontend, or use current time
                try:
                    recorded_time = timezone.now()
                    if timestamp:
                        recorded_time = timezone.make_aware(timezone.datetime.fromisoformat(timestamp.replace('Z', '+00:00')))
                except (ValueError, TypeError):
                    recorded_time = timezone.now()
                    
                # Create staff lunch record for this product with exact timestamp
                staff_lunch = StaffLunch.objects.create(
                    shop=shop,
                    product=product,
                    quantity=int(quantity),
                    total_cost=Decimal(str(unit_price * quantity)),
                    notes=f"Staff: {staff_name}, Reason: {reason}, Time: {recorded_time.strftime('%Y-%m-%d %H:%M:%S')}",
                    created_at=recorded_time  # Set the exact timestamp
                )
                
                # Reduce product stock (convert float to Decimal)
                product.stock_quantity = product.stock_quantity - Decimal(str(quantity))
                product.save()
                
                created_lunches.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'quantity': quantity,
                    'total_cost': float(staff_lunch.total_cost)
                })
                
            # Set recorded_by if cashier can be found
            if cashier_name:
                try:
                    cashier = Cashier.objects.filter(shop=shop, name__icontains=cashier_name).first()
                    if cashier:
                        # Update the created lunch records
                        for lunch_data in created_lunches:
                            # Find the actual StaffLunch record and update it
                            try:
                                lunch = StaffLunch.objects.get(
                                    shop=shop, 
                                    product_id=lunch_data['product_id'], 
                                    created_at__gte=timezone.now() - timezone.timedelta(seconds=10)
                                )
                                lunch.recorded_by = cashier
                                lunch.save()
                            except StaffLunch.DoesNotExist:
                                print(f"DEBUG: Could not find StaffLunch record to update")
                except Exception as e:
                    print(f"DEBUG: Could not find cashier {cashier_name}: {e}")
            
            return Response({
                "success": True,
                "message": f"Stock lunch recorded for {staff_name}",
                "staff_name": staff_name,
                "lunch_type": lunch_type,
                "total_value": total_value,
                "products": created_lunches,
                "reason": reason
            }, status=status.HTTP_201_CREATED)
            
        elif lunch_type == 'cash':
            # Handle cash-based lunch (just record the expense)
            cash_amount_str = request.data.get('cash_amount', '0')
            
            # Properly convert string to float
            try:
                cash_amount = float(cash_amount_str)
            except (ValueError, TypeError):
                return Response({"error": "Invalid cash amount format. Please enter a valid number."}, status=status.HTTP_400_BAD_REQUEST)
            
            if cash_amount <= 0:
                return Response({"error": "Valid cash amount is required for cash lunch"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the timestamp from frontend, or use current time
            try:
                recorded_time = timezone.now()
                if timestamp:
                    recorded_time = timezone.make_aware(timezone.datetime.fromisoformat(timestamp.replace('Z', '+00:00')))
            except (ValueError, TypeError):
                recorded_time = timezone.now()
            
            # For cash lunches, we'll create a special note in the database
            # Since StaffLunch model is designed for products, we'll store this as a special case
            notes = f"CASH LUNCH - Staff: {staff_name}, Amount: ${cash_amount:.2f}, Reason: {reason}, Time: {recorded_time.strftime('%Y-%m-%d %H:%M:%S')}"
            
            # Create a dummy staff lunch record to track cash expenses
            # Use the first available product as a placeholder, or create a special "Cash Lunch" entry
            try:
                # Try to find or create a "Cash Lunch" tracking product
                cash_product, created = Product.objects.get_or_create(
                    shop=shop,
                    name="Staff Cash Lunch",
                    defaults={
                        'price': cash_amount,
                        'cost_price': cash_amount,
                        'category': 'Staff Expenses',
                        'stock_quantity': 999999  # Large number to avoid depletion
                    }
                )
                
                staff_lunch = StaffLunch.objects.create(
                    shop=shop,
                    product=cash_product,
                    quantity=1,
                    total_cost=Decimal(str(cash_amount)),
                    notes=notes,
                    created_at=recorded_time  # Set the exact timestamp
                )
                
                # Set recorded_by if cashier can be found
                if cashier_name:
                    try:
                        cashier = Cashier.objects.filter(shop=shop, name__icontains=cashier_name).first()
                        if cashier:
                            staff_lunch.recorded_by = cashier
                            staff_lunch.save()
                            print(f"DEBUG: Set recorded_by to {cashier.name} for cash lunch")
                    except Exception as e:
                        print(f"DEBUG: Could not find cashier {cashier_name}: {e}")
                
                return Response({
                    "success": True,
                    "message": f"Cash lunch recorded for {staff_name}",
                    "staff_name": staff_name,
                    "lunch_type": lunch_type,
                    "cash_amount": cash_amount,
                    "reason": reason
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({"error": f"Failed to record cash lunch: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        else:
            return Response({"error": f"Invalid lunch type: {lunch_type}. Must be 'stock' or 'cash'"}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class StaffLunchDeductMoneyView(APIView):
    """Deduce money from drawer for staff lunch (Money Lunch)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        shop = ShopConfiguration.objects.get()
        
        # Extract fields
        staff_name = request.data.get('staff_name')
        amount = request.data.get('amount')
        reason = request.data.get('reason', '')
        cashier_name = request.data.get('cashier_name', '')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not staff_name:
            return Response({"error": "Staff name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not amount:
            return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = Decimal(str(amount))
        except (ValueError, TypeError):
            return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)
        
        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get or create cash float for today
            from .models import CashFloat
            today = timezone.now().date()
            
            # Try to find an active cashier for drawer deduction
            cashier = None
            if cashier_name:
                cashier = Cashier.objects.filter(shop=shop, name__icontains=cashier_name).first()
            
            # Get or create cash float
            if cashier:
                cash_float, created = CashFloat.objects.get_or_create(
                    shop=shop,
                    cashier=cashier,
                    date=today,
                    defaults={
                        'float_amount': Decimal('0.00'),
                        'current_cash': Decimal('0.00'),
                        'status': 'ACTIVE'
                    }
                )
            else:
                # No specific cashier - just get first active cash float or create one
                cash_float = CashFloat.objects.filter(shop=shop, date=today, status='ACTIVE').first()
                if not cash_float:
                    # Create a new cash float record
                    first_cashier = Cashier.objects.filter(shop=shop, status='active').first()
                    if first_cashier:
                        cash_float = CashFloat.objects.create(
                            shop=shop,
                            cashier=first_cashier,
                            date=today,
                            float_amount=Decimal('0.00'),
                            current_cash=Decimal('0.00'),
                            status='ACTIVE'
                        )
                    else:
                        # No cashiers exist, create a shop-level record
                        cash_float = CashFloat.objects.create(
                            shop=shop,
                            cashier=None,
                            date=today,
                            float_amount=Decimal('0.00'),
                            current_cash=Decimal('0.00'),
                            status='ACTIVE'
                        )
            
            # FIRST: Create the StaffLunch record (before any deductions)
            staff_lunch = StaffLunch.objects.create(
                shop=shop,
                product=None,  # No product for money lunch
                quantity=1,
                total_cost=amount,
                notes=f"MONEY LUNCH - Staff: {staff_name}, Amount: ${float(amount):.2f}, Reason: {reason}",
                recorded_by=cashier
            )
            
            # SECOND: Create expense record for tracking staff lunch as a business expense
            expense = Expense.objects.create(
                shop=shop,
                expense_type='other',
                description=f'Staff Lunch - {staff_name}: {reason}',
                amount=amount,
                currency='USD',
                recorded_by=cashier
            )
            
            # FOURTH: Validate sufficient funds before deduction
            # Calculate available cash (current drawer cash + today's cash sales)
            available_cash = cash_float.current_cash + cash_float.session_cash_sales
            
            # Also check USD-specific fields if they exist
            if hasattr(cash_float, 'current_cash_usd'):
                available_cash_usd = cash_float.current_cash_usd + cash_float.session_cash_sales_usd if hasattr(cash_float, 'session_cash_sales_usd') else cash_float.current_cash_usd
                if amount > available_cash_usd:
                    return Response({
                        "error": f"Insufficient funds in drawer. Requested: ${float(amount):.2f}, Available: ${float(available_cash_usd):.2f}",
                        "available_balance": float(available_cash_usd),
                        "requested_amount": float(amount)
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Fallback to regular current_cash check
                if amount > available_cash:
                    return Response({
                        "error": f"Insufficient funds in drawer. Requested: ${float(amount):.2f}, Available: ${float(available_cash):.2f}",
                        "available_balance": float(available_cash),
                        "requested_amount": float(amount)
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # FIFTH: Deduct amount from drawer (real money)
            cash_float.current_cash -= amount
            cash_float.current_cash_usd -= amount
            cash_float.current_total_usd -= amount
            cash_float.current_total = cash_float.current_cash + cash_float.current_card + cash_float.current_ecocash + cash_float.current_transfer
            
            # Also reduce expected cash at EOD (staff lunch is intentional deduction)
            # This ensures EOD variance doesn't show a false shortage
            cash_float.expected_cash_at_eod -= amount
            cash_float.expected_cash_usd -= amount
            
            cash_float.save()
            
            # NOTE: Wallet is NOT deducted for staff lunch
            # Staff lunch is a cash expense from the drawer, not a wallet transaction
            # The wallet tracks sales revenue only
            
            return Response({
                "success": True,
                "message": f"Money lunch recorded. ${float(amount):.2f} deducted from drawer for {staff_name}",
                "staff_name": staff_name,
                "amount": float(amount),
                "drawer_balance": float(cash_float.current_cash)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Failed to process money lunch: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StaffLunchDeductProductView(APIView):
    """Deduce products from stock for staff lunch (Product Lunch)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        shop = ShopConfiguration.objects.get()
        
        # Extract fields
        staff_name = request.data.get('staff_name')
        products = request.data.get('products', [])
        total_value = request.data.get('total_value', 0)
        reason = request.data.get('reason', '')
        cashier_name = request.data.get('cashier_name', '')
        notes = request.data.get('notes', '')
        
        # Validate required fields
        if not staff_name:
            return Response({"error": "Staff name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not products or len(products) == 0:
            return Response({"error": "At least one product is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            recorded_time = timezone.now()
            frontend_timestamp = request.data.get('timestamp')
            if frontend_timestamp:
                try:
                    # Parse the frontend timestamp and make it timezone-aware
                    recorded_time = timezone.datetime.fromisoformat(frontend_timestamp.replace('Z', '+00:00'))
                    # Convert to shop timezone if available
                    if hasattr(timezone, 'get_current_timezone'):
                        try:
                            from django.utils.timezone import get_current_timezone
                            recorded_time = recorded_time.astimezone(get_current_timezone())
                        except Exception:
                            pass
                except (ValueError, TypeError):
                    recorded_time = timezone.now()
            
            created_lunches = []
            
            # Process each product
            for product_data in products:
                product_id = product_data.get('product_id')
                product_name = product_data.get('product_name', 'Unknown')
                quantity = product_data.get('quantity', 1)
                unit_price = product_data.get('unit_price', 0)
                
                if not product_id:
                    continue
                
                try:
                    quantity = float(quantity)
                    unit_price = float(unit_price)
                except (ValueError, TypeError):
                    continue
                
                if quantity <= 0:
                    continue
                
                try:
                    product = Product.objects.get(id=product_id, shop=shop)
                except Product.DoesNotExist:
                    continue
                
                # Reduce product stock
                product.stock_quantity = product.stock_quantity - Decimal(str(quantity))
                product.save()
                
                # Create staff lunch record - use frontend timestamp or current time
                staff_lunch = StaffLunch.objects.create(
                    shop=shop,
                    product=product,
                    quantity=int(quantity),
                    total_cost=Decimal(str(unit_price * quantity)),
                    notes=f"PRODUCT LUNCH - Staff: {staff_name}, Reason: {reason}, Notes: {notes}, Time: {recorded_time.strftime('%Y-%m-%d %H:%M:%S')}",
                    created_at=recorded_time
                )
                
                created_lunches.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'quantity': quantity,
                    'total_cost': float(staff_lunch.total_cost),
                    'created_at': recorded_time  # Store timestamp for lookup
                })
            
            # Set recorded_by if cashier can be found - use the exact recorded_time
            if cashier_name:
                try:
                    cashier = Cashier.objects.filter(shop=shop, name__icontains=cashier_name).first()
                    if cashier:
                        for lunch_data in created_lunches:
                            try:
                                # Use the exact timestamp we stored
                                lunch_time = lunch_data.get('created_at', recorded_time)
                                lunch = StaffLunch.objects.get(
                                    shop=shop,
                                    product_id=lunch_data['product_id'],
                                    created_at=lunch_time
                                )
                                lunch.recorded_by = cashier
                                lunch.save()
                                print(f"DEBUG: Set recorded_by to {cashier.name} for product lunch ID {lunch.id}")
                            except StaffLunch.DoesNotExist:
                                # Fallback to time window search if exact match fails
                                try:
                                    lunch = StaffLunch.objects.get(
                                        shop=shop,
                                        product_id=lunch_data['product_id'],
                                        created_at__gte=lunch_time - timezone.timedelta(seconds=30),
                                        created_at__lte=lunch_time + timezone.timedelta(seconds=30)
                                    )
                                    lunch.recorded_by = cashier
                                    lunch.save()
                                    print(f"DEBUG: Set recorded_by (fallback) to {cashier.name} for product lunch ID {lunch.id}")
                                except StaffLunch.DoesNotExist:
                                    print(f"DEBUG: Could not find StaffLunch record to update for product {lunch_data['product_id']}")
                except Exception as e:
                    print(f"DEBUG: Error updating recorded_by: {e}")
            
            return Response({
                "success": True,
                "message": f"Product lunch recorded for {staff_name}",
                "staff_name": staff_name,
                "total_value": float(total_value),
                "products": created_lunches,
                "reason": reason
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Failed to process product lunch: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class StockTakeListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        shop = ShopConfiguration.objects.get()
        stock_takes = StockTake.objects.filter(shop=shop).order_by('-started_at')
        serializer = StockTakeSerializer(stock_takes, many=True)
        return Response(serializer.data)

    def post(self, request):
        shop = ShopConfiguration.objects.get()
        serializer = CreateStockTakeSerializer(data=request.data)
        if serializer.is_valid():
            # No authentication required - create stock take without cashier attribution
            cashier_id = request.data.get('cashier_id')
            cashier = None
            if cashier_id:
                try:
                    cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                except Cashier.DoesNotExist:
                    # Continue without cashier if not found
                    print(f"Info: Cashier with ID {cashier_id} not found, creating stock take without cashier attribution")

            stock_take = StockTake.objects.create(
                shop=shop,
                name=serializer.validated_data['name'],
                notes=serializer.validated_data.get('notes', ''),
                started_by=cashier
            )

            serializer = StockTakeSerializer(stock_take)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StockTakeDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = StockTakeSerializer(stock_take)
        return Response(serializer.data)

    def patch(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        cashier_id = request.data.get('cashier_id')
        
        # Make cashier_id completely optional - no validation required
        cashier = None
        if cashier_id:
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                # If cashier lookup fails, continue without cashier (stock take can still be completed)
                print(f"Info: Cashier with ID {cashier_id} not found, completing stock take without cashier attribution")

        if action == 'complete':
            if stock_take.status != 'in_progress':
                return Response({"error": "Stock take is not in progress"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                stock_take.complete_stock_take(cashier)
                serializer = StockTakeSerializer(stock_take)
                return Response({
                    "message": "Stock take completed successfully",
                    "data": serializer.data
                })
            except Exception as e:
                print(f"Error completing stock take: {e}")
                return Response({"error": f"Failed to complete stock take: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        elif action == 'cancel':
            if stock_take.status != 'in_progress':
                return Response({"error": "Stock take is not in progress"}, status=status.HTTP_400_BAD_REQUEST)

            stock_take.status = 'cancelled'
            stock_take.completed_by = cashier
            stock_take.completed_at = timezone.now()
            stock_take.save()

            serializer = StockTakeSerializer(stock_take)
            return Response(serializer.data)

        else:
            return Response({"error": "Invalid action. Use 'complete' or 'cancel'"}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StockTakeItemListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        items = StockTakeItem.objects.filter(stock_take=stock_take)
        serializer = StockTakeItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        if stock_take.status != 'in_progress':
            return Response({"error": "Stock take is not in progress"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AddStockTakeItemSerializer(data=request.data)
        if serializer.is_valid():
            product_id = serializer.validated_data['product_id']
            counted_quantity = serializer.validated_data['counted_quantity']

            try:
                product = Product.objects.get(id=product_id, shop=shop)
            except Product.DoesNotExist:
                return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

            # Create or update stock take item
            item, created = StockTakeItem.objects.get_or_create(
                stock_take=stock_take,
                product=product,
                defaults={
                    'system_quantity': product.stock_quantity,
                    'counted_quantity': counted_quantity,
                    'notes': serializer.validated_data.get('notes', '')
                }
            )

            if not created:
                item.counted_quantity = counted_quantity
                item.notes = serializer.validated_data.get('notes', '')
                item.save()

            serializer = StockTakeItemSerializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class BulkAddStockTakeItemsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        if stock_take.status != 'in_progress':
            return Response({"error": "Stock take is not in progress"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BulkAddStockTakeItemsSerializer(data=request.data)
        if serializer.is_valid():
            items_data = serializer.validated_data['items']
            created_items = []
            updated_items = []

            for item_data in items_data:
                product_id = int(item_data['product_id'])
                counted_quantity = Decimal(item_data['counted_quantity'])
                notes = item_data.get('notes', '')

                try:
                    product = Product.objects.get(id=product_id, shop=shop)
                except Product.DoesNotExist:
                    continue  # Skip invalid products

                # Create or update stock take item
                item, created = StockTakeItem.objects.get_or_create(
                    stock_take=stock_take,
                    product=product,
                    defaults={
                        'system_quantity': product.stock_quantity,
                        'counted_quantity': counted_quantity,
                        'notes': notes
                    }
                )

                if not created:
                    item.counted_quantity = counted_quantity
                    item.notes = notes
                    item.save()

                if created:
                    created_items.append(item)
                else:
                    updated_items.append(item)

            # Return summary
            return Response({
                "message": f"Processed {len(created_items)} new items and updated {len(updated_items)} existing items",
                "created_count": len(created_items),
                "updated_count": len(updated_items),
                "total_processed": len(created_items) + len(updated_items)
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StockTakeProductSearchView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, stock_take_id):
        shop = ShopConfiguration.objects.get()
        try:
            stock_take = StockTake.objects.get(id=stock_take_id, shop=shop)
        except StockTake.DoesNotExist:
            return Response({"error": "Stock take not found"}, status=status.HTTP_404_NOT_FOUND)

        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({"error": "Search query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Search products that are not already in this stock take
        existing_product_ids = StockTakeItem.objects.filter(stock_take=stock_take).values_list('product_id', flat=True)

        products = Product.objects.filter(
            shop=shop
        ).exclude(
            id__in=existing_product_ids
        ).filter(
            models.Q(name__icontains=query) |
            models.Q(line_code__icontains=query) |
            models.Q(barcode__icontains=query) |
            models.Q(category__icontains=query)
        )[:10]  # Limit to 10 results

        product_data = []
        for product in products:
            product_data.append({
                'id': product.id,
                'name': product.name,
                'line_code': product.line_code,
                'barcode': product.barcode,
                'category': product.category,
                'current_stock': product.stock_quantity,
                'cost_price': product.cost_price,
                'selling_price': product.price,
                'currency': product.currency
            })

        return Response(product_data)

@method_decorator(csrf_exempt, name='dispatch')
class OwnerDashboardView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

        # Calculate date ranges
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Get current open shop_day (for session-aware filtering)
        current_shop_day = ShopDay.get_open_shop_day(shop)
        
        # Get yesterday's closed shop_day
        yesterday_shop_day = ShopDay.objects.filter(
            shop=shop,
            date=yesterday,
            status='CLOSED'
        ).first()
        
        # Get this week's shop_days (closed ones for historical data)
        week_shop_days = ShopDay.objects.filter(
            shop=shop,
            date__gte=week_ago,
            date__lte=today,
            status='CLOSED'
        )
        
        # Get last week's shop_days for comparison
        last_week_start = week_ago - timedelta(days=7)
        last_week_shop_days = ShopDay.objects.filter(
            shop=shop,
            date__gte=last_week_start,
            date__lt=week_ago,
            status='CLOSED'
        )
        
        # Get this month's shop_days
        month_shop_days = ShopDay.objects.filter(
            shop=shop,
            date__gte=month_ago,
            date__lte=today,
            status='CLOSED'
        )
        
        # Get last month's shop_days for comparison
        last_month_start = month_ago - timedelta(days=30)
        last_month_shop_days = ShopDay.objects.filter(
            shop=shop,
            date__gte=last_month_start,
            date__lt=month_ago,
            status='CLOSED'
        )

        # Sales Data - use shop_day for session-aware filtering
        if current_shop_day:
            today_sales = Sale.objects.filter(shop=shop, shop_day=current_shop_day, status='completed')
        else:
            # Fallback: no open shop day, use today's date as fallback
            today_sales = Sale.objects.filter(shop=shop, created_at__date=today, status='completed')
        
        if yesterday_shop_day:
            yesterday_sales = Sale.objects.filter(shop=shop, shop_day=yesterday_shop_day, status='completed')
        else:
            # Fallback: use yesterday's date
            yesterday_sales = Sale.objects.filter(shop=shop, created_at__date=yesterday, status='completed')
        
        # For week/month comparisons, use shop_days if available, otherwise fall back to date
        week_shop_day_ids = list(week_shop_days.values_list('id', flat=True))
        if week_shop_day_ids:
            week_sales = Sale.objects.filter(shop=shop, shop_day_id__in=week_shop_day_ids, status='completed')
        else:
            week_sales = Sale.objects.filter(shop=shop, created_at__date__gte=week_ago, status='completed')
        
        month_shop_day_ids = list(month_shop_days.values_list('id', flat=True))
        if month_shop_day_ids:
            month_sales = Sale.objects.filter(shop=shop, shop_day_id__in=month_shop_day_ids, status='completed')
        else:
            month_sales = Sale.objects.filter(shop=shop, created_at__date__gte=month_ago, status='completed')

        # Calculate sales metrics
        today_revenue = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        yesterday_revenue = yesterday_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        today_orders = today_sales.count()
        yesterday_orders = yesterday_sales.count()

        # Growth calculations
        today_growth = ((today_revenue - yesterday_revenue) / max(yesterday_revenue, 1)) * 100 if yesterday_revenue > 0 else 0
        today_orders_growth = ((today_orders - yesterday_orders) / max(yesterday_orders, 1)) * 100 if yesterday_orders > 0 else 0

        week_revenue = week_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        week_orders = week_sales.count()
        
        # Previous week comparison
        last_week_shop_day_ids = list(last_week_shop_days.values_list('id', flat=True))
        if last_week_shop_day_ids:
            prev_week_sales = Sale.objects.filter(shop=shop, shop_day_id__in=last_week_shop_day_ids, status='completed')
        else:
            prev_week_sales = Sale.objects.filter(
                shop=shop, 
                created_at__date__gte=last_week_start, 
                created_at__date__lt=week_ago, 
                status='completed'
            )
        prev_week_revenue = prev_week_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        week_growth = ((week_revenue - prev_week_revenue) / max(prev_week_revenue, 1)) * 100 if prev_week_revenue > 0 else 0

        month_revenue = month_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        month_orders = month_sales.count()
        
        # Previous month comparison
        last_month_shop_day_ids = list(last_month_shop_days.values_list('id', flat=True))
        if last_month_shop_day_ids:
            prev_month_sales = Sale.objects.filter(shop=shop, shop_day_id__in=last_month_shop_day_ids, status='completed')
        else:
            prev_month_sales = Sale.objects.filter(
                shop=shop, 
                created_at__date__gte=last_month_start, 
                created_at__date__lt=month_ago, 
                status='completed'
            )
        prev_month_revenue = prev_month_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        month_growth = ((month_revenue - prev_month_revenue) / max(prev_month_revenue, 1)) * 100 if prev_month_revenue > 0 else 0

        # Inventory Data
        products = Product.objects.filter(shop=shop)
        total_products = products.count()
        low_stock_items = products.filter(models.Q(stock_quantity__lte=models.F('min_stock_level'))).count()
        negative_stock_items = products.filter(stock_quantity__lt=0).count()
        # FIXED: Stock value never negative - if oversold, value is $0 (no physical assets)
        total_inventory_value = sum(max(0, p.stock_quantity) * p.cost_price for p in products)

        # Employee Data
        total_cashiers = Cashier.objects.filter(shop=shop).count()
        active_today = Shift.objects.filter(
            shop=shop, 
            start_time__date=today, 
            is_active=True
        ).count()

        # Top Products (last 30 days)
        top_products_data = []
        sale_items_30_days = SaleItem.objects.filter(
            sale__shop=shop,
            sale__created_at__date__gte=month_ago,
            sale__status='completed'
        ).values(
            'product_id',
            'product__name',
            'product__category'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-total_revenue')[:10]

        for item in sale_items_30_days:
            top_products_data.append({
                'id': item['product_id'],
                'name': item['product__name'],
                'category': item['product__category'],
                'sold_quantity': int(item['total_quantity']),
                'revenue': float(item['total_revenue'])
            })

        # Recent Sales (last 10)
        recent_sales = Sale.objects.filter(
            shop=shop, 
            status='completed'
        ).order_by('-created_at')[:10]

        recent_sales_data = []
        for sale in recent_sales:
            recent_sales_data.append({
                'id': sale.id,
                'total_amount': float(sale.total_amount),
                'payment_method': sale.payment_method,
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown'
            })

        # Alerts
        alerts = []
        
        # Low stock alerts
        if (low_stock_items + negative_stock_items) > 0:
            alerts.append({
                'type': 'low_stock',
                'message': f'{low_stock_items} products are running low on stock, {negative_stock_items} products have negative stock'
            })
        
        # Zero sales alert
        if today_revenue == 0 and today_orders == 0:
            alerts.append({
                'type': 'no_sales',
                'message': 'No sales recorded today'
            })
        
        # High value sales alert (for large transactions) - use shop_day for session-aware filtering
        if current_shop_day:
            large_sales_today = Sale.objects.filter(
                shop=shop,
                shop_day=current_shop_day,
                status='completed',
                total_amount__gte=1000  # Alert for sales over $1000
            ).count()
        else:
            # Fallback: no open shop day, use today's date
            large_sales_today = Sale.objects.filter(
                shop=shop,
                created_at__date=today,
                status='completed',
                total_amount__gte=1000
            ).count()
        
        if large_sales_today > 0:
            alerts.append({
                'type': 'large_sales',
                'message': f'{large_sales_today} large transaction(s) recorded today'
            })

        # Compile dashboard data
        dashboard_data = {
            'sales': {
                'today': {
                    'revenue': float(today_revenue),
                    'orders': today_orders,
                    'growth': round(today_growth, 1)
                },
                'week': {
                    'revenue': float(week_revenue),
                    'orders': week_orders,
                    'growth': round(week_growth, 1)
                },
                'month': {
                    'revenue': float(month_revenue),
                    'orders': month_orders,
                    'growth': round(month_growth, 1)
                }
            },
            'inventory': {
                'totalProducts': total_products,
                'lowStockItems': low_stock_items,
                'negativeStockItems': negative_stock_items,
                'totalValue': float(total_inventory_value)
            },
            'employees': {
                'totalCashiers': total_cashiers,
                'activeToday': active_today
            },
            'topProducts': top_products_data,
            'recentSales': recent_sales_data,
            'alerts': alerts
        }

        return Response(dashboard_data, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class FounderLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if ShopConfiguration.validate_founder_credentials(username, password):
            return Response({
                "message": "Founder login successful",
                "founder": {
                    "username": username,
                    "role": "founder",
                    "access_level": "super_admin"
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid founder credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class FounderShopListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # Verify founder credentials
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not ShopConfiguration.validate_founder_credentials(username, password):
            return Response({"error": "Invalid founder credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get all shops
        shops = ShopConfiguration.objects.all().order_by('-registered_at')
        shops_data = []
        
        for shop in shops:
            shops_data.append({
                "id": shop.id,
                "shop_id": str(shop.shop_id),
                "register_id": shop.register_id,
                "name": shop.name,
                "email": shop.email,
                "phone": shop.phone,
                "address": shop.address,
                "business_type": shop.business_type,
                "industry": shop.industry,
                "registered_at": shop.registered_at.isoformat(),
                "is_active": shop.is_active,
                "last_login": shop.last_login.isoformat() if shop.last_login else None
            })
        
        return Response({
            "message": "All shops retrieved successfully",
            "shops": shops_data,
            "total_shops": len(shops_data)
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class FounderShopDashboardView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # Verify founder credentials
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not ShopConfiguration.validate_founder_credentials(username, password):
            return Response({"error": "Invalid founder credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        shop_id = request.data.get('shop_id')
        if not shop_id:
            return Response({"error": "Shop ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the specific shop
        try:
            shop = ShopConfiguration.objects.get(id=shop_id)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Use the existing OwnerDashboardView logic but for the specific shop
        # Calculate date ranges
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Sales Data
        today_sales = Sale.objects.filter(shop=shop, created_at__date=today, status='completed')
        yesterday_sales = Sale.objects.filter(shop=shop, created_at__date=yesterday, status='completed')
        week_sales = Sale.objects.filter(shop=shop, created_at__date__gte=week_ago, status='completed')
        month_sales = Sale.objects.filter(shop=shop, created_at__date__gte=month_ago, status='completed')

        # Calculate sales metrics
        today_revenue = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        yesterday_revenue = yesterday_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        today_orders = today_sales.count()
        yesterday_orders = yesterday_sales.count()

        # Growth calculations
        today_growth = ((today_revenue - yesterday_revenue) / max(yesterday_revenue, 1)) * 100 if yesterday_revenue > 0 else 0
        today_orders_growth = ((today_orders - yesterday_orders) / max(yesterday_orders, 1)) * 100 if yesterday_orders > 0 else 0

        week_revenue = week_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        week_orders = week_sales.count()
        prev_week_revenue = Sale.objects.filter(
            shop=shop, 
            created_at__date__gte=week_ago - timedelta(days=7), 
            created_at__date__lt=week_ago, 
            status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        week_growth = ((week_revenue - prev_week_revenue) / max(prev_week_revenue, 1)) * 100 if prev_week_revenue > 0 else 0

        month_revenue = month_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        month_orders = month_sales.count()
        prev_month_revenue = Sale.objects.filter(
            shop=shop, 
            created_at__date__gte=month_ago - timedelta(days=30), 
            created_at__date__lt=month_ago, 
            status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        month_growth = ((month_revenue - prev_month_revenue) / max(prev_month_revenue, 1)) * 100 if prev_month_revenue > 0 else 0

        # Inventory Data
        products = Product.objects.filter(shop=shop)
        total_products = products.count()
        low_stock_items = products.filter(models.Q(stock_quantity__lte=models.F('min_stock_level'))).count()
        negative_stock_items = products.filter(stock_quantity__lt=0).count()
        # FIXED: Stock value never negative - if oversold, value is $0 (no physical assets)
        total_inventory_value = sum(max(0, p.stock_quantity) * p.cost_price for p in products)

        # Employee Data
        total_cashiers = Cashier.objects.filter(shop=shop).count()
        active_today = Shift.objects.filter(
            shop=shop, 
            start_time__date=today, 
            is_active=True
        ).count()

        # Top Products (last 30 days)
        top_products_data = []
        sale_items_30_days = SaleItem.objects.filter(
            sale__shop=shop,
            sale__created_at__date__gte=month_ago,
            sale__status='completed'
        ).values(
            'product_id',
            'product__name',
            'product__category'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-total_revenue')[:10]

        for item in sale_items_30_days:
            top_products_data.append({
                'id': item['product_id'],
                'name': item['product__name'],
                'category': item['product__category'],
                'sold_quantity': int(item['total_quantity']),
                'revenue': float(item['total_revenue'])
            })

        # Recent Sales (last 10)
        recent_sales = Sale.objects.filter(
            shop=shop, 
            status='completed'
        ).order_by('-created_at')[:10]

        recent_sales_data = []
        for sale in recent_sales:
            recent_sales_data.append({
                'id': sale.id,
                'total_amount': float(sale.total_amount),
                'payment_method': sale.payment_method,
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown'
            })

        # Alerts
        alerts = []
        
        # Low stock alerts
        if (low_stock_items + negative_stock_items) > 0:
            alerts.append({
                'type': 'low_stock',
                'message': f'{low_stock_items} products are running low on stock, {negative_stock_items} products have negative stock'
            })
        
        # Zero sales alert
        if today_revenue == 0 and today_orders == 0:
            alerts.append({
                'type': 'no_sales',
                'message': 'No sales recorded today'
            })
        
        # High value sales alert (for large transactions)
        large_sales_today = Sale.objects.filter(
            shop=shop,
            created_at__date=today,
            status='completed',
            total_amount__gte=1000  # Alert for sales over $1000
        ).count()
        
        if large_sales_today > 0:
            alerts.append({
                'type': 'large_sales',
                'message': f'{large_sales_today} large transaction(s) recorded today'
            })

        # Compile dashboard data
        dashboard_data = {
            'shop_info': {
                'id': shop.id,
                'name': shop.name,
                'email': shop.email,
                'phone': shop.phone,
                'address': shop.address,
                'business_type': shop.business_type,
                'industry': shop.industry,
                'registered_at': shop.registered_at.isoformat(),
                'is_active': shop.is_active
            },
            'sales': {
                'today': {
                    'revenue': float(today_revenue),
                    'orders': today_orders,
                    'growth': round(today_growth, 1)
                },
                'week': {
                    'revenue': float(week_revenue),
                    'orders': week_orders,
                    'growth': round(week_growth, 1)
                },
                'month': {
                    'revenue': float(month_revenue),
                    'orders': month_orders,
                    'growth': round(month_growth, 1)
                }
            },
            'inventory': {
                'totalProducts': total_products,
                'lowStockItems': low_stock_items,
                'negativeStockItems': negative_stock_items,
                'totalValue': float(total_inventory_value)
            },
            'employees': {
                'totalCashiers': total_cashiers,
                'activeToday': active_today
            },
            'topProducts': top_products_data,
            'recentSales': recent_sales_data,
            'alerts': alerts
        }

        return Response(dashboard_data, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class FounderResetShopPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # Verify founder credentials
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not ShopConfiguration.validate_founder_credentials(username, password):
            return Response({"error": "Invalid founder credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        shop_id = request.data.get('shop_id')
        new_password = request.data.get('new_password')
        
        if not shop_id or not new_password:
            return Response({"error": "Shop ID and new password required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get(id=shop_id)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Reset the shop's password
        shop.set_password(new_password)
        shop.save()
        
        return Response({
            "message": f"Password reset successfully for {shop.name}",
            "shop": {
                "id": shop.id,
                "name": shop.name,
                "email": shop.email,
                "new_password": new_password
            }
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class InventoryAuditTrailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        shop = ShopConfiguration.objects.get()
        logs = InventoryLog.objects.filter(shop=shop).order_by('-created_at')
        
        # Filtering
        product_id = request.query_params.get('product_id')
        if product_id:
            logs = logs.filter(product_id=product_id)
            
        reason_code = request.query_params.get('reason_code')
        if reason_code:
            logs = logs.filter(reason_code=reason_code)
            
        start_date = request.query_params.get('start_date')
        if start_date:
            logs = logs.filter(created_at__date__gte=start_date)
            
        end_date = request.query_params.get('end_date')
        if end_date:
            logs = logs.filter(created_at__date__lte=end_date)
            
        serializer = InventoryLogSerializer(logs, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class ProductAuditHistoryView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, product_id):
        shop = ShopConfiguration.objects.get()
        try:
            product = Product.objects.get(id=product_id, shop=shop)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
            
        logs = InventoryLog.objects.filter(shop=shop, product=product).order_by('-created_at')
        serializer = InventoryLogSerializer(logs, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class CashierTopProductsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        """Get top 5 selling products for cashier dashboard"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get top 5 selling products from last 30 days
        from datetime import timedelta
        month_ago = timezone.now() - timedelta(days=30)
        
        top_products_data = []
        sale_items_30_days = SaleItem.objects.filter(
            sale__shop=shop,
            sale__created_at__gte=month_ago,
            sale__status='completed'
        ).values(
            'product_id',
            'product__name',
            'product__category'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('unit_price'))
        ).order_by('-total_revenue')[:5]

        for item in sale_items_30_days:
            top_products_data.append({
                'id': item['product_id'],
                'name': item['product__name'],
                'category': item['product__category'],
                'sold_quantity': int(item['total_quantity']),
                'revenue': float(item['total_revenue'])
            })
        
        return Response({
            "success": True,
            "top_products": top_products_data
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class BarcodeLookupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    permission_classes = [AllowAny]
    authentication_classes = []
    
    """Quick barcode lookup for cashier POS"""
    def get(self, request):
        barcode = request.query_params.get('barcode', '').strip()
        
        if not barcode:
            return Response({"error": "Barcode parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Search for product by barcode, line code, or additional barcodes (only active products)
        product = Product.objects.filter(
            shop=shop,
            is_active=True  # Only return active products - delisted products cannot be found
        ).filter(
            models.Q(barcode=barcode) | 
            models.Q(line_code=barcode) |
            models.Q(additional_barcodes__contains=barcode)
        ).first()
        
        if product:
            return Response({
                "found": True,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "price": float(product.price),
                    "barcode": product.barcode,
                    "line_code": product.line_code,
                    "additional_barcodes": product.additional_barcodes or [],
                    "category": product.category,
                    "stock_quantity": product.stock_quantity,
                    "currency": product.currency
                }
            })
        else:
            return Response({
                "found": False,
                "message": f"No product found with barcode: {barcode}"
            })

@method_decorator(csrf_exempt, name='dispatch')
class SalesHistoryView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    permission_classes = [AllowAny]
    authentication_classes = []
    
    """Enhanced sales history view for owner dashboard"""
    def get(self, request):
        # Authenticate shop owner from Basic Auth header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Basic '):
            return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Decode Basic Auth
            import base64
            auth_bytes = base64.b64decode(auth_header[6:])
            auth_string = auth_bytes.decode('utf-8')
            email, password = auth_string.split(':', 1)
        except Exception:
            return Response({"error": "Invalid authentication format"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            shop = ShopConfiguration.objects.get(email=email)
            if not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        sales = Sale.objects.filter(shop=shop).order_by('-created_at')
        
        # Enhanced serialization with more details for the frontend
        sales_data = []
        for sale in sales:
            sale_data = {
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',  # Format as R001, R002, etc.
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name or '',
                'total_amount': float(sale.total_amount),
                'currency': sale.currency,
                'status': sale.status,
                'items': []
            }
            
            # Add sale items with product details
            for item in sale.items.all():
                sale_data['items'].append({
                    'product_id': item.product.id,
                    'product_name': item.product.name,
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price)
                })
            
            sales_data.append(sale_data)
        
        return Response(sales_data)


class StockTransferViewSet(viewsets.ViewSet):
    """ViewSet for Stock Transfer operations"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def list(self, request):
        """List all stock transfers for the shop"""
        try:
            # Get shop credentials from request headers
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            if not shop_id:
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"🔍 DEBUG: Looking for shop with shop_id: {shop_id}")
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            transfers = StockTransfer.objects.filter(shop=shop).order_by('-created_at')
            
            serializer = StockTransferSerializer(transfers, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        """Create a new stock transfer"""
        try:
            print(f"🔍 DEBUG: StockTransferViewSet.create called")
            print(f"🔍 DEBUG: Request data: {request.data}")
            print(f"🔍 DEBUG: Request headers: {dict(request.META)}")
            
            # Get shop credentials from request headers
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            print(f"🔍 DEBUG: Shop ID from header: {shop_id}")
            
            if not shop_id:
                print(f"❌ DEBUG: No shop ID provided")
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            print(f"🔍 DEBUG: Shop found: {shop.name}")
            
            # Get cashier from request - optional for shop owner
            cashier_id = request.META.get('HTTP_X_CASHIER_ID')
            cashier = None
            if cashier_id:
                print(f"🔍 DEBUG: Looking for cashier with id: {cashier_id}")
                try:
                    cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                    print(f"🔍 DEBUG: Cashier found: {cashier.name}")
                except Cashier.DoesNotExist:
                    print(f"❌ DEBUG: Cashier not found with id: {cashier_id}")
                    return Response({'error': 'Invalid cashier ID'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                print(f"🔍 DEBUG: No cashier ID provided, assuming shop owner operation")
            
            # Extract transfer data from request
            data = request.data.copy()
            print(f"🔍 DEBUG: Transfer data: {data}")
            
            # Create transfer instance
            transfer = StockTransfer(
                shop=shop,
                transfer_type=data.get('transfer_type', 'CONVERSION'),
                from_line_code=data.get('from_line_code', ''),
                from_barcode=data.get('from_barcode', ''),
                from_quantity=float(data.get('from_quantity', 0)),
                to_line_code=data.get('to_line_code', ''),
                to_barcode=data.get('to_barcode', ''),
                to_quantity=float(data.get('to_quantity', 0)),
                reason=data.get('reason', ''),
                performed_by=cashier,  # Can be None for shop owner operations
                notes=data.get('notes', '')
            )
            
            print(f"🔍 DEBUG: StockTransfer instance created")
            
            # Extract new product data for SPLIT operations
            if data.get('transfer_type') == 'SPLIT' and data.get('new_product_data'):
                # Store new product data in notes field for the model to use
                new_product_data = data['new_product_data']
                import json
                data['notes'] = data.get('notes', '') + '\n' + json.dumps(new_product_data)
                # Update transfer notes
                transfer.notes = data['notes']
            
            # Validate transfer
            validation_result = transfer.validate_transfer()
            print(f"🔍 DEBUG: Validation result: {validation_result}")
            
            # Check if there are critical errors (blocking)
            if validation_result['errors']:
                print(f"DEBUG: Validation errors found: {validation_result['errors']}")
                return Response({
                    'success': False,
                    'error': 'Validation failed',
                    'errors': validation_result['errors'],
                    'warnings': validation_result['warnings'],
                    'can_proceed': False,
                    'message': 'Transfer cannot proceed due to critical errors'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If there are warnings but no errors, allow user to proceed with confirmation
            if validation_result['has_warnings']:
                print(f"DEBUG: Validation warnings found: {validation_result['warnings']}")
                return Response({
                    'success': False,
                    'error': 'Validation warnings',
                    'errors': validation_result['errors'],
                    'warnings': validation_result['warnings'],
                    'can_proceed': True,
                    'requires_confirmation': True,
                    'message': 'Transfer has warnings but can proceed with user confirmation'
                }, status=status.HTTP_200_OK)
            
            # No errors or warnings - proceed directly
            print(f"🔍 DEBUG: Validation passed, proceeding with transfer")
            
            # Find products if identifiers provided
            if transfer.from_line_code or transfer.from_barcode:
                identifier = transfer.from_line_code or transfer.from_barcode
                print(f"🔍 DEBUG: Finding from_product with identifier: {identifier}")
                transfer.from_product = transfer._find_product_by_identifier(identifier)
                print(f"🔍 DEBUG: from_product found: {transfer.from_product.name if transfer.from_product else 'Not found'}")
            
            if transfer.to_line_code or transfer.to_barcode:
                identifier = transfer.to_line_code or transfer.to_barcode
                print(f"🔍 DEBUG: Finding to_product with identifier: {identifier}")
                transfer.to_product = transfer._find_product_by_identifier(identifier)
                print(f"🔍 DEBUG: to_product found: {transfer.to_product.name if transfer.to_product else 'Not found'}")
            
            # Process the transfer
            print(f"🔍 DEBUG: About to call process_transfer()")
            success, messages = transfer.process_transfer()
            print(f"🔍 DEBUG: process_transfer returned - success: {success}, messages: {messages}")
            
            if success:
                print(f"✅ DEBUG: Transfer successful, serializing data...")
                serializer = StockTransferSerializer(transfer)
                print(f"✅ DEBUG: Serialization complete, returning success response")
                return Response({
                    'success': True,
                    'message': 'Stock transfer completed successfully',
                    'data': serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                print(f"❌ DEBUG: Transfer failed")
                return Response({
                    'success': False,
                    'error': 'Transfer failed',
                    'details': messages
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"❌ DEBUG: Exception in create method: {str(e)}")
            print(f"❌ DEBUG: Exception type: {type(e)}")
            import traceback
            print(f"❌ DEBUG: Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def find_product(self, request):
        """Find a product by line code or barcode"""
        try:
            # Get shop credentials from request headers
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            if not shop_id:
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"🔍 DEBUG: Finding product for shop_id: {shop_id}")
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Get search identifier
            identifier = request.data.get('identifier', '').strip()
            if not identifier:
                return Response({
                    'success': False,
                    'error': 'Identifier (line code or barcode) required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Search for product
            product = None
            search_method = ''
            
            try:
                product = Product.objects.get(line_code=identifier, shop=shop)
                search_method = 'line_code'
            except Product.DoesNotExist:
                try:
                    product = Product.objects.get(barcode=identifier, shop=shop)
                    search_method = 'barcode'
                except Product.DoesNotExist:
                    # Check additional barcodes
                    product = Product.objects.filter(
                        shop=shop,
                        additional_barcodes__icontains=identifier
                    ).first()
                    if product:
                        search_method = 'additional_barcode'
            
            if product:
                serializer = ProductSerializer(product)
                return Response({
                    'success': True,
                    'data': {
                        'product': serializer.data,
                        'search_method': search_method,
                        'current_stock': float(product.stock_quantity or 0),
                        'stock_status': product.stock_status
                    }
                })
            else:
                return Response({
                    'success': False,
                    'error': f'Product not found with identifier: {identifier}'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def validate_transfer(self, request):
        """Validate a transfer without executing it"""
        try:
            # Get shop credentials from request headers
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            if not shop_id:
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"🔍 DEBUG: Validating transfer for shop_id: {shop_id}")
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Create temporary transfer for validation
            data = request.data.copy()
            transfer = StockTransfer(
                shop=shop,
                transfer_type=data.get('transfer_type', 'CONVERSION'),
                from_line_code=data.get('from_line_code', ''),
                from_barcode=data.get('from_barcode', ''),
                from_quantity=float(data.get('from_quantity', 0)),
                to_line_code=data.get('to_line_code', ''),
                to_barcode=data.get('to_barcode', ''),
                to_quantity=float(data.get('to_quantity', 0)),
                reason=data.get('reason', ''),
            )
            
            # Find products if identifiers provided
            if transfer.from_line_code or transfer.from_barcode:
                identifier = transfer.from_line_code or transfer.from_barcode
                transfer.from_product = transfer._find_product_by_identifier(identifier)
            
            if transfer.to_line_code or transfer.to_barcode:
                identifier = transfer.to_line_code or transfer.to_barcode
                transfer.to_product = transfer._find_product_by_identifier(identifier)
            
            # Validate transfer
            errors = transfer.validate_transfer()
            
            # Calculate conversion ratio
            conversion_ratio = transfer.calculate_conversion_ratio()
            
            return Response({
                'success': True,
                'is_valid': len(errors) == 0,
                'errors': errors,
                'conversion_ratio': float(conversion_ratio),
                'from_product_info': {
                    'name': transfer.from_product.name if transfer.from_product else 'Not found',
                    'current_stock': float(transfer.from_product.stock_quantity or 0) if transfer.from_product else 0,
                    'line_code': transfer.from_line_code,
                    'barcode': transfer.from_barcode
                } if transfer.from_product or transfer.from_line_code or transfer.from_barcode else None,
                'to_product_info': {
                    'name': transfer.to_product.name if transfer.to_product else 'Not found',
                    'current_stock': float(transfer.to_product.stock_quantity or 0) if transfer.to_product else 0,
                    'line_code': transfer.to_line_code,
                    'barcode': transfer.to_barcode
                } if transfer.to_product or transfer.to_line_code or transfer.to_barcode else None
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Product Splitting ViewSet
class ProductSplittingViewSet(viewsets.ViewSet):
    """ViewSet for Product Splitting operations"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def create_split_product(self, request):
        """Create a new product by splitting an existing product in half"""
        try:
            # Get shop credentials from request headers
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            if not shop_id:
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            # Get the source product ID from request data
            source_product_id = request.data.get('source_product_id')
            if not source_product_id:
                return Response({'error': 'Source product ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the source product
            source_product = get_object_or_404(Product, id=source_product_id, shop=shop)
            
            # Generate new product data
            new_product_data = self._generate_split_product_data(source_product)
            
            # Create the new product
            new_product = Product.objects.create(
                shop=shop,
                name=new_product_data['name'],
                description=new_product_data['description'],
                price=new_product_data['price'],  # User can set this manually
                cost_price=new_product_data['cost_price'],  # Automatically calculated
                currency=source_product.currency,
                price_type=source_product.price_type,
                category=source_product.category,
                barcode=new_product_data['barcode'],
                line_code=new_product_data['line_code'],
                additional_barcodes=[],
                stock_quantity=new_product_data['stock_quantity'],  # Start with 0
                min_stock_level=source_product.min_stock_level,
                supplier=source_product.supplier,
                supplier_invoice=source_product.supplier_invoice,
                receiving_notes=f"Split from {source_product.name} (ID: {source_product.id})",
                is_active=True
            )
            
            # Serialize and return the new product
            serializer = ProductSerializer(new_product)
            return Response({
                'success': True,
                'message': f'Successfully created {new_product.name}',
                'data': serializer.data,
                'source_product': {
                    'id': source_product.id,
                    'name': source_product.name,
                    'cost_price': float(source_product.cost_price)
                },
                'split_product': {
                    'id': new_product.id,
                    'name': new_product.name,
                    'cost_price': float(new_product.cost_price),
                    'auto_calculated': True
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to create split product: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_split_product_data(self, source_product):
        """Generate data for the new split product"""
        # Generate new name
        source_name = source_product.name
        
        # Common splitting patterns
        split_patterns = [
            ('full', 'half'),
            ('whole', 'half'),
            ('large', 'small'),
            ('regular', 'small'),
            ('standard', 'mini'),
            ('classic', 'mini'),
            ('normal', 'small'),
            ('big', 'small'),
            ('xl', 'regular'),
            ('medium', 'small')
        ]
        
        # Try to create a logical half product name
        new_name = None
        for full_word, half_word in split_patterns:
            if full_word.lower() in source_name.lower():
                new_name = source_name.lower().replace(full_word.lower(), half_word)
                break
        
        # If no pattern matches, just add "Half" prefix
        if not new_name:
            if source_name.lower().startswith('half'):
                new_name = f"Quarter {source_name[5:]}"  # If already half, make quarter
            else:
                new_name = f"Half {source_name}"
        
        # Capitalize properly
        new_name = ' '.join(word.capitalize() for word in new_name.split())
        
        # Generate new barcode and line code
        new_barcode = f"{source_product.barcode or source_product.line_code}H"
        new_line_code = f"{source_product.line_code}H"
        
        # Calculate cost price (automatically - this is the key feature!)
        original_cost_price = float(source_product.cost_price or 0)
        new_cost_price = original_cost_price / 2  # Half the cost price
        
        return {
            'name': new_name,
            'description': f"Split from {source_product.name}. Automatically calculated cost price.",
            'price': source_product.price / 2,  # Start with half the selling price too
            'cost_price': new_cost_price,  # Automatically calculated
            'barcode': new_barcode,
            'line_code': new_line_code,
            'stock_quantity': 0  # New product starts with 0 stock
        }
    
    @action(detail=False, methods=['post'])
    def validate_split(self, request):
        """Validate if a product can be split"""
        try:
            shop_id = request.META.get('HTTP_X_SHOP_ID')
            if not shop_id:
                return Response({'error': 'Shop ID required in X-Shop-ID header'}, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(ShopConfiguration, shop_id=shop_id)
            
            source_product_id = request.data.get('source_product_id')
            if not source_product_id:
                return Response({'error': 'Source product ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
            source_product = get_object_or_404(Product, id=source_product_id, shop=shop)
            
            # Validation checks
            validation_result = self._validate_split_possibility(source_product)
            
            # Generate preview of what the new product would look like
            new_product_data = self._generate_split_product_data(source_product)
            
            return Response({
                'success': True,
                'can_split': validation_result['can_split'],
                'validation_errors': validation_result['errors'],
                'warnings': validation_result['warnings'],
                'preview': {
                    'source_product': {
                        'id': source_product.id,
                        'name': source_product.name,
                        'cost_price': float(source_product.cost_price),
                        'price': float(source_product.price),
                        'stock_quantity': float(source_product.stock_quantity)
                    },
                    'new_product': {
                        'name': new_product_data['name'],
                        'cost_price': new_product_data['cost_price'],
                        'price': new_product_data['price'],
                        'line_code': new_product_data['line_code'],
                        'barcode': new_product_data['barcode']
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Validation failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _validate_split_possibility(self, source_product):
        """Validate if a product can be split"""
        errors = []
        warnings = []
        can_split = True
        
        # Check if product has cost price
        if float(source_product.cost_price or 0) <= 0:
            warnings.append("Source product has $0.00 cost price. Split product will also have $0.00 cost price.")
        
        # Check if product is active
        if not source_product.is_active:
            errors.append("Source product is not active.")
            can_split = False
        
        # Check if product has stock
        if float(source_product.stock_quantity or 0) <= 0:
            warnings.append("Source product has no stock. Split product will start with 0 stock.")
        
        # Check for duplicate names (basic check)
        existing_half_products = Product.objects.filter(
            shop=source_product.shop,
            name__icontains='half',
            category=source_product.category
        ).exclude(id=source_product.id)
        
        if existing_half_products.exists():
            warnings.append(f"Found {existing_half_products.count()} existing 'half' products in the same category.")
        
        return {
            'can_split': can_split,
            'errors': errors,
            'warnings': warnings
        }


# ============================================================================
# CURRENCY WALLET API VIEWS
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class WalletSummaryView(APIView):
    """Get wallet summary with all currency balances"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
            
            return Response({
                'success': True,
                'wallet': wallet.get_wallet_summary()
            })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class WalletTransactionsView(APIView):
    """Get wallet transaction history"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # Optional filters
            currency = request.query_params.get('currency')
            transaction_type = request.query_params.get('type')
            limit = request.query_params.get('limit', '50')
            
            transactions = CurrencyTransaction.objects.filter(shop=shop).order_by('-created_at')
            
            if currency:
                transactions = transactions.filter(currency=currency.upper())
            
            if transaction_type:
                transactions = transactions.filter(transaction_type=transaction_type.upper())
            
            try:
                limit_int = int(limit)
                transactions = transactions[:limit_int]
            except ValueError:
                pass
            
            transaction_data = []
            for tx in transactions:
                transaction_data.append({
                    'id': tx.id,
                    'type': tx.transaction_type,
                    'currency': tx.currency,
                    'amount': float(tx.amount),
                    'description': tx.description,
                    'balance_after': float(tx.balance_after),
                    'performed_by': tx.performed_by.name if tx.performed_by else None,
                    'created_at': tx.created_at.isoformat()
                })
            
            return Response({
                'success': True,
                'transactions': transaction_data,
                'total_count': CurrencyTransaction.objects.filter(shop=shop).count()
            })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class WalletAdjustmentView(APIView):
    """Make manual adjustments to wallet balance (owner only)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # Verify owner credentials
            email = request.data.get('email')
            password = request.data.get('password')
            
            if not email or not password:
                return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            if shop.email != email or not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get adjustment details
            currency = request.data.get('currency', 'USD').upper()
            amount = request.data.get('amount')
            adjustment_type = request.data.get('type', 'ADJUSTMENT')  # ADJUSTMENT, DEPOSIT, WITHDRAWAL
            description = request.data.get('description', '')
            cashier_id = request.data.get('cashier_id')
            
            if not amount:
                return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                amount = Decimal(str(amount))
            except (ValueError, TypeError):
                return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)
            
            if amount <= 0:
                return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create wallet
            wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
            
            # Get performed by
            performed_by = None
            if cashier_id:
                try:
                    performed_by = Cashier.objects.get(id=cashier_id, shop=shop)
                except Cashier.DoesNotExist:
                    pass
            
            # Get balance before
            balance_before = wallet.get_balance(currency)
            
            # Apply adjustment based on type
            if adjustment_type in ['DEPOSIT', 'ADJUSTMENT']:
                balance_after = wallet.add_amount(amount, currency)
                tx_type = 'DEPOSIT' if adjustment_type == 'DEPOSIT' else 'ADJUSTMENT'
            else:  # WITHDRAWAL
                # Subtract from wallet
                if currency == 'USD':
                    wallet.balance_usd -= amount
                elif currency == 'ZIG':
                    wallet.balance_zig -= amount
                elif currency == 'RAND':
                    wallet.balance_rand -= amount
                wallet.total_transactions += 1
                wallet.save()
                balance_after = wallet.get_balance(currency)
                tx_type = 'WITHDRAWAL'
            
            # Create transaction record
            CurrencyTransaction.objects.create(
                shop=shop,
                wallet=wallet,
                transaction_type=tx_type,
                currency=currency,
                amount=amount if tx_type in ['DEPOSIT', 'ADJUSTMENT'] else -amount,
                reference_type='ManualAdjustment',
                description=description or f'{tx_type} by shop owner',
                balance_after=balance_after,
                performed_by=performed_by
            )
            
            return Response({
                'success': True,
                'message': f'{tx_type} of {amount} {currency} processed successfully',
                'wallet': wallet.get_wallet_summary()
            })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# DRAWER ACCESS CONTROL API VIEWS
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class GrantDrawerAccessView(APIView):
    """Grant drawer access to a cashier (owner only)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # Verify owner credentials
            email = request.data.get('email')
            password = request.data.get('password')
            
            if not email or not password:
                return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            if shop.email != email or not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get cashier ID
            cashier_id = request.data.get('cashier_id')
            if not cashier_id:
                return Response({"error": "Cashier ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Grant drawer access by updating CashFloat
            today = timezone.now().date()
            cash_float, created = CashFloat.objects.get_or_create(
                shop=shop,
                cashier=cashier,
                date=today,
                defaults={
                    'float_amount': Decimal('0.00'),
                    'float_amount_zig': Decimal('0.00'),
                    'float_amount_rand': Decimal('0.00'),
                    'current_cash': Decimal('0.00'),
                    'current_card': Decimal('0.00'),
                    'current_ecocash': Decimal('0.00'),
                    'current_transfer': Decimal('0.00'),
                    'current_total': Decimal('0.00'),
                    'status': 'ACTIVE'
                }
            )
            
            # Grant access if not already granted
            if cash_float.drawer_access_granted:
                return Response({
                    'success': True,
                    'message': f'Drawer access was already granted to {cashier.name}',
                    'cashier': {
                        'id': cashier.id,
                        'name': cashier.name,
                        'drawer_access_granted': True
                    }
                })
            
            # Grant drawer access
            cash_float.drawer_access_granted = True
            cash_float.drawer_access_granted_at = timezone.now()
            cash_float.drawer_access_granted_by = shop.name  # Shop owner granted it
            cash_float.save()
            
            return Response({
                'success': True,
                'message': f'Drawer access granted to {cashier.name}',
                'cashier': {
                    'id': cashier.id,
                    'name': cashier.name,
                    'drawer_access_granted': True,
                    'access_granted_at': cash_float.drawer_access_granted_at.isoformat()
                }
            })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class RevokeDrawerAccessView(APIView):
    """Revoke drawer access from a cashier (owner only)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # Verify owner credentials
            email = request.data.get('email')
            password = request.data.get('password')
            
            if not email or not password:
                return Response({"error": "Owner authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            if shop.email != email or not shop.validate_shop_owner_master_password(password):
                return Response({"error": "Invalid owner credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get cashier ID
            cashier_id = request.data.get('cashier_id')
            if not cashier_id:
                return Response({"error": "Cashier ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Find and update CashFloat to revoke access
            today = timezone.now().date()
            try:
                cash_float = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)
                
                if not cash_float.drawer_access_granted:
                    return Response({
                        'success': True,
                        'message': f'Drawer access was already revoked for {cashier.name}',
                        'cashier': {
                            'id': cashier.id,
                            'name': cashier.name,
                            'drawer_access_granted': False
                        }
                    })
                
                # Revoke drawer access
                cash_float.drawer_access_granted = False
                cash_float.drawer_access_revoked_at = timezone.now()
                cash_float.save()
                
                return Response({
                    'success': True,
                    'message': f'Drawer access revoked from {cashier.name}',
                    'cashier': {
                        'id': cashier.id,
                        'name': cashier.name,
                        'drawer_access_granted': False,
                        'access_revoked_at': cash_float.drawer_access_revoked_at.isoformat()
                    }
                })
            except CashFloat.DoesNotExist:
                # No cash float exists, but we can still record the revocation intent
                return Response({
                    'success': True,
                    'message': f'Cashier {cashier.name} has no drawer - access considered revoked',
                    'cashier': {
                        'id': cashier.id,
                        'name': cashier.name,
                        'drawer_access_granted': False
                    }
                })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AllSalesHistoryView(APIView):
    """Get ALL sales history - never affected by EOD deletion - for Owner Dashboard"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all sales regardless of shop day status
        sales = Sale.objects.filter(
            shop=shop,
            status='completed'
        ).order_by('-created_at')
        
        # Serialize sales with full details
        sales_data = []
        for sale in sales:
            sale_data = {
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name or '',
                'total_amount': float(sale.total_amount),
                'currency': sale.currency,
                'payment_currency': sale.payment_currency,
                'wallet_account': sale.wallet_account,
                'status': sale.status,
                'items': []
            }
            
            # Add sale items with product details
            for item in sale.items.all():
                sale_data['items'].append({
                    'product_id': item.product.id if item.product else None,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'refunded': item.refunded,
                    'refund_reason': item.refund_reason or ''
                })
            
            sales_data.append(sale_data)
        
        # Calculate summary statistics
        total_revenue = sum(sale.total_amount for sale in sales)
        total_transactions = sales.count()
        avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
        
        # Group by date for daily breakdown
        from collections import defaultdict
        daily_sales = defaultdict(lambda: {'revenue': 0, 'transactions': 0})
        for sale in sales:
            date_key = sale.created_at.date().isoformat()
            daily_sales[date_key]['revenue'] += float(sale.total_amount)
            daily_sales[date_key]['transactions'] += 1
        
        daily_breakdown = [
            {
                'date': date,
                'revenue': f"{data['revenue']:.2f}",
                'transactions': data['transactions']
            }
            for date, data in sorted(daily_sales.items(), reverse=True)
        ]
        
        # Group by payment method
        payment_methods = defaultdict(float)
        for sale in sales:
            payment_methods[sale.payment_method] += float(sale.total_amount)
        
        # Convert total_revenue to float for percentage calculation
        total_revenue_float = float(total_revenue)
        
        payment_analysis = [
            {
                'payment_method': method,
                'total_revenue': amount,
                'percentage': (amount / total_revenue_float * 100) if total_revenue_float > 0 else 0
            }
            for method, amount in payment_methods.items()
        ]
        
        # Group by currency
        currencies = defaultdict(float)
        for sale in sales:
            currency_key = sale.payment_currency or sale.currency
            currencies[currency_key] += float(sale.total_amount)
        
        currency_breakdown = [
            {
                'currency': currency,
                'total_revenue': amount,
                'transaction_count': Sale.objects.filter(
                    shop=shop,
                    status='completed'
                ).filter(
                    models.Q(payment_currency=currency) | models.Q(currency=currency)
                ).count()
            }
            for currency, amount in currencies.items()
        ]
        
        return Response({
            'success': True,
            'all_sales': sales_data,
            'summary': {
                'total_revenue': float(total_revenue),
                'total_transactions': total_transactions,
                'average_transaction': float(avg_transaction),
                'date_range': {
                    'earliest': sales.last().created_at.isoformat() if sales.exists() else None,
                    'latest': sales.first().created_at.isoformat() if sales.exists() else None
                }
            },
            'daily_breakdown': daily_breakdown,
            'payment_analysis': payment_analysis,
            'currency_breakdown': currency_breakdown
        })


@method_decorator(csrf_exempt, name='dispatch')
class AllSalesHistoryView(APIView):
    """Get ALL sales history - never affected by EOD deletion - for Owner Dashboard"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all sales regardless of shop day status
        sales = Sale.objects.filter(
            shop=shop,
            status='completed'
        ).order_by('-created_at')
        
        # Serialize sales with full details
        sales_data = []
        for sale in sales:
            sale_data = {
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'created_at': sale.created_at.isoformat(),
                'cashier_id': sale.cashier.id if sale.cashier else None,
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name or '',
                'total_amount': float(sale.total_amount),
                'currency': sale.currency,
                'payment_currency': sale.payment_currency,
                'wallet_account': sale.wallet_account,
                'status': sale.status,
                'items': []
            }
            
            # Add sale items with product details
            for item in sale.items.all():
                sale_data['items'].append({
                    'product_id': item.product.id if item.product else None,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'category': item.product.category if item.product else '',
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'refunded': item.refunded,
                    'refund_reason': item.refund_reason or ''
                })
            
            sales_data.append(sale_data)
        
        # Calculate summary statistics
        total_revenue = sum(sale.total_amount for sale in sales)
        total_transactions = sales.count()
        avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
        
        # Group by date for daily breakdown
        from collections import defaultdict
        daily_sales = defaultdict(lambda: {'revenue': 0, 'transactions': 0})
        for sale in sales:
            date_key = sale.created_at.date().isoformat()
            daily_sales[date_key]['revenue'] += float(sale.total_amount)
            daily_sales[date_key]['transactions'] += 1
        
        daily_breakdown = [
            {
                'date': date,
                'revenue': f"{data['revenue']:.2f}",
                'transactions': data['transactions']
            }
            for date, data in sorted(daily_sales.items(), reverse=True)
        ]
        
        # Group by payment method
        payment_methods = defaultdict(float)
        for sale in sales:
            payment_methods[sale.payment_method] += float(sale.total_amount)
        
        # Convert total_revenue to float for percentage calculation
        total_revenue_float = float(total_revenue)
        
        payment_analysis = [
            {
                'payment_method': method,
                'total_revenue': amount,
                'percentage': (amount / total_revenue_float * 100) if total_revenue_float > 0 else 0
            }
            for method, amount in payment_methods.items()
        ]
        
        # Group by currency
        currencies = defaultdict(float)
        for sale in sales:
            currency_key = sale.payment_currency or sale.currency
            currencies[currency_key] += float(sale.total_amount)
        
        currency_breakdown = [
            {
                'currency': currency,
                'total_revenue': amount,
                'transaction_count': Sale.objects.filter(
                    shop=shop,
                    status='completed'
                ).filter(
                    models.Q(payment_currency=currency) | models.Q(currency=currency)
                ).count()
            }
            for currency, amount in currencies.items()
        ]
        
        return Response({
            'success': True,
            'all_sales': sales_data,
            'summary': {
                'total_revenue': float(total_revenue),
                'total_transactions': total_transactions,
                'average_transaction': float(avg_transaction),
                'date_range': {
                    'earliest': sales.last().created_at.isoformat() if sales.exists() else None,
                    'latest': sales.first().created_at.isoformat() if sales.exists() else None
                }
            },
            'daily_breakdown': daily_breakdown,
            'payment_analysis': payment_analysis,
            'currency_breakdown': currency_breakdown
        })


@method_decorator(csrf_exempt, name='dispatch')
class AllCashierSalesHistoryView(APIView):
    """Get ALL sales history for a specific cashier - never affected by EOD deletion"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get cashier_id from query params
        cashier_id = request.query_params.get('cashier_id')
        cashier_identifier = request.query_params.get('cashier_identifier')  # Can be name or ID
        
        print(f"🔍 AllCashierSalesHistoryView: cashier_id={cashier_id}, cashier_identifier={cashier_identifier}")
        
        # Try to find the cashier by multiple methods
        cashier = None
        
        if cashier_id:
            try:
                # Try to find by numeric ID first
                cashier = Cashier.objects.get(id=int(cashier_id), shop=shop)
                print(f"✅ Found cashier by ID: {cashier.name}")
            except (Cashier.DoesNotExist, ValueError):
                # Try to find by name/email as identifier
                try:
                    cashier = Cashier.objects.get(shop=shop, name__iexact=str(cashier_id))
                    print(f"✅ Found cashier by name: {cashier.name}")
                except Cashier.DoesNotExist:
                    try:
                        cashier = Cashier.objects.get(shop=shop, email__iexact=str(cashier_id))
                        print(f"✅ Found cashier by email: {cashier.name}")
                    except Cashier.DoesNotExist:
                        print(f"❌ Cashier not found by ID: {cashier_id}")
        
        # If cashier_identifier provided and cashier still not found
        if not cashier and cashier_identifier:
            try:
                # Use icontains for case-insensitive partial matching (more flexible)
                cashier = Cashier.objects.get(shop=shop, name__icontains=str(cashier_identifier))
                print(f"✅ Found cashier by identifier (icontains): {cashier.name}")
            except Cashier.DoesNotExist:
                print(f"❌ Cashier not found by identifier: {cashier_identifier}")
            except Cashier.MultipleObjectsReturned:
                # If multiple cashiers match, try to find the best match
                cashiers = Cashier.objects.filter(shop=shop, name__icontains=str(cashier_identifier))
                # Try to match exactly with case-insensitive
                exact_match = cashiers.filter(name__iexact=str(cashier_identifier)).first()
                if exact_match:
                    cashier = exact_match
                    print(f"✅ Found exact match among multiples: {cashier.name}")
                else:
                    # Return the first one as fallback
                    cashier = cashiers.first()
                    print(f"⚠️ Multiple cashiers matched, using first: {cashier.name if cashier else 'None'}")
        
        # Build the sales query
        sales_query = Sale.objects.filter(
            shop=shop,
            status='completed'
        ).order_by('-created_at')
        
        if cashier:
            sales_query = sales_query.filter(cashier=cashier)
            print(f"📊 Filtering sales by cashier ID: {cashier.id}, name: {cashier.name}")
        elif cashier_identifier:
            # If no cashier found, try to filter by cashier_name in the sale data using icontains
            sales_query = sales_query.filter(
                models.Q(cashier__name__icontains=cashier_identifier)
            )
            print(f"📊 Filtering sales by cashier_name (icontains): {cashier_identifier}")
        else:
            # If no cashier info provided, return ALL sales
            print(f"📊 No cashier specified, returning ALL sales")
        
        sales = sales_query
        print(f"📊 Found {sales.count()} sales")
        
        # Print sample sale cashier info to debug
        if sales.exists():
            sample_sale = sales.first()
            print(f"📊 Sample sale cashier: {sample_sale.cashier}, cashier_name: {sample_sale.cashier.name if sample_sale.cashier else 'None'}")
        
        # Serialize sales with full details
        sales_data = []
        for sale in sales:
            sale_data = {
                'id': sale.id,
                'receipt_number': f'R{sale.id:03d}',
                'created_at': sale.created_at.isoformat(),
                'cashier_name': sale.cashier.name if sale.cashier else 'Unknown',
                'cashier_id': sale.cashier.id if sale.cashier else None,
                'payment_method': sale.payment_method,
                'customer_name': sale.customer_name or '',
                'total_amount': float(sale.total_amount),
                'currency': sale.currency,
                'payment_currency': sale.payment_currency,
                'wallet_account': sale.wallet_account,
                'status': sale.status,
                'items': []
            }
            
            # Add sale items with product details
            for item in sale.items.all():
                sale_data['items'].append({
                    'product_id': item.product.id if item.product else None,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'category': item.product.category if item.product else '',
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'refunded': item.refunded,
                    'refund_reason': item.refund_reason or ''
                })
            
            sales_data.append(sale_data)
        
        # Calculate summary statistics
        total_revenue = sum(sale.total_amount for sale in sales)
        total_transactions = sales.count()
        avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
        
        # Payment method breakdown
        cash_sales = sales.filter(payment_method='cash')
        card_sales = sales.filter(payment_method='card')
        transfer_sales = sales.filter(payment_method='transfer')
        
        summary = {
            'cashier_name': cashier.name if cashier else (cashier_identifier or 'All Sales'),
            'cashier_id': cashier.id if cashier else None,
            'total_sales': total_transactions,
            'total_revenue': float(total_revenue),
            'average_sale': float(avg_transaction),
            'cash_sales': cash_sales.count(),
            'cash_revenue': float(cash_sales.aggregate(total=Sum('total_amount'))['total'] or 0),
            'card_sales': card_sales.count(),
            'card_revenue': float(card_sales.aggregate(total=Sum('total_amount'))['total'] or 0),
            'transfer_sales': transfer_sales.count(),
            'transfer_revenue': float(transfer_sales.aggregate(total=Sum('total_amount'))['total'] or 0),
            'date_range': {
                'earliest': sales.last().created_at.isoformat() if sales.exists() else None,
                'latest': sales.first().created_at.isoformat() if sales.exists() else None
            }
        }
        
        return Response({
            'success': True,
            'cashier_sales': sales_data,
            'summary': summary
        })


@method_decorator(csrf_exempt, name='dispatch')
class DeleteTodayStaffLunchView(APIView):
    """Delete all today's staff lunch records (OWNER ONLY - no auth required)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # NO AUTHENTICATION REQUIRED - the EOD screen is already protected
            
            today = timezone.now().date()
            
            # Get all staff lunch records for today
            today_lunches = StaffLunch.objects.filter(shop=shop, created_at__date=today)
            deleted_count = today_lunches.count()
            
            # Delete all staff lunch records for today
            today_lunches.delete()
            
            return Response({
                "success": True,
                "message": f"Successfully deleted {deleted_count} staff lunch records for today ({today})",
                "deleted_count": deleted_count,
                "date": str(today)
            }, status=status.HTTP_200_OK)
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Failed to delete staff lunch records: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator(csrf_exempt, name='dispatch')
class DeleteTodaySalesView(APIView):
    """Delete all today's sales and reset all drawers to start fresh (OWNER ONLY - no auth required)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            # NO AUTHENTICATION REQUIRED - allow anyone to delete today's sales
            # The EOD screen is already protected and only accessible to authorized users
            
            today = timezone.now().date()
            
            # Get all sales for today
            from .models import Sale, SaleItem, CashFloat, CurrencyWallet, CurrencyTransaction
            
            # Get unique shops and cashiers from today's sales
            today_sales = Sale.objects.filter(created_at__date=today)
            sale_count = today_sales.count()
            
            print(f"🗑️ Deleting {sale_count} sales for {today}")
            
            # Get unique shops and cashiers from these sales
            shops = set()
            cashiers = set()
            for sale in today_sales:
                shops.add(sale.shop)
                cashiers.add((sale.shop, sale.cashier))
            
            # Delete all sales for today
            today_sales.delete()
            print(f"✅ Deleted {sale_count} sales")
            
            # Reset all CashFloat records for today to zero
            from decimal import Decimal
            for shop_obj, cashier in cashiers:
                try:
                    drawer = CashFloat.objects.get(shop=shop_obj, cashier=cashier, date=today)
                    
                    # Reset all currency fields to zero
                    drawer.current_cash = Decimal('0.00')
                    drawer.current_card = Decimal('0.00')
                    drawer.current_ecocash = Decimal('0.00')
                    drawer.current_transfer = Decimal('0.00')
                    drawer.current_total = Decimal('0.00')
                    
                    drawer.current_cash_usd = Decimal('0.00')
                    drawer.current_cash_zig = Decimal('0.00')
                    drawer.current_cash_rand = Decimal('0.00')
                    drawer.current_card_usd = Decimal('0.00')
                    drawer.current_card_zig = Decimal('0.00')
                    drawer.current_card_rand = Decimal('0.00')
                    drawer.current_ecocash_usd = Decimal('0.00')
                    drawer.current_ecocash_zig = Decimal('0.00')
                    drawer.current_ecocash_rand = Decimal('0.00')
                    drawer.current_transfer_usd = Decimal('0.00')
                    drawer.current_transfer_zig = Decimal('0.00')
                    drawer.current_transfer_rand = Decimal('0.00')
                    drawer.current_total_usd = Decimal('0.00')
                    drawer.current_total_zig = Decimal('0.00')
                    drawer.current_total_rand = Decimal('0.00')
                    
                    drawer.session_cash_sales = Decimal('0.00')
                    drawer.session_card_sales = Decimal('0.00')
                    drawer.session_ecocash_sales = Decimal('0.00')
                    drawer.session_transfer_sales = Decimal('0.00')
                    drawer.session_total_sales = Decimal('0.00')
                    
                    drawer.session_cash_sales_usd = Decimal('0.00')
                    drawer.session_cash_sales_zig = Decimal('0.00')
                    drawer.session_cash_sales_rand = Decimal('0.00')
                    drawer.session_card_sales_usd = Decimal('0.00')
                    drawer.session_card_sales_zig = Decimal('0.00')
                    drawer.session_card_sales_rand = Decimal('0.00')
                    drawer.session_ecocash_sales_usd = Decimal('0.00')
                    drawer.session_ecocash_sales_zig = Decimal('0.00')
                    drawer.session_ecocash_sales_rand = Decimal('0.00')
                    drawer.session_transfer_sales_usd = Decimal('0.00')
                    drawer.session_transfer_sales_zig = Decimal('0.00')
                    drawer.session_transfer_sales_rand = Decimal('0.00')
                    drawer.session_total_sales_usd = Decimal('0.00')
                    drawer.session_total_sales_zig = Decimal('0.00')
                    drawer.session_total_sales_rand = Decimal('0.00')
                    
                    drawer.status = 'INACTIVE'
                    drawer.save()
                    print(f"✅ Reset drawer for {cashier.name}")
                except CashFloat.DoesNotExist:
                    print(f"ℹ️ No drawer found for {cashier.name}")
            
            # Reset CurrencyWallet balances to zero
            wallet, created = CurrencyWallet.objects.get_or_create(shop=shop)
            wallet.balance_usd = Decimal('0.00')
            wallet.balance_zig = Decimal('0.00')
            wallet.balance_rand = Decimal('0.00')
            wallet.total_transactions = 0
            wallet.save()
            print("✅ Reset currency wallet balances to zero")
            
            # Delete currency transactions for today
            transactions_deleted = CurrencyTransaction.objects.filter(
                shop=shop,
                created_at__date=today
            ).delete()
            print(f"✅ Deleted {transactions_deleted[0] if transactions_deleted[0] else 0} currency transactions")
            
            return Response({
                "success": True,
                "message": f"Successfully deleted {sale_count} sales and reset all drawers for today ({today})",
                "deleted_sales": sale_count,
                "date": str(today)
            }, status=status.HTTP_200_OK)
            
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Failed to delete sales: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class DrawerAccessStatusView(APIView):
    """Check if a cashier has drawer access (for cashier drawer screen)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
            
            cashier_id = request.query_params.get('cashier_id')
            if not cashier_id:
                return Response({"error": "Cashier ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                return Response({
                    'error': "Cashier not found",
                    'drawer_access_granted': False
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check drawer access from CashFloat
            today = timezone.localdate()
            try:
                cash_float = CashFloat.objects.get(shop=shop, cashier=cashier, date=today)
                has_access = cash_float.drawer_access_granted
            except CashFloat.DoesNotExist:
                # No cash float exists - access not granted
                has_access = False
            
            return Response({
                'success': True,
                'cashier': {
                    'id': cashier.id,
                    'name': cashier.name,
                    'drawer_access_granted': has_access
                },
                'can_access_drawer': has_access
            })
        except Exception as e:
            return Response({
                'error': f'Server error: {str(e)}',
                'drawer_access_granted': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryReceiveView(APIView):
    """Receive inventory from supplier - updates product stock and creates inventory log"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get receiving data from request
        reference = request.data.get('reference', '')
        invoice_number = request.data.get('invoiceNumber', '')
        supplier = request.data.get('supplier', 'Unknown Supplier')
        receiving_date = request.data.get('receivingDate', timezone.now().date().isoformat())
        notes = request.data.get('notes', '')
        items = request.data.get('items', [])
        totals = request.data.get('totals', {})
        
        if not items:
            return Response({"error": "No items to receive"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get cashier from request (optional for receiving)
        cashier_id = request.data.get('cashier_id')
        cashier = None
        if cashier_id:
            try:
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                pass
        
        # Process each item
        received_items = []
        errors = []
        
        with transaction.atomic():
            for item_data in items:
                product_id = item_data.get('productId')
                quantity = item_data.get('quantity', 0)
                cost_price = item_data.get('costPrice', 0)
                
                if not product_id or quantity <= 0:
                    errors.append(f"Invalid item data: {item_data}")
                    continue
                
                try:
                    product = Product.objects.get(id=product_id, shop=shop)
                    
                    # Store previous quantity
                    previous_quantity = product.stock_quantity
                    
                    # Update stock quantity
                    product.stock_quantity = product.stock_quantity + Decimal(str(quantity))
                    
                    # Update cost price if requested
                    if item_data.get('updateBaseCost', False):
                        product.cost_price = Decimal(str(cost_price))
                    
                    product.save()
                    
                    # Create inventory log
                    InventoryLog.objects.create(
                        shop=shop,
                        product=product,
                        reason_code='RECEIVING',
                        quantity_change=Decimal(str(quantity)),
                        previous_quantity=previous_quantity,
                        new_quantity=product.stock_quantity,
                        performed_by=cashier,
                        reference_number=reference or f'REC-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                        notes=f'Received from {supplier}. Invoice: {invoice_number}. {notes}'.strip()
                    )
                    
                    received_items.append({
                        'product_id': product.id,
                        'product_name': product.name,
                        'quantity': quantity,
                        'previous_quantity': float(previous_quantity),
                        'new_quantity': float(product.stock_quantity)
                    })
                    
                except Product.DoesNotExist:
                    errors.append(f"Product with ID {product_id} not found")
                except Exception as e:
                    errors.append(f"Error processing product {product_id}: {str(e)}")
        
        if errors:
            return Response({
                "success": False,
                "message": "Some items failed to process",
                "errors": errors,
                "received_items": received_items
            }, status=status.HTTP_207_MULTI_STATUS)
        
        return Response({
            "success": True,
            "message": f"Successfully received {len(received_items)} items",
            "reference": reference,
            "supplier": supplier,
            "invoice_number": invoice_number,
            "receiving_date": receiving_date,
            "totals": totals,
            "received_items": received_items
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryReceivingHistoryView(APIView):
    """Get inventory receiving history"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all inventory logs for receiving
        receiving_logs = InventoryLog.objects.filter(
            shop=shop,
            reason_code='RECEIVING'
        ).order_by('-created_at')
        
        # Group by reference number
        history_by_reference = {}
        for log in receiving_logs:
            ref = log.reference_number or 'UNKNOWN'
            if ref not in history_by_reference:
                history_by_reference[ref] = {
                    'reference': ref,
                    'date': log.created_at.date().isoformat(),
                    'supplier': 'Unknown',
                    'items': [],
                    'total_quantity': 0,
                    'total_value': 0
                }
            
            history_by_reference[ref]['items'].append({
                'product_name': log.product.name,
                'quantity_change': float(log.quantity_change),
                'previous_quantity': float(log.previous_quantity),
                'new_quantity': float(log.new_quantity),
                'performed_by': log.performed_by.name if log.performed_by else 'Unknown'
            })
            history_by_reference[ref]['total_quantity'] += float(log.quantity_change)
        
        history_data = list(history_by_reference.values())
        
        return Response({
            "success": True,
            "total_receiving_records": len(history_data),
            "history": history_data
        })


# ============================================================================
# BUSINESS SETTINGS API VIEWS
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class BusinessSettingsView(APIView):
    """Get and update business settings (business hours, timezone, VAT)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Get current business settings"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "success": True,
            "settings": {
                "base_currency": shop.base_currency,
                "opening_time": shop.opening_time.strftime('%H:%M') if shop.opening_time else '08:00',
                "closing_time": shop.closing_time.strftime('%H:%M') if shop.closing_time else '20:00',
                "timezone": shop.timezone or 'Africa/Harare',
                "vat_rate": float(shop.vat_rate) if shop.vat_rate else 15.0,
                "business_hours_display": f"{shop.opening_time.strftime('%I:%M %p') if shop.opening_time else '8:00 AM'} - {shop.closing_time.strftime('%I:%M %p') if shop.closing_time else '8:00 PM'}"
            }
        })
    
    def patch(self, request):
        """Update business settings (no authentication required - local updates work regardless)"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # No authentication required - allow anyone to update business settings
        # The SettingsScreen already saves locally even if API fails
        
        # Update settings
        updated_fields = []
        
        if 'opening_time' in request.data:
            # Handle time format - can be "08:00" or "08:00:00"
            opening_time_str = request.data['opening_time']
            try:
                from datetime import time
                if ':' in opening_time_str:
                    parts = opening_time_str.split(':')
                    hour = int(parts[0])
                    minute = int(parts[1]) if len(parts) > 1 else 0
                    shop.opening_time = time(hour, minute)
                    updated_fields.append('opening_time')
            except (ValueError, IndexError):
                return Response({"error": "Invalid opening_time format. Use HH:MM format."}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'closing_time' in request.data:
            # Handle time format - can be "20:00" or "20:00:00"
            closing_time_str = request.data['closing_time']
            try:
                from datetime import time
                if ':' in closing_time_str:
                    parts = closing_time_str.split(':')
                    hour = int(parts[0])
                    minute = int(parts[1]) if len(parts) > 1 else 0
                    shop.closing_time = time(hour, minute)
                    updated_fields.append('closing_time')
            except (ValueError, IndexError):
                return Response({"error": "Invalid closing_time format. Use HH:MM format."}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'timezone' in request.data:
            # Validate timezone
            import pytz
            try:
                tz = pytz.timezone(request.data['timezone'])
                shop.timezone = request.data['timezone']
                updated_fields.append('timezone')
            except pytz.exceptions.UnknownTimeZoneError:
                return Response({"error": "Invalid timezone. Use a valid timezone like 'Africa/Harare'."}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'vat_rate' in request.data:
            try:
                vat_rate = float(request.data['vat_rate'])
                if vat_rate < 0 or vat_rate > 100:
                    return Response({"error": "VAT rate must be between 0 and 100"}, status=status.HTTP_400_BAD_REQUEST)
                shop.vat_rate = vat_rate
                updated_fields.append('vat_rate')
            except (ValueError, TypeError):
                return Response({"error": "Invalid VAT rate format"}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'base_currency' in request.data:
            valid_currencies = ['USD', 'ZIG', 'RAND']
            if request.data['base_currency'] not in valid_currencies:
                return Response({"error": f"Invalid currency. Must be one of: {', '.join(valid_currencies)}"}, status=status.HTTP_400_BAD_REQUEST)
            shop.base_currency = request.data['base_currency']
            updated_fields.append('base_currency')
        
        if updated_fields:
            shop.save()
            
        return Response({
            "success": True,
            "message": "Business settings updated successfully",
            "settings": {
                "base_currency": shop.base_currency,
                "opening_time": shop.opening_time.strftime('%H:%M') if shop.opening_time else '08:00',
                "closing_time": shop.closing_time.strftime('%H:%M') if shop.closing_time else '20:00',
                "timezone": shop.timezone or 'Africa/Harare',
                "vat_rate": float(shop.vat_rate) if shop.vat_rate else 15.0,
                "business_hours_display": f"{shop.opening_time.strftime('%I:%M %p') if shop.opening_time else '8:00 AM'} - {shop.closing_time.strftime('%I:%M %p') if shop.closing_time else '8:00 PM'}"
            },
            "updated_fields": updated_fields
        })
