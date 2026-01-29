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
            
            # CRITICAL FIX: Do NOT call update_from_cash_float on GET requests
            # This was causing staff lunch to be subtracted twice!
            # The expected amounts are already calculated and stored when the cashier POSTs their count.
            # On GET, we simply return the stored values.
            #
            # Only calculate fresh expected amounts during POST when cashier is submitting their count.
            if created:
                # If this is a new count record, initialize expected amounts from CashFloat
                try:
                    cash_float = CashFloat.get_active_drawer(shop, cashier)
                    if cash_float:
                        count.update_from_cash_float(cash_float)
                        count.save()
                        logger.info(f"Initialized new count from CashFloat for {cashier.name}")
                except Exception as e:
                    # Non-fatal if CashFloat doesn't exist
                    logger.debug(f"Could not initialize from CashFloat: {str(e)}")
            else:
                logger.info(f"Returning stored count for {cashier.name}: expected_cash_usd={count.expected_cash_usd}")
            
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
            
            # Update USD denomination counts (bills)
            count.usd_100 = int(data.get('usd_100', 0))
            count.usd_50 = int(data.get('usd_50', 0))
            count.usd_20 = int(data.get('usd_20', 0))
            count.usd_10 = int(data.get('usd_10', 0))
            count.usd_5 = int(data.get('usd_5', 0))
            count.usd_2 = int(data.get('usd_2', 0))
            count.usd_1 = int(data.get('usd_1', 0))
            # Update USD coin counts
            count.usd_1_coin = int(data.get('usd_1_coin', 0))
            count.usd_0_50 = int(data.get('usd_0_50', 0))
            count.usd_0_25 = int(data.get('usd_0_25', 0))
            count.usd_0_10 = int(data.get('usd_0_10', 0))
            count.usd_0_05 = int(data.get('usd_0_05', 0))
            count.usd_0_01 = int(data.get('usd_0_01', 0))
            
            # Update ZIG denomination counts (notes)
            count.zig_100 = int(data.get('zig_100', 0))
            count.zig_50 = int(data.get('zig_50', 0))
            count.zig_20 = int(data.get('zig_20', 0))
            count.zig_10 = int(data.get('zig_10', 0))
            count.zig_5 = int(data.get('zig_5', 0))
            count.zig_2 = int(data.get('zig_2', 0))
            count.zig_1 = int(data.get('zig_1', 0))
            # Update ZIG coin counts
            count.zig_0_50 = int(data.get('zig_0_50', 0))
            
            # Update RAND denomination counts (notes)
            count.rand_200 = int(data.get('rand_200', 0))
            count.rand_100 = int(data.get('rand_100', 0))
            count.rand_50 = int(data.get('rand_50', 0))
            count.rand_20 = int(data.get('rand_20', 0))
            count.rand_10 = int(data.get('rand_10', 0))
            count.rand_5 = int(data.get('rand_5', 0))
            count.rand_2 = int(data.get('rand_2', 0))
            count.rand_1 = int(data.get('rand_1', 0))
            # Update RAND coin counts
            count.rand_0_50 = int(data.get('rand_0_50', 0))
            count.rand_0_20 = int(data.get('rand_0_20', 0))
            count.rand_0_10 = int(data.get('rand_0_10', 0))
            count.rand_0_05 = int(data.get('rand_0_05', 0))
            
            # Update legacy denomination counts (for backward compatibility)
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
            
            # Update transfer and card amounts
            count.total_transfer = Decimal(str(data.get('total_transfer', 0)))
            count.total_card_amount = Decimal(str(data.get('total_card_amount', 0)))
            
            # CRITICAL FIX: Update expected amounts from ACTUAL SALES data BEFORE saving
            # This ensures expected amounts are always accurate based on real sales
            cash_float = None
            try:
                cash_float = CashFloat.get_active_drawer(shop, cashier)
                logger.info(f"Got cash float for {cashier.name}: float_amount={cash_float.float_amount}")
            except Exception as e:
                logger.error(f"Could not get cash float for {cashier.name}: {str(e)}")
            
            if cash_float:
                try:
                    # Store old values for comparison
                    old_expected_usd = count.expected_cash_usd
                    
                    count.update_from_cash_float(cash_float)
                    
                    # CRITICAL FIX: Validate expected amounts are never negative without reason
                    # If expected is negative but float is positive and there were sales, it's a bug
                    if count.expected_cash_usd < 0 and cash_float.float_amount >= 0:
                        logger.error(
                            f"BUG DETECTED: Negative expected_cash_usd for {cashier.name}: "
                            f"${count.expected_cash_usd}. Float=${cash_float.float_amount}. "
                            f"This indicates a calculation error. Attempting to fix..."
                        )
                        # CRITICAL FIX: If expected is negative but shouldn't be, reset to float
                        # This prevents the negative expected bug
                        if count.total_cash_usd > 0:
                            # There was cash counted, so expected should be at least the float
                            count.expected_cash_usd = cash_float.float_amount
                            logger.info(f"FIXED: Set expected_cash_usd to float amount ${cash_float.float_amount}")
                    
                    logger.info(f"Updated expected amounts from sales data for {cashier.name}: "
                               f"expected_cash_usd={count.expected_cash_usd} (was {old_expected_usd}), "
                               f"expected_cash_zig={count.expected_cash_zig}, "
                               f"expected_cash_rand={count.expected_cash_rand}")
                except Exception as e:
                    logger.error(f"ERROR in update_from_cash_float for {cashier.name}: {str(e)}")
                    import traceback
                    logger.error(traceback.format_exc())
                    # CRITICAL FIX: If calculation fails, set expected to float amount as fallback
                    # This is safer than leaving it as 0 or negative
                    count.expected_cash_usd = cash_float.float_amount
                    count.expected_cash_zig = cash_float.float_amount_zig
                    count.expected_cash_rand = cash_float.float_amount_rand
                    count.expected_cash = cash_float.float_amount
                    logger.warning(f"FALLBACK: Set expected amounts to float values for {cashier.name}")
            else:
                logger.warning(f"No cash float found for {cashier.name}, expected amounts may be incorrect")
            
            # Update total cash rand
            count.total_cash_rand = Decimal(str(data.get('total_cash_rand', 0)))
            
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
    
    def delete(self, request):
        """
        DELETE /api/v1/shop/reconciliation/count/ - Clear all cashier counts for a date
        This is called when finalizing EOD to start fresh for the next day
        """
        try:
            try:
                shop = ShopConfiguration.objects.get()
            except ShopConfiguration.DoesNotExist:
                logger.error("Shop configuration not found in DELETE request")
                return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
            date = request.query_params.get('date')
            if date:
                try:
                    from datetime import datetime
                    date = datetime.strptime(date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"Invalid date format in DELETE: {date}")
                    return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                date = timezone.now().date()
            
            # ARCHIVE counts to permanent storage BEFORE deleting
            from .models_cashier_archive import CashierCountArchive
            archived = CashierCountArchive.archive_all_counts_for_date(shop, date)
            logger.info(f"Archived {len(archived)} cashier counts for {date} before deletion")
            
            # Now delete the counts
            deleted_count, _ = CashierCount.objects.filter(shop=shop, date=date).delete()
            
            logger.info(f"Cleared {deleted_count} cashier counts for {date}")
            
            return Response({
                "success": True,
                "message": f"Cleared {deleted_count} cashier counts for {date}",
                "deleted_count": deleted_count,
                "archived_count": len(archived),
                "date": date.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception("Unexpected error in CashierCountView.delete")
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
    
    def delete(self, request):
        """
        DELETE /api/v1/shop/reconciliation/session/ - Reset reconciliation session for a date
        This is called when finalizing EOD to start fresh for the next day
        """
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
        
        try:
            # Get the session and reset it
            session = ReconciliationSession.objects.get(shop=shop, date=date)
            session.status = 'NOT_STARTED'
            session.started_at = None
            session.completed_at = None
            session.started_by = None
            session.completed_by = None
            session.total_expected_cash = 0
            session.total_expected_cash_usd = 0
            session.total_expected_cash_zig = 0
            session.total_expected_cash_rand = 0
            session.total_counted_cash = 0
            session.total_counted_cash_usd = 0
            session.total_counted_cash_zig = 0
            session.total_counted_cash_rand = 0
            session.total_variance = 0
            session.variance_usd = 0
            session.variance_zig = 0
            session.variance_rand = 0
            session.opening_notes = ''
            session.closing_notes = ''
            session.save()
            
            logger.info(f"Reset reconciliation session for {date}")
            
            return Response({
                "success": True,
                "message": f"Reconciliation session for {date} has been reset",
                "session_data": session.get_session_summary()
            }, status=status.HTTP_200_OK)
            
        except ReconciliationSession.DoesNotExist:
            return Response({
                "success": True,
                "message": f"No reconciliation session found for {date}"
            }, status=status.HTTP_200_OK)


class EODReconciliationEnhancedView(APIView):
    """
    Enhanced EOD Reconciliation View
    Integrates the new CashierCount system with existing reconciliation
    GET /api/v1/shop/reconciliation/enhanced/ - Get enhanced reconciliation data
    
    CRITICAL FIX: Now calculates expected amounts from ACTUAL SALES data (like drawer screen)
    instead of relying on potentially stale CashFloat fields.
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
        
        # CRITICAL FIX: Calculate expected amounts from ACTUAL SALES data
        # This matches the logic in get_all_drawers_session for consistency
        from .models import Sale, SalePayment, CashFloat, StaffLunch
        import datetime
        
        # Create proper timezone-aware datetime range for the local day
        day_start = timezone.make_aware(
            datetime.datetime.combine(date, datetime.time.min),
            timezone.get_current_timezone()
        )
        day_end = timezone.make_aware(
            datetime.datetime.combine(date, datetime.time.max),
            timezone.get_current_timezone()
        )
        
        # Get all active cashiers
        cashiers = Cashier.objects.filter(shop=shop, status='active')
        
        # Initialize aggregates for expected amounts (from sales)
        exp_usd = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0'), 'transfer': Decimal('0')}
        exp_zig = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0'), 'transfer': Decimal('0')}
        exp_rand = {'cash': Decimal('0'), 'card': Decimal('0'), 'ecocash': Decimal('0'), 'transfer': Decimal('0')}
        
        # Get exchange rates for change calculations
        try:
            from .models_exchange_rates import ExchangeRate
            rates = ExchangeRate.objects.filter(shop=shop, is_active=True).order_by('-created_at')[:5]
            exchange_rates = None
            if rates:
                exchange_rates = rates[0]
        except Exception:
            exchange_rates = None
        
        # Calculate sales for each cashier
        for cashier in cashiers:
            today_sales = Sale.objects.filter(
                shop=shop,
                cashier=cashier,
                created_at__range=[day_start, day_end],
                status='completed'
            )
            
            for sale in today_sales:
                # Handle split payments
                if sale.payment_method == 'split':
                    sale_payments = SalePayment.objects.filter(sale=sale)
                    for payment in sale_payments:
                        currency = payment.currency.upper()
                        method = payment.payment_method
                        amount = Decimal(str(payment.amount))
                        
                        # Add to appropriate currency/method
                        if currency == 'USD':
                            if method == 'cash':
                                exp_usd['cash'] += amount
                            elif method == 'card':
                                exp_usd['card'] += amount
                            elif method == 'ecocash':
                                exp_usd['ecocash'] += amount
                            elif method == 'transfer':
                                exp_usd['transfer'] += amount
                        elif currency == 'ZIG':
                            if method == 'cash':
                                exp_zig['cash'] += amount
                            elif method == 'card':
                                exp_zig['card'] += amount
                            elif method == 'ecocash':
                                exp_zig['ecocash'] += amount
                            elif method == 'transfer':
                                exp_zig['transfer'] += amount
                        elif currency == 'RAND':
                            if method == 'cash':
                                exp_rand['cash'] += amount
                            elif method == 'card':
                                exp_rand['card'] += amount
                            elif method == 'ecocash':
                                exp_rand['ecocash'] += amount
                            elif method == 'transfer':
                                exp_rand['transfer'] += amount
                    
                    # Calculate change for split payments
                    total_paid_usd = Decimal('0')
                    for payment in sale_payments:
                        if payment.currency == 'USD':
                            total_paid_usd += Decimal(str(payment.amount))
                        elif exchange_rates:
                            try:
                                amount_usd = exchange_rates.convert_amount(payment.amount, payment.currency, 'USD')
                                total_paid_usd += Decimal(str(amount_usd))
                            except:
                                pass
                    
                    sale_total = Decimal(str(sale.total_amount))
                    if total_paid_usd > sale_total:
                        change_usd = total_paid_usd - sale_total
                        change_int_usd = int(change_usd)
                        change_frac_usd = change_usd - Decimal(change_int_usd)
                        
                        # Deduct integer USD change
                        if change_int_usd > 0:
                            exp_usd['cash'] -= Decimal(change_int_usd)
                        
                        # Deduct fractional USD change as ZIG
                        if change_frac_usd > 0 and exchange_rates:
                            try:
                                change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                exp_zig['cash'] -= Decimal(str(change_zig))
                            except:
                                exp_usd['cash'] -= change_frac_usd
                else:
                    # Handle regular single payments
                    sale_amount = Decimal(str(sale.total_amount))
                    currency = (sale.payment_currency or 'USD').upper()
                    method = sale.payment_method
                    
                    # Add to appropriate currency/method
                    if currency == 'USD':
                        if method == 'cash':
                            exp_usd['cash'] += sale_amount
                        elif method == 'card':
                            exp_usd['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_usd['ecocash'] += sale_amount
                        elif method == 'transfer':
                            exp_usd['transfer'] += sale_amount
                    elif currency == 'ZIG':
                        if method == 'cash':
                            exp_zig['cash'] += sale_amount
                        elif method == 'card':
                            exp_zig['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_zig['ecocash'] += sale_amount
                        elif method == 'transfer':
                            exp_zig['transfer'] += sale_amount
                    elif currency == 'RAND':
                        if method == 'cash':
                            exp_rand['cash'] += sale_amount
                        elif method == 'card':
                            exp_rand['card'] += sale_amount
                        elif method == 'ecocash':
                            exp_rand['ecocash'] += sale_amount
                        elif method == 'transfer':
                            exp_rand['transfer'] += sale_amount
                    
                    # Handle change for cash payments
                    if method == 'cash' and sale.amount_received:
                        amount_received = Decimal(str(sale.amount_received))
                        if amount_received > sale_amount:
                            change_amount = amount_received - sale_amount
                            
                            if currency == 'USD':
                                change_int_usd = int(change_amount)
                                change_frac_usd = change_amount - Decimal(change_int_usd)
                                
                                if change_int_usd > 0:
                                    exp_usd['cash'] -= Decimal(change_int_usd)
                                
                                if change_frac_usd > 0 and exchange_rates:
                                    try:
                                        change_zig = exchange_rates.convert_amount(change_frac_usd, 'USD', 'ZIG')
                                        exp_zig['cash'] -= Decimal(str(change_zig))
                                    except:
                                        exp_usd['cash'] -= change_frac_usd
                            elif currency == 'ZIG':
                                exp_zig['cash'] -= change_amount
                            elif currency == 'RAND':
                                exp_rand['cash'] -= change_amount
        # NOTE: Staff lunch is ALREADY subtracted in update_from_cash_float()
        # when the cashier POSTs their count. We do NOT subtract it again here
        # because we're using the stored expected_cash_usd from CashierCount.
        # The CashierCount.expected_cash_usd already includes: float + sales - change - staff_lunch
        
        
        # Get float amounts for each cashier
        total_float_usd = Decimal('0')
        total_float_zig = Decimal('0')
        total_float_rand = Decimal('0')

        for cashier in cashiers:
            try:
                drawer = CashFloat.get_active_drawer(shop, cashier)
                total_float_usd += drawer.float_amount
                total_float_zig += drawer.float_amount_zig
                total_float_rand += drawer.float_amount_rand
            except:
                pass

        # Calculate EXPECTED cash (float + sales - change - staff lunch)
        # LINKED BALANCE LOGIC: When change is given in ZiG for USD payments:
        # - USD drawer keeps the extra (change_frac stays in USD drawer)
        # - ZiG drawer shows negative (change given out in ZiG)
        expected_cash_usd = float(total_float_usd + exp_usd['cash'])
        expected_card_usd = float(exp_usd['card'])
        expected_ecocash_usd = float(exp_usd['ecocash'])
        expected_transfer_usd = float(exp_usd['transfer'])

        expected_cash_zig = float(total_float_zig + exp_zig['cash'])
        expected_card_zig = float(exp_zig['card'])
        expected_ecocash_zig = float(exp_zig['ecocash'])
        expected_transfer_zig = float(exp_zig['transfer'])

        expected_cash_rand = float(total_float_rand + exp_rand['cash'])
        expected_card_rand = float(exp_rand['card'])
        expected_ecocash_rand = float(exp_rand['ecocash'])
        expected_transfer_rand = float(exp_rand['transfer'])

        # Calculate ACTUAL counted cash per currency from CashierCount
        # ONLY include counts from cashiers who have actually completed their count
        # This prevents showing fake "zero" counts for cashiers who haven't counted yet
        def has_actual_count(count):
            """Check if cashier has actually entered any denominations"""
            return (
                count.usd_100 > 0 or count.usd_50 > 0 or count.usd_20 > 0 or
                count.usd_10 > 0 or count.usd_5 > 0 or count.usd_2 > 0 or
                count.usd_1 > 0 or count.usd_1_coin > 0 or count.usd_0_50 > 0 or
                count.usd_0_25 > 0 or count.usd_0_10 > 0 or count.usd_0_05 > 0 or
                count.usd_0_01 > 0 or count.zig_100 > 0 or count.zig_50 > 0 or
                count.zig_20 > 0 or count.zig_10 > 0 or count.zig_5 > 0 or
                count.zig_2 > 0 or count.zig_1 > 0 or count.zig_0_50 > 0 or
                count.rand_200 > 0 or count.rand_100 > 0 or count.rand_50 > 0 or
                count.rand_20 > 0 or count.rand_10 > 0 or count.rand_5 > 0 or
                count.rand_2 > 0 or count.rand_1 > 0 or count.rand_0_50 > 0 or
                count.rand_0_20 > 0 or count.rand_0_10 > 0 or count.rand_0_05 > 0
            )

        # CRITICAL FIX: Only count cashiers who have EXPLICITLY COMPLETED their count
        # Having denominations entered is NOT enough - they must submit
        actual_counts = [c for c in cashier_counts if c.status == 'COMPLETED']

        # Calculate actual totals from cashier counts (ONLY completed counts)
        total_actual_cash = sum(count.total_cash for count in actual_counts) if actual_counts else 0
        total_actual_card = sum(count.total_card for count in actual_counts) if actual_counts else 0
        total_actual_ecocash = sum(count.total_ecocash for count in actual_counts) if actual_counts else 0

        total_actual_cash_usd = sum(count.total_cash_usd for count in actual_counts)
        total_actual_cash_zig = sum(count.total_cash_zig for count in actual_counts)
        total_actual_cash_rand = sum(count.total_cash_rand for count in actual_counts)

        # Calculate per-currency variances (LINKED BALANCE)
        cash_variance_usd = float(total_actual_cash_usd) - expected_cash_usd
        cash_variance_zig = float(total_actual_cash_zig) - expected_cash_zig
        cash_variance_rand = float(total_actual_cash_rand) - expected_cash_rand

        # Calculate variances (actual counted - expected)
        # Note: For EOD, we compare cashier's count vs what sales say should be there
        cash_variance = float(total_actual_cash) - expected_cash_usd
        card_variance = float(total_actual_card) - expected_card_usd
        ecocash_variance = float(total_actual_ecocash) - expected_ecocash_usd

        total_variance = cash_variance + card_variance + ecocash_variance
        
        # Enhanced reconciliation data
        enhanced_data = {
            'date': date.isoformat(),
            'session_status': session.get_session_summary(),
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
                        'expected_transfer': expected_transfer_usd,
                        'expected_total': expected_cash_usd + expected_card_usd + expected_ecocash_usd + expected_transfer_usd
                    },
                    'zig': {
                        'expected_cash': expected_cash_zig,
                        'expected_card': expected_card_zig,
                        'expected_ecocash': expected_ecocash_zig,
                        'expected_transfer': expected_transfer_zig,
                        'expected_total': expected_cash_zig + expected_card_zig + expected_ecocash_zig + expected_transfer_zig
                    },
                    'rand': {
                        'expected_cash': expected_cash_rand,
                        'expected_card': expected_card_rand,
                        'expected_ecocash': expected_ecocash_rand,
                        'expected_transfer': expected_transfer_rand,
                        'expected_total': expected_cash_rand + expected_card_rand + expected_ecocash_rand + expected_transfer_rand
                    }
                }
            },
            'variances': {
                'cash': cash_variance,
                'cash_usd': cash_variance_usd,
                'cash_zig': cash_variance_zig,
                'cash_rand': cash_variance_rand,
                'card': card_variance,
                'ecocash': ecocash_variance,
                'total': total_variance
            },
            'linked_balance_summary': {
                'description': 'USD and ZiG variances are linked - USD overage balances ZiG shortage',
                'actual_cash_usd': float(total_actual_cash_usd),
                'actual_cash_zig': float(total_actual_cash_zig),
                'actual_cash_rand': float(total_actual_cash_rand),
                'expected_cash_usd': expected_cash_usd,
                'expected_cash_zig': expected_cash_zig,
                'expected_cash_rand': expected_cash_rand,
                'variance_usd': cash_variance_usd,
                'variance_zig': cash_variance_zig,
                'variance_rand': cash_variance_rand,
                'is_balanced': abs(cash_variance_usd + cash_variance_zig) < 0.01  # Should balance out
            },
            'cashier_details': [count.get_count_summary() for count in cashier_counts],
            'uncounted_cashiers': [count.cashier.name for count in cashier_counts if count.status != 'COMPLETED'],
            'cashier_progress': {
                'total_cashiers': cashier_counts.count(),
                'completed_counts': cashier_counts.filter(status='COMPLETED').count(),
                'pending_counts': cashier_counts.filter(status='IN_PROGRESS').count(),
                'all_completed': cashier_counts.filter(status='COMPLETED').count() == cashier_counts.count() if cashier_counts.exists() else True
            }
        }
        
        return Response(enhanced_data, status=status.HTTP_200_OK)