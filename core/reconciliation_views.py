from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import models, DatabaseError
from decimal import Decimal
import logging

from .models_reconciliation import CashierCount, ReconciliationSession
from .models import ShopConfiguration, Cashier, CashFloat

logger = logging.getLogger(__name__)


class CashierCountView(APIView):
    """
    API View for Cashier Count management
    GET /api/v1/shop/reconciliation/count/ - Get cashier count data
    POST /api/v1/shop/reconciliation/count/ - Save/update cashier count
    """
    
    def get(self, request):
        """Get cashier count data for reconciliation"""
        try:
            try:
                shop = ShopConfiguration.objects.get()
            except ShopConfiguration.DoesNotExist:
                logger.error("Shop configuration not found in GET request")
                return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
            cashier_id = request.query_params.get('cashier_id')
            date = request.query_params.get('date')
            
            if not cashier_id:
                logger.warning("GET request missing cashier_id")
                return Response({"error": "cashier_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not date:
                date = timezone.now().date()
            else:
                try:
                    from datetime import datetime
                    date = datetime.strptime(date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"Invalid date format in GET: {date}")
                    return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Try to find cashier by name first (for frontend compatibility)
                try:
                    cashier = Cashier.objects.get(name=cashier_id, shop=shop)
                except Cashier.DoesNotExist:
                    # Fallback to ID lookup if name lookup fails
                    cashier = Cashier.objects.get(id=cashier_id, shop=shop)
            except (Cashier.DoesNotExist, ValueError) as e:
                logger.error(f"Cashier not found in GET: {cashier_id} - {str(e)}")
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Get or create count record
            try:
                count, created = CashierCount.get_or_create_count(shop, cashier, date)
            except DatabaseError as e:
                logger.error(f"Database error getting count: {str(e)}")
                return Response({"error": "Database error retrieving count"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update expected amounts from CashFloat if available
            try:
                cash_float = CashFloat.get_active_drawer(shop, cashier)
                if cash_float:
                    count.update_from_cash_float(cash_float)
                    logger.info(f"Updated count from CashFloat for {cashier.name}")
            except Exception as e:
                # Non-fatal if CashFloat doesn't exist
                logger.debug(f"Could not update from CashFloat: {str(e)}")
            
            return Response({
                "success": True,
                "count_data": count.get_count_summary(),
                "created": created
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception("Unexpected error in CashierCountView.get")
            return Response({
                "error": "An unexpected error occurred",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Save or update cashier count data"""
        try:
            try:
                shop = ShopConfiguration.objects.get()
            except ShopConfiguration.DoesNotExist:
                logger.error("Shop configuration not found")
                return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
            data = request.data
            
            # Validate required fields
            cashier_id = data.get('cashier_id')
            if not cashier_id:
                logger.warning("Cashier count request missing cashier_id")
                return Response({"error": "cashier_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Try to find cashier by name first (for frontend compatibility)
                try:
                    cashier = Cashier.objects.get(name=cashier_id, shop=shop)
                    logger.info(f"Found cashier by name: {cashier.name} (ID: {cashier.id})")
                except Cashier.DoesNotExist:
                    # Fallback to ID lookup if name lookup fails
                    cashier = Cashier.objects.get(id=cashier_id, shop=shop)
                    logger.info(f"Found cashier by ID: {cashier.name} (ID: {cashier.id})")
            except (Cashier.DoesNotExist, ValueError) as e:
                logger.error(f"Cashier not found: {cashier_id} - {str(e)}")
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Get or create count record
            date = data.get('date')
            if date:
                try:
                    from datetime import datetime
                    date = datetime.strptime(date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"Invalid date format: {date}")
                    return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                date = timezone.now().date()
            
            try:
                count, created = CashierCount.get_or_create_count(shop, cashier, date)
                logger.info(f"{'Created' if created else 'Retrieved'} count record for {cashier.name} on {date}")
            except DatabaseError as e:
                logger.error(f"Database error creating count: {str(e)}")
                return Response({"error": "Database error creating count record"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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
            logger.info(f"Saved count for {cashier.name}: Cash=${count.total_cash}, Variance=${count.total_variance}")
            
            # Update reconciliation session
            try:
                session, _ = ReconciliationSession.get_or_create_session(shop, date)
                session.calculate_session_summary()
                logger.info(f"Updated reconciliation session for {date}")
            except Exception as e:
                logger.error(f"Error updating reconciliation session: {str(e)}")
                # Don't fail the whole request if session update fails
            
            return Response({
                "success": True,
                "message": "Cashier count saved successfully",
                "count_data": count.get_count_summary(),
                "created": created
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception("Unexpected error in CashierCountView.post")
            return Response({
                "error": "An unexpected error occurred",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        
        # Get expected amounts directly from CashFloat (Financial Neural Grid logic)
        # This ensures EOD matches Drawer Management exactly
        from .models import CashFloat
        
        # Get cashier counts
        cashier_counts = CashierCount.objects.filter(shop=shop, date=date)
        
        # If checking today/current session, use active drawers regardless of date (handles midnight crossover)
        if date == timezone.now().date():
            drawers = CashFloat.objects.filter(shop=shop).exclude(status='SETTLED')
            if not drawers.exists():
                drawers = CashFloat.objects.filter(shop=shop, date=date)
        else:
            drawers = CashFloat.objects.filter(shop=shop, date=date)
        
        # Aggregate totals from CashFloat for override
        cf_sales_usd = sum(d.session_cash_sales_usd for d in drawers)
        cf_sales_zig = sum(d.session_cash_sales_zig for d in drawers)
        cf_sales_rand = sum(d.session_cash_sales_rand for d in drawers)
        
        # Initialize aggregates
        exp_usd = {'cash': Decimal(0), 'card': Decimal(0), 'ecocash': Decimal(0), 'transfer': Decimal(0)}
        exp_zig = {'cash': Decimal(0), 'card': Decimal(0), 'ecocash': Decimal(0), 'transfer': Decimal(0)}
        exp_rand = {'cash': Decimal(0), 'card': Decimal(0), 'ecocash': Decimal(0), 'transfer': Decimal(0)}
        
        for d in drawers:
            # USD
            exp_usd['cash'] += d.expected_cash_usd
            exp_usd['card'] += d.current_card_usd
            exp_usd['ecocash'] += d.current_ecocash_usd
            exp_usd['transfer'] += d.current_transfer_usd
            
            # ZIG
            exp_zig['cash'] += d.expected_cash_zig
            exp_zig['card'] += d.current_card_zig
            exp_zig['ecocash'] += d.current_ecocash_zig
            exp_zig['transfer'] += d.current_transfer_zig
            
            # RAND
            exp_rand['cash'] += d.expected_cash_rand
            exp_rand['card'] += d.current_card_rand
            exp_rand['ecocash'] += d.current_ecocash_rand
            exp_rand['transfer'] += d.current_transfer_rand
        
        # Calculate actual totals from cashier counts
        total_actual_cash = sum(count.total_cash for count in cashier_counts)
        total_actual_card = sum(count.total_card for count in cashier_counts)
        total_actual_ecocash = sum(count.total_ecocash for count in cashier_counts)
        
        # Update each cashier count with expected card/ecocash from CashFloat
        for count in cashier_counts:
            try:
                drawer = CashFloat.get_active_drawer(shop, count.cashier)
                if drawer:
                    # Update expected amounts from drawer
                    count.expected_card = drawer.session_card_sales
                    count.expected_ecocash = drawer.session_ecocash_sales
                    count.save()
            except Exception as e:
                logger.debug(f"Could not update card/ecocash for {count.cashier.name}: {str(e)}")
        
        # Set expected amounts from CashFloat aggregates
        expected_cash_usd = float(exp_usd['cash'])
        expected_card_usd = float(exp_usd['card'])
        expected_ecocash_usd = float(exp_usd['ecocash'])
        
        expected_cash_zig = float(exp_zig['cash'])
        expected_card_zig = float(exp_zig['card'])
        expected_ecocash_zig = float(exp_zig['ecocash'])
        
        expected_cash_rand = float(exp_rand['cash'])
        expected_card_rand = float(exp_rand['card'])
        expected_ecocash_rand = float(exp_rand['ecocash'])
        
        # Calculate variances
        # Note: Variance is calculated against USD expected as primary for now
        cash_variance = float(total_actual_cash) - expected_cash_usd
        card_variance = float(total_actual_card) - expected_card_usd
        ecocash_variance = float(total_actual_ecocash) - expected_ecocash_usd
        
        total_variance = cash_variance + card_variance + ecocash_variance
        
        # Enhanced reconciliation data
        enhanced_data = {
            'date': date.isoformat(),
            'session_status': session.get_session_summary(),
            'original_reconciliation': {}, # Deprecated
            'actual_counts': {
                'cash': float(total_actual_cash),
                'card': float(total_actual_card),
                'ecocash': float(total_actual_ecocash),
                'total': float(total_actual_cash + total_actual_card + total_actual_ecocash)
            },
            'expected_amounts': {
                'cash': expected_cash_usd,
                'card': expected_card_usd,
                'ecocash': expected_ecocash_usd,
                'total': expected_cash_usd + expected_card_usd + expected_ecocash_usd,
                # Multi-currency breakdown
                'by_currency': {
                    'usd': {
                        'expected_cash': expected_cash_usd,
                        'expected_card': expected_card_usd,
                        'expected_ecocash': expected_ecocash_usd,
                        'expected_transfer': float(exp_usd['transfer']),
                        'expected_total': expected_cash_usd + expected_card_usd + expected_ecocash_usd
                    },
                    'zig': {
                        'expected_cash': expected_cash_zig,
                        'expected_card': expected_card_zig,
                        'expected_ecocash': expected_ecocash_zig,
                        'expected_transfer': float(exp_zig['transfer']),
                        'expected_total': expected_cash_zig + expected_card_zig + expected_ecocash_zig
                    },
                    'rand': {
                        'expected_cash': expected_cash_rand,
                        'expected_card': expected_card_rand,
                        'expected_ecocash': expected_ecocash_rand,
                        'expected_transfer': float(exp_rand['transfer']),
                        'expected_total': expected_cash_rand + expected_card_rand + expected_ecocash_rand
                    }
                }
            },
            'variances': {
                'cash': cash_variance,
                'card': card_variance,
                'ecocash': ecocash_variance,
                'total': total_variance
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