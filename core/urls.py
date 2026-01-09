from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from django.http import JsonResponse
from . import views
from .retrieve_credentials_view import RetrieveCredentialsView
from .staff_views import PendingStaffListView, ApprovedStaffListView, ApproveStaffView, RejectStaffView, DeactivateCashierView, DeleteCashierView, InactiveStaffListView, ReactivateCashierView, CashierDetailsView, EditCashierView
from .cashier_registration_view import CashierSelfRegistrationView
from .waste_batch_views import WasteBatchListView, WasteBatchDetailView
from .sales_command_center_views import InfiniteSalesFeedView, SaleAuditTrailView, SalesAnalyticsView, SalesExceptionReportView, EODReconciliationView, ShopDayManagementView
from .cash_float_refund_view import add_drawer_refund
from .reconciliation_views import CashierCountView, ReconciliationSessionView, EODReconciliationEnhancedView
from .cashier_refund_view import process_cashier_refund, get_cashier_refunds
# Import cash float API views
from .models import cash_float_management, activate_cashier_drawer, update_drawer_sale, settle_drawer_at_eod, get_all_cashiers_drawer_status, reset_all_drawers_at_eod, emergency_reset_all_drawers, check_cashier_drawer_access, update_cashier_drawer_access, get_shop_status, get_cashier_drawer_today, get_cashier_drawer_session, get_all_drawers_session
# Import exchange rate views
from .exchange_rate_views import exchange_rate_api, exchange_rate_history_api, convert_currency_api, set_current_rates_api



# Setup router for ViewSets
router = DefaultRouter()
router.register(r'stock-transfers', views.StockTransferViewSet, basename='stocktransfer')
router.register(r'product-splits', views.ProductSplittingViewSet, basename='productsplit')

urlpatterns = [
    # Health check endpoint for sync system - MUST BE FIRST
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
    
    # Include router URLs
    path('', include(router.urls)),
    
    # Waste management endpoints
    path('wastes/', views.WasteListView.as_view(), name='waste-list'),
    path('wastes/summary/', views.WasteSummaryView.as_view(), name='waste-summary'),
    path('wastes/product-search/', views.WasteProductSearchView.as_view(), name='waste-search'),
    
    # Waste batch management endpoints
    path('waste-batches/', WasteBatchListView.as_view(), name='waste-batch-list'),
    path('waste-batches/<int:batch_id>/', WasteBatchDetailView.as_view(), name='waste-batch-detail'),
    
    path('status/', views.ShopStatusView.as_view(), name='shop-status'),
    path('register/', views.ShopRegisterView.as_view(), name='shop-register'),
    path('update/', views.ShopUpdateView.as_view(), name='shop-update'),
    path('dashboard/', views.OwnerDashboardView.as_view(), name='owner-dashboard'),
    path('login/', views.ShopLoginView.as_view(), name='shop-login'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('retrieve-credentials/', RetrieveCredentialsView.as_view(), name='retrieve-credentials'),
    path('cashiers/', views.CashierListView.as_view(), name='cashier-list'),
    path('cashiers/<int:cashier_id>/', views.CashierDetailView.as_view(), name='cashier-detail'),
    path('cashiers/login/', views.CashierLoginView.as_view(), name='cashier-login'),
    path('cashiers/logout/', views.CashierLogoutView.as_view(), name='cashier-logout'),
    path('cashiers/register/', CashierSelfRegistrationView.as_view(), name='cashier-self-registration'),
    path('cashiers/reset-password/', views.CashierResetPasswordView.as_view(), name='cashier-reset-password'),
    path('cashiers/top-products/', views.CashierTopProductsView.as_view(), name='cashier-top-products'),
    
    # Staff Management endpoints
    path('staff/pending/', PendingStaffListView.as_view(), name='pending-staff-list'),
    path('staff/approved/', ApprovedStaffListView.as_view(), name='approved-staff-list'),
    path('staff/approve/', ApproveStaffView.as_view(), name='approve-staff'),
    path('staff/reject/', RejectStaffView.as_view(), name='reject-staff'),
    path('staff/deactivate/', DeactivateCashierView.as_view(), name='deactivate-cashier'),
    path('staff/delete/', DeleteCashierView.as_view(), name='delete-cashier'),
    path('staff/inactive/', InactiveStaffListView.as_view(), name='inactive-staff-list'),
    path('staff/reactivate/', ReactivateCashierView.as_view(), name='reactivate-cashier'),
    path('staff/details/', CashierDetailsView.as_view(), name='cashier-details'),
    path('staff/edit/', EditCashierView.as_view(), name='edit-cashier'),
    path('products/', views.ProductListView.as_view(), name='product-list'),
    path('products/<int:product_id>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('products/bulk/', views.BulkProductView.as_view(), name='bulk-product'),
    path('products/barcode-lookup/', views.BarcodeLookupView.as_view(), name='barcode-lookup'),
    path('audit-trail/', views.InventoryAuditTrailView.as_view(), name='inventory-audit-trail'),
    path('products/<int:product_id>/audit-history/', views.ProductAuditHistoryView.as_view(), name='product-audit-history'),
    path('sales/', views.SaleListView.as_view(), name='sale-list'),
    path('sales-history/', views.SalesHistoryView.as_view(), name='sales-history'),
    path('sales/<int:sale_id>/', views.SaleDetailView.as_view(), name='sale-detail'),
    path('sale-items/<int:item_id>/', views.SaleItemDetailView.as_view(), name='sale-item-detail'),
    
    # Sales Command Center endpoints
    path('sales/', InfiniteSalesFeedView.as_view(), name='infinite-sales-feed'),
    path('sales/<int:sale_id>/audit/', SaleAuditTrailView.as_view(), name='sale-audit-trail'),
    path('analytics/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    path('sales/exceptions/', SalesExceptionReportView.as_view(), name='sales-exceptions'),
    path('reconciliation/', EODReconciliationView.as_view(), name='eod-reconciliation'),
    
    # Enhanced Reconciliation endpoints
    path('reconciliation/enhanced/', EODReconciliationEnhancedView.as_view(), name='eod-reconciliation-enhanced'),
    path('reconciliation/count/', CashierCountView.as_view(), name='cashier-count'),
    path('reconciliation/session/', ReconciliationSessionView.as_view(), name='reconciliation-session'),
    
    # Exchange Rate Management endpoints
    path('exchange-rates/', exchange_rate_api, name='exchange-rate-management'),
    path('exchange-rates/history/', exchange_rate_history_api, name='exchange-rate-history'),
    path('exchange-rates/convert/', convert_currency_api, name='convert-currency'),
    path('exchange-rates/set-current/', set_current_rates_api, name='set-current-rates'),
    
    # Shop Day Management endpoints
    path('shop-status/', ShopDayManagementView.as_view(), name='shop-status-management'),
    path('start-day/', ShopDayManagementView.as_view(), name='start-day'),
    path('end-day/', ShopDayManagementView.as_view(), name='end-day'),
    
    # Cash Float Management endpoints
    path('cash-float/', cash_float_management, name='cash-float-management'),
    path('cash-float/activate/', activate_cashier_drawer, name='activate-cashier-drawer'),
    path('cash-float/sale/', update_drawer_sale, name='update-drawer-sale'),
    path('cash-float/refund/', add_drawer_refund, name='add-drawer-refund'),
    path('cash-float/settle/', settle_drawer_at_eod, name='settle-drawer-eod'),
    path('cash-float/reset-all/', reset_all_drawers_at_eod, name='reset-all-drawers-eod'),
    path('cash-float/emergency-reset/', emergency_reset_all_drawers, name='emergency-reset-drawers'),
    path('cash-float/all-status/', get_all_cashiers_drawer_status, name='all-cashiers-drawer-status'),
    path('cash-float/drawer-access/check/', check_cashier_drawer_access, name='check-drawer-access'),
    path('cash-float/drawer-access/update/', update_cashier_drawer_access, name='update-drawer-access'),
    
    # Shop Status endpoint (anonymous - no auth required)
    path('shop-status-anonymous/', get_shop_status, name='shop-status-anonymous'),
    
    # Simple Cashier Refund endpoints
    path('cashier/refund/', process_cashier_refund, name='process-cashier-refund'),
    path('cashier/refunds/', get_cashier_refunds, name='get-cashier-refunds'),
    path('customers/', views.CustomerListView.as_view(), name='customer-list'),
    path('discounts/', views.DiscountListView.as_view(), name='discount-list'),
    path('shifts/', views.ShiftListView.as_view(), name='shift-list'),
    path('shifts/<int:shift_id>/end/', views.ShiftDetailView.as_view(), name='shift-detail'),
    path('stock-valuation/', views.StockValuationView.as_view(), name='stock-valuation'),
    path('expenses/', views.ExpenseListView.as_view(), name='expense-list'),
    path('staff-lunch/', views.StaffLunchListView.as_view(), name='staff-lunch-list'),
    path('stock-takes/', views.StockTakeListView.as_view(), name='stock-take-list'),
    path('stock-takes/<int:stock_take_id>/', views.StockTakeDetailView.as_view(), name='stock-take-detail'),
    path('stock-takes/<int:stock_take_id>/items/', views.StockTakeItemListView.as_view(), name='stock-take-item-list'),
    path('stock-takes/<int:stock_take_id>/items/bulk/', views.BulkAddStockTakeItemsView.as_view(), name='bulk-add-stock-take-items'),
    path('stock-takes/<int:stock_take_id>/search/', views.StockTakeProductSearchView.as_view(), name='stock-take-product-search'),
    
    # Founder super admin routes
    path('founder/login/', views.FounderLoginView.as_view(), name='founder-login'),
    path('founder/shops/', views.FounderShopListView.as_view(), name='founder-shop-list'),
    path('founder/shops/dashboard/', views.FounderShopDashboardView.as_view(), name='founder-shop-dashboard'),
    path('founder/shops/reset-password/', views.FounderResetShopPasswordView.as_view(), name='founder-reset-shop-password'),
    
    # Currency Wallet Management endpoints
    path('wallet/summary/', views.WalletSummaryView.as_view(), name='wallet-summary'),
    path('wallet/transactions/', views.WalletTransactionsView.as_view(), name='wallet-transactions'),
    path('wallet/adjustment/', views.WalletAdjustmentView.as_view(), name='wallet-adjustment'),
    
    # Drawer Access Control endpoints
    path('drawer-access/grant/', views.GrantDrawerAccessView.as_view(), name='grant-drawer-access'),
    path('drawer-access/revoke/', views.RevokeDrawerAccessView.as_view(), name='revoke-drawer-access'),
    path('drawer-access/status/', views.DrawerAccessStatusView.as_view(), name='drawer-access-status'),
    
    # NEW: Today's drawer endpoint - fetches ONLY today's sales for drawer display
    path('cash-float/drawer-today/', get_cashier_drawer_today, name='cashier-drawer-today'),
    
    # NEW: Session drawer endpoint - fetches ONLY current session sales (shop open/close aware)
    path('cash-float/drawer-session/', get_cashier_drawer_session, name='cashier-drawer-session'),
    
    # NEW: All drawers session endpoint - fetches session-aware data for ALL cashiers (shop open/close aware)
    path('cash-float/all-drawers-session/', get_all_drawers_session, name='all-drawers-session'),
    
    # DELETE TODAY'S SALES - Owner only endpoint to start fresh
    path('delete-today-sales/', views.DeleteTodaySalesView.as_view(), name='delete-today-sales'),
]
