from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import models
from decimal import Decimal

from .models_reconciliation import CashierCount, ReconciliationSession
from .models import ShopConfiguration, Cashier, CashFloat


class CashierCountView(APIView):
    """
    API View for Cashier Count management
    GET /api/v1/shop/reconciliation/count/ - Get cashier count data
    POST /api/v1/shop/reconciliation/count/ - Save/update cashier count
    """
    
    def get(self, request):
        """Get cashier count data for reconciliation"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        cashier_id = request.query_params.get('cashier_id')
        date = request.query_params.get('date')
        
        if not cashier_id:
            return Response({"error": "cashier_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not date:
            date = timezone.now().date()
        else:
            try:
                from datetime import datetime
                date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Try to find cashier by name first (for frontend compatibility)
            try:
                cashier = Cashier.objects.get(name=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                # Fallback to ID lookup if name lookup fails
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except (Cashier.DoesNotExist, ValueError):
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get or create count record
        count, created = CashierCount.get_or_create_count(shop, cashier, date)
        
        # Update expected amounts from CashFloat if available
        try:
            cash_float = CashFloat.get_active_drawer(shop, cashier)
            if cash_float:
                count.update_from_cash_float(cash_float)
        except Exception:
            # Non-fatal if CashFloat doesn't exist
            pass
        
        return Response({
            "success": True,
            "count_data": count.get_count_summary(),
            "created": created
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Save or update cashier count data"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data
        
        # Validate required fields
        cashier_id = data.get('cashier_id')
        if not cashier_id:
            return Response({"error": "cashier_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Try to find cashier by name first (for frontend compatibility)
            try:
                cashier = Cashier.objects.get(name=cashier_id, shop=shop)
            except Cashier.DoesNotExist:
                # Fallback to ID lookup if name lookup fails
                cashier = Cashier.objects.get(id=cashier_id, shop=shop)
        except (Cashier.DoesNotExist, ValueError):
            return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get or create count record
        date = data.get('date')
        if date:
            try:
                from datetime import datetime
                date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        count, created = CashierCount.get_or_create_count(shop, cashier, date)
        
        # Update denomination counts
        count.hundreds = int(data.get('hundreds', 0))
        count.fifties = int(data.get('fifties', 0))
        count.twenties = int(data.get('twenties', 0))
        count.tens = int(data.get('tens', 0))
        count.fives = int(data.get('fives', 0))
        count.twos = int(data.get('twos', 0))
        count.ones = int(data.get('ones', 0))
        count.coins = int(data.get('coins', 0))
        
        # Update receipt counts
        count.card_receipts = int(data.get('card_receipts', 0))
        count.ecocash_receipts = int(data.get('ecocash_receipts', 0))
        count.other_receipts = int(data.get('other_receipts', 0))
        
        # Update expected amounts (support multi-currency)
        count.expected_cash = Decimal(str(data.get('expected_cash', 0)))
        count.expected_cash_usd = Decimal(str(data.get('expected_cash_usd', 0)))
        count.expected_cash_rand = Decimal(str(data.get('expected_cash_rand', 0)))
        count.expected_card = Decimal(str(data.get('expected_card', 0)))
        count.expected_ecocash = Decimal(str(data.get('expected_ecocash', 0)))
        
        # Update notes and status
        count.notes = data.get('notes', '')
        status_value = data.get('status', 'IN_PROGRESS')
        if status_value in ['IN_PROGRESS', 'COMPLETED', 'REVIEWED']:
            count.status = status_value
        
        # Save the count (this will auto-calculate totals)
        count.save()
        
        # Update reconciliation session
        session, _ = ReconciliationSession.get_or_create_session(shop, date)
        session.calculate_session_summary()
        
        return Response({
            "success": True,
            "message": "Cashier count saved successfully",
            "count_data": count.get_count_summary(),
            "created": created
        }, status=status.HTTP_200_OK)


class ReconciliationSessionView(APIView):
    """
    API View for Reconciliation Session management
    GET /api/v1/shop/reconciliation/session/ - Get reconciliation session data
    POST /api/v1/shop/reconciliation/session/ - Start/complete session
    """
    
    def get(self, request):
        """Get reconciliation session data"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        date = request.query_params.get('date')
        if date:
            try:
                from datetime import datetime
                date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        # Get or create session
        session, created = ReconciliationSession.get_or_create_session(shop, date)
        
        # Calculate session summary
        session.calculate_session_summary()
        
        return Response({
            "success": True,
            "session_data": session.get_session_summary(),
            "created": created
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Start or complete reconciliation session"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data
        action = data.get('action')
        
        if action not in ['start', 'complete']:
            return Response({"error": "Action must be 'start' or 'complete'"}, status=status.HTTP_400_BAD_REQUEST)
        
        date = data.get('date')
        if date:
            try:
                from datetime import datetime
                date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        # Get or create session
        session, created = ReconciliationSession.get_or_create_session(shop, date)
        
        if action == 'start':
            cashier_id = data.get('cashier_id')
            cashier = None
            if cashier_id:
                try:
                    # Try to find cashier by name first (for frontend compatibility)
                    try:
                        cashier = Cashier.objects.get(name=cashier_id, shop=shop)
                    except Cashier.DoesNotExist:
                        # Fallback to ID lookup if name lookup fails
                        cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                except (Cashier.DoesNotExist, ValueError):
                    return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            session.start_session(cashier)
            message = "Reconciliation session started"
            
        elif action == 'complete':
            cashier_id = data.get('cashier_id')
            cashier = None
            if cashier_id:
                try:
                    # Try to find cashier by name first (for frontend compatibility)
                    try:
                        cashier = Cashier.objects.get(name=cashier_id, shop=shop)
                    except Cashier.DoesNotExist:
                        # Fallback to ID lookup if name lookup fails
                        cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                except (Cashier.DoesNotExist, ValueError):
                    return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if all cashier counts are completed
            incomplete_counts = CashierCount.objects.filter(
                shop=shop,
                date=date,
                status__in=['IN_PROGRESS']
            ).exclude(cashier=cashier) if cashier else CashierCount.objects.filter(
                shop=shop,
                date=date,
                status__in=['IN_PROGRESS']
            )
            
            if incomplete_counts.exists() and action == 'complete':
                return Response({
                    "error": "Cannot complete session. There are incomplete cashier counts.",
                    "incomplete_cashiers": [count.cashier.name for count in incomplete_counts]
                }, status=status.HTTP_400_BAD_REQUEST)
            
            session.complete_session(cashier)
            message = "Reconciliation session completed"
        
        return Response({
            "success": True,
            "message": message,
            "session_data": session.get_session_summary()
        }, status=status.HTTP_200_OK)


class EODReconciliationEnhancedView(APIView):
    """
    Enhanced EOD Reconciliation View
    Integrates the new CashierCount system with existing reconciliation
    GET /api/v1/shop/reconciliation/enhanced/ - Get enhanced reconciliation data
    """
    
    def get(self, request):
        """Get enhanced reconciliation data using the new system"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        date = request.query_params.get('date')
        if date:
            try:
                from datetime import datetime
                date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            date = timezone.now().date()
        
        # Get reconciliation session
        session, _ = ReconciliationSession.get_or_create_session(shop, date)
        
        # Get cashier counts
        cashier_counts = CashierCount.objects.filter(shop=shop, date=date)
        
        # Get original reconciliation data for expected amounts
        from .sales_command_center_views import EODReconciliationView
        original_view = EODReconciliationView()
        original_response = original_view.get(request)
        
        if original_response.status_code == 200:
            original_data = original_response.data
        else:
            # Fallback to empty data if original fails
            original_data = {
                'date': date.isoformat(),
                'shifts': [],
                'overall_summary': {'total_transactions': 0, 'total_revenue': 0},
                'sales_summary': {
                    'total_sales': 0, 'total_transactions': 0,
                    'cash_sales': 0, 'card_sales': 0, 'ecocash_sales': 0,
                    'cash_refunds': 0, 'card_refunds': 0, 'ecocash_refunds': 0,
                    'net_cash_sales': 0, 'net_card_sales': 0, 'net_ecocash_sales': 0
                },
                'expected_cash': {'opening_float': 0, 'cash_sales': 0, 'cash_refunds': 0, 'expected_total': 0},
                'discrepancies': {'overage': 0, 'shortage': 0, 'variance': 0}
            }
        
        # Calculate actual totals from cashier counts
        total_actual_cash = sum(count.total_cash for count in cashier_counts)
        total_actual_card = sum(count.total_card for count in cashier_counts)
        total_actual_ecocash = sum(count.total_ecocash for count in cashier_counts)
        
        # Calculate expected totals from original data with multi-currency support
        # Get sales by currency from original data
        sales_summary = original_data.get('sales_summary', {})
        sales_by_currency = original_data.get('sales_by_currency', {})
        
        # Calculate expected amounts for each currency
        # ZIG expected cash (from original cash_sales)
        expected_cash_zig = float(sales_summary.get('cash_sales', 0))
        expected_card_zig = float(sales_summary.get('card_sales', 0))
        expected_ecocash_zig = float(sales_summary.get('ecocash_sales', 0))
        
        # USD expected amounts (from multi-currency sales)
        expected_cash_usd = float(sales_by_currency.get('usd', {}).get('cash_sales', 0))
        expected_card_usd = float(sales_by_currency.get('usd', {}).get('card_sales', 0))
        expected_ecocash_usd = float(sales_by_currency.get('usd', {}).get('ecocash_sales', 0))
        
        # RAND expected amounts
        expected_cash_rand = float(sales_by_currency.get('rand', {}).get('cash_sales', 0))
        expected_card_rand = float(sales_by_currency.get('rand', {}).get('card_sales', 0))
        expected_ecocash_rand = float(sales_by_currency.get('rand', {}).get('ecocash_sales', 0))
        
        # Total expected cash across all currencies (for the variance calculation)
        # This is the CRITICAL FIX: sum all currency expected cash
        expected_cash_total = expected_cash_usd + expected_cash_zig + expected_cash_rand
        expected_card_total = expected_card_usd + expected_card_zig + expected_card_rand
        expected_ecocash_total = expected_ecocash_usd + expected_ecocash_zig + expected_ecocash_rand
        
        # Legacy expected amounts (using totals across all currencies)
        expected_cash = expected_cash_total
        expected_card = expected_card_total
        expected_ecocash = expected_ecocash_total
        
        # Calculate variances per currency
        cash_variance = total_actual_cash - Decimal(str(expected_cash))
        card_variance = total_actual_card - Decimal(str(expected_card))
        ecocash_variance = total_actual_ecocash - Decimal(str(expected_ecocash))
        
        # Total variance (all currencies combined)
        total_variance = (total_actual_cash + total_actual_card + total_actual_ecocash) - Decimal(str(expected_cash + expected_card + expected_ecocash))
        
        # Enhanced reconciliation data
        enhanced_data = {
            'date': date.isoformat(),
            'session_status': session.get_session_summary(),
            'original_reconciliation': original_data,
            'actual_counts': {
                'cash': float(total_actual_cash),
                'card': float(total_actual_card),
                'ecocash': float(total_actual_ecocash),
                'total': float(total_actual_cash + total_actual_card + total_actual_ecocash)
            },
            'expected_amounts': {
                'cash': expected_cash,
                'card': expected_card,
                'ecocash': expected_ecocash,
                'total': expected_cash + expected_card + expected_ecocash,
                # Multi-currency breakdown
                'by_currency': {
                    'usd': {
                        'expected_cash': expected_cash_usd,
                        'expected_card': expected_card_usd,
                        'expected_ecocash': expected_ecocash_usd,
                        'expected_total': expected_cash_usd + expected_card_usd + expected_ecocash_usd
                    },
                    'zig': {
                        'expected_cash': expected_cash_zig,
                        'expected_card': expected_card_zig,
                        'expected_ecocash': expected_ecocash_zig,
                        'expected_total': expected_cash_zig + expected_card_zig + expected_ecocash_zig
                    },
                    'rand': {
                        'expected_cash': expected_cash_rand,
                        'expected_card': expected_card_rand,
                        'expected_ecocash': expected_ecocash_rand,
                        'expected_total': expected_cash_rand + expected_card_rand + expected_ecocash_rand
                    }
                }
            },
            'variances': {
                'cash': float(cash_variance),
                'card': float(card_variance),
                'ecocash': float(ecocash_variance),
                'total': float(total_variance)
            },
            'cashier_details': [count.get_count_summary() for count in cashier_counts],
            'cashier_progress': {
                'total_cashiers': cashier_counts.count(),
                'completed_counts': cashier_counts.filter(status='COMPLETED').count(),
                'pending_counts': cashier_counts.filter(status='IN_PROGRESS').count(),
                'all_completed': cashier_counts.filter(status='COMPLETED').count() == cashier_counts.count() if cashier_counts.exists() else True
            }
        }
        
        return Response(enhanced_data, status=status.HTTP_200_OK)