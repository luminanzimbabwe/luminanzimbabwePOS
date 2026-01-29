"""
Cashier History API Views
Provides endpoints for viewing cashier count history and performance
Reads from PERMANENT archive (CashierCountArchive) that survives EOD deletion
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import models
from decimal import Decimal
import logging

from .models_cashier_archive import CashierCountArchive, CashierPerformanceSummary
from .models import ShopConfiguration, Cashier

logger = logging.getLogger(__name__)


class CashierHistoryView(APIView):
    """
    API View for Cashier History
    GET /api/v1/shop/cashiers/history/ - Get all cashiers with their count history
    
    Query Parameters:
    - cashier_id: Filter by specific cashier
    - date_from: Start date (YYYY-MM-DD)
    - date_to: End date (YYYY-MM-DD)
    - status: Filter by count status (BALANCED, SHORTAGE, OVER)
    
    NOTE: This reads from PERMANENT archive that survives EOD deletion
    """
    
    def get(self, request):
        """Get cashier history with filtering options"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get query parameters
        cashier_id = request.query_params.get('cashier_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        status_filter = request.query_params.get('status')  # BALANCED, SHORTAGE, OVER
        
        # Build date filter
        date_filter = {}
        if date_from:
            try:
                from datetime import datetime
                date_filter['date__gte'] = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date_from format. Use YYYY-MM-DD"}, 
                              status=status.HTTP_400_BAD_REQUEST)
        if date_to:
            try:
                from datetime import datetime
                date_filter['date__lte'] = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date_to format. Use YYYY-MM-DD"}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        # Get cashiers
        cashiers = Cashier.objects.filter(shop=shop, status='active')
        if cashier_id:
            try:
                # Try to find by name first, then by ID
                try:
                    cashiers = Cashier.objects.filter(shop=shop, name=cashier_id)
                except:
                    cashiers = Cashier.objects.filter(shop=shop, id=cashier_id)
            except:
                return Response({"error": "Cashier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Prepare response data
        cashier_data = []
        
        for cashier in cashiers:
            # Get archived counts for this cashier (PERMANENT RECORDS)
            archive_filter = {'shop': shop, 'cashier': cashier}
            archive_filter.update(date_filter)
            
            if status_filter:
                archive_filter['status'] = status_filter
            
            archives = CashierCountArchive.objects.filter(**archive_filter).order_by('-date')
            
            # Build count history from archives
            count_history = []
            total_counts = 0
            balanced_count = 0
            shortage_count = 0
            over_count = 0
            
            for archive in archives:
                total_counts += 1
                
                if archive.status == 'BALANCED':
                    balanced_count += 1
                elif archive.status == 'SHORTAGE':
                    shortage_count += 1
                elif archive.status == 'OVER':
                    over_count += 1
                
                count_history.append({
                    'date': archive.date.isoformat(),
                    'status': archive.status,
                    'archived_at': archive.archived_at.isoformat() if archive.archived_at else None,
                    'total_cash': float(archive.total_cash),
                    'expected_cash': float(archive.expected_cash),
                    'cash_variance': float(archive.cash_variance),
                    'total_variance': float(archive.total_variance),
                    'denominations': archive.denominations_snapshot,
                    'notes': archive.notes
                })
            
            # Calculate statistics
            stats = {
                'total_counts': total_counts,
                'balanced': balanced_count,
                'shortages': shortage_count,
                'overs': over_count,
                'balance_rate': (balanced_count / total_counts * 100) if total_counts > 0 else 0,
                'reliability_score': self._calculate_reliability(total_counts, balanced_count, shortage_count)
            }
            
            cashier_data.append({
                'cashier_id': cashier.id,
                'cashier_name': cashier.name,
                'cashier_code': getattr(cashier, 'code', None),
                'joined_date': cashier.created_at.isoformat() if hasattr(cashier, 'created_at') else None,
                'statistics': stats,
                'count_history': count_history[:50]  # Limit to last 50 records
            })
        
        # Sort by reliability (best cashiers first)
        cashier_data.sort(key=lambda x: x['statistics']['reliability_score'], reverse=True)
        
        # Calculate summary
        total_counts_all = sum(c['statistics']['total_counts'] for c in cashier_data)
        total_balanced = sum(c['statistics']['balanced'] for c in cashier_data)
        total_shortages = sum(c['statistics']['shortages'] for c in cashier_data)
        total_overs = sum(c['statistics']['overs'] for c in cashier_data)
        
        return Response({
            "success": True,
            "data_source": "PERMANENT_ARCHIVE",
            "note": "This data is archived and survives EOD deletion",
            "filters_applied": {
                "date_from": date_from,
                "date_to": date_to,
                "status": status_filter
            },
            "summary": {
                "total_cashiers": len(cashier_data),
                "total_counts_all": total_counts_all,
                "total_balanced": total_balanced,
                "total_shortages": total_shortages,
                "total_overs": total_overs
            },
            "cashiers": cashier_data
        }, status=status.HTTP_200_OK)
    
    def _calculate_reliability(self, total, balanced, shortages):
        """Calculate a reliability score (0-100) for a cashier"""
        if total == 0:
            return 100  # New cashier = perfect score
        
        # Balanced = 100 points
        # Over = 80 points (better than shortage)
        # Shortage = 0 points (worst)
        over = total - balanced - shortages
        
        score = (balanced * 100 + over * 80) / total
        return round(score, 1)


class CashierPerformanceView(APIView):
    """
    API View for detailed cashier performance metrics
    GET /api/v1/shop/cashiers/performance/ - Get performance metrics
    
    NOTE: This reads from PERMANENT archive
    """
    
    def get(self, request):
        """Get cashier performance summary"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get date range (default to last 30 days)
        from datetime import datetime, timedelta
        days = int(request.query_params.get('days', 30))
        date_from = timezone.now().date() - timedelta(days=days)
        
        cashiers = Cashier.objects.filter(shop=shop, status='active')
        
        performance_data = []
        
        for cashier in cashiers:
            # Get archived counts for this period
            archives = CashierCountArchive.objects.filter(
                shop=shop,
                cashier=cashier,
                date__gte=date_from
            )
            
            if not archives.exists():
                continue
            
            total_variance = sum(float(a.total_variance) for a in archives)
            avg_variance = total_variance / archives.count() if archives.count() > 0 else 0
            
            # Count by status
            balanced = archives.filter(status='BALANCED').count()
            shortages = archives.filter(status='SHORTAGE').count()
            overs = archives.filter(status='OVER').count()
            
            performance_data.append({
                'cashier_name': cashier.name,
                'period_days': days,
                'total_counts': archives.count(),
                'balanced': balanced,
                'shortages': shortages,
                'overs': overs,
                'balance_rate': round(balanced / archives.count() * 100, 1) if archives.count() > 0 else 0,
                'average_variance': round(avg_variance, 2),
                'total_variance': round(total_variance, 2),
                'trend': 'IMPROVING' if avg_variance > -0.5 else 'DECLINING' if avg_variance < -2 else 'STABLE'
            })
        
        # Sort by balance rate (best first)
        performance_data.sort(key=lambda x: x['balance_rate'], reverse=True)
        
        return Response({
            "success": True,
            "data_source": "PERMANENT_ARCHIVE",
            "period_days": days,
            "performance_summary": performance_data
        }, status=status.HTTP_200_OK)


class CashierArchiveStatsView(APIView):
    """
    API View for archive statistics
    GET /api/v1/shop/cashiers/archive-stats/ - Get archive statistics
    """
    
    def get(self, request):
        """Get archive statistics"""
        try:
            shop = ShopConfiguration.objects.get()
        except ShopConfiguration.DoesNotExist:
            return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        total_archived = CashierCountArchive.objects.filter(shop=shop).count()
        
        # Get date range
        dates = CashierCountArchive.objects.filter(shop=shop).aggregate(
            oldest=models.Min('date'),
            newest=models.Max('date')
        )
        
        # Status breakdown
        balanced = CashierCountArchive.objects.filter(shop=shop, status='BALANCED').count()
        shortages = CashierCountArchive.objects.filter(shop=shop, status='SHORTAGE').count()
        overs = CashierCountArchive.objects.filter(shop=shop, status='OVER').count()
        
        return Response({
            "success": True,
            "archive_stats": {
                "total_archived_records": total_archived,
                "oldest_record": dates['oldest'].isoformat() if dates['oldest'] else None,
                "newest_record": dates['newest'].isoformat() if dates['newest'] else None,
                "status_breakdown": {
                    "balanced": balanced,
                    "shortages": shortages,
                    "overs": overs
                }
            }
        }, status=status.HTTP_200_OK)
