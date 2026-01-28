import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '../constants/navigation';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import LicenseFirstLoginScreen from '../screens/LicenseFirstLoginScreen';
import LicenseRenewalScreen from '../components/LicenseRenewalScreen';
import LicenseManagementScreen from '../screens/LicenseManagementScreen';
import CashierDashboardScreen from '../screens/CashierDashboardScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CashierResetPasswordScreen from '../screens/CashierResetPasswordScreen';
import RegistrationDetailsScreen from '../screens/RegistrationDetailsScreen';
import SuccessScreen from '../screens/SuccessScreen';
import StaffContractScreen from '../screens/StaffContractScreen';
import CashierRegisterScreen from '../screens/CashierRegisterScreen';
import InventoryAuditTrailScreen from '../screens/InventoryAuditTrailScreen';
import InventoryReceivingScreen from '../screens/InventoryReceivingScreen';
import RestockManagerScreen from '../screens/RestockManagerScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import StockTakeScreen from '../screens/StockTakeScreen';
import StockTransferScreen from '../screens/StockTransferScreen';
import StockTransferHistoryScreen from '../screens/StockTransferHistoryScreen';
import ProductSplitScreen from '../screens/ProductSplitScreen';
import HalfProductsScreen from '../screens/HalfProductsScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StockValuationScreen from '../screens/StockValuationScreen';
import POSPriceScreen from '../screens/POSPriceScreen';
import SalesAndRefundsScreen from '../screens/SalesAndRefundsScreen';

import SalesDashboardScreen from '../screens/SalesDashboardScreen';
import SalesLedgerScreen from '../screens/SalesLedgerScreen';
import SalesAuditTrailScreen from '../screens/SalesAuditTrailScreen';
import WasteScreen from '../screens/WasteScreen';
import EODReconciliationScreen from '../screens/EODReconciliationScreen';
import StartOfDayScreen from '../screens/StartOfDayScreen';
import CashierSalesScreen from '../screens/CashierSalesScreen';
import CashierDrawerScreen from '../screens/CashierDrawerScreen';
import CashierProductsScreen from '../screens/CashierProductsScreen';
import CashierProductReceivingScreen from '../screens/CashierProductReceivingScreen';
import WeightProductsScreen from '../screens/WeightProductsScreen';
import QuickProductsScreen from '../screens/QuickProductsScreen';
import CashierStockTakeScreen from '../screens/Cashier/StockTakeScreen';
import LowStockAlertsScreen from '../screens/LowStockAlertsScreen';
import ProfitAnalysisScreen from '../screens/ProfitAnalysisScreen';
import SupplierManagementScreen from '../screens/SupplierManagementScreen';
import StockMovementScreen from '../screens/StockMovementScreen';
import PriceComparisonScreen from '../screens/PriceComparisonScreen';
import DemandForecastingScreen from '../screens/DemandForecastingScreen';
import StaffLunchScreen from '../screens/StaffLunchScreen';
import ExchangeRateManagementScreen from '../screens/ExchangeRateManagementScreen';

// Import Tab Navigator
import TabNavigator from './TabNavigator';

// Import API service
import { apiService } from '../services/api';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(ROUTES.LICENSE_FIRST_LOGIN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkShopStatus = async () => {
      try {
        console.log('🔍 Checking shop registration status...');
        const response = await apiService.getShopStatus();

        if (response.is_registered) {
          console.log('✅ Shop is registered, showing login screen');
          setInitialRoute(ROUTES.LOGIN);
        } else {
          console.log('❌ No shop registered, showing welcome screen');
          setInitialRoute(ROUTES.WELCOME);
        }
      } catch (error) {
        console.error('Error checking shop status:', error);
        // If there's an error checking shop status, assume no shop exists
        console.log('❌ Error checking shop status, showing welcome screen');
        setInitialRoute(ROUTES.WELCOME);
      } finally {
        setIsLoading(false);
      }
    };

    checkShopStatus();
  }, []);

  if (isLoading) {
    // You could return a loading screen here
    return (
      <Stack.Navigator
        initialRouteName={ROUTES.WELCOME}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Authentication Flow */}
      <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.LICENSE_FIRST_LOGIN} component={LicenseFirstLoginScreen} />
      <Stack.Screen name={ROUTES.LICENSE_RENEWAL} component={LicenseRenewalScreen} />
      <Stack.Screen name={ROUTES.LICENSE_MANAGEMENT} component={LicenseManagementScreen} />
      <Stack.Screen name={ROUTES.CASHIER_DASHBOARD} component={CashierDashboardScreen} />
      <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={ROUTES.CASHIER_RESET_PASSWORD} component={CashierResetPasswordScreen} />
      
      {/* Main App with Tab Navigation */}
      <Stack.Screen 
        name="MainApp" 
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Additional Screens */}
      <Stack.Screen name={ROUTES.REGISTRATION_DETAILS} component={RegistrationDetailsScreen} />
      <Stack.Screen name={ROUTES.SUCCESS} component={SuccessScreen} />
      <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={ROUTES.STAFF_CONTRACT} component={StaffContractScreen} />
      <Stack.Screen name={ROUTES.CASHIER_REGISTER} component={CashierRegisterScreen} />
      <Stack.Screen name={ROUTES.INVENTORY_AUDIT_TRAIL} component={InventoryAuditTrailScreen} />
      <Stack.Screen name={ROUTES.INVENTORY_RECEIVING} component={InventoryReceivingScreen} />
      <Stack.Screen name={ROUTES.PRODUCT_MANAGEMENT} component={ProductManagementScreen} />
      <Stack.Screen name={ROUTES.RESTOCK_MANAGER} component={RestockManagerScreen} />
      <Stack.Screen name={ROUTES.STOCK_TAKE} component={StockTakeScreen} />
      <Stack.Screen name={ROUTES.STOCK_TRANSFER} component={StockTransferScreen} />
      <Stack.Screen name={ROUTES.STOCK_TRANSFER_HISTORY} component={StockTransferHistoryScreen} />
      <Stack.Screen name={ROUTES.PRODUCT_SPLIT} component={ProductSplitScreen} />
      <Stack.Screen name={ROUTES.HALF_PRODUCTS} component={HalfProductsScreen} />
      <Stack.Screen name={ROUTES.STOCK_VALUATION} component={StockValuationScreen} />
      <Stack.Screen name={ROUTES.POS_PRICE} component={POSPriceScreen} />
      <Stack.Screen name={ROUTES.SALES_AND_REFUNDS} component={SalesAndRefundsScreen} />

      <Stack.Screen name={ROUTES.SALES_DASHBOARD} component={SalesDashboardScreen} />
      <Stack.Screen name={ROUTES.SALES_LEDGER} component={SalesLedgerScreen} />
      <Stack.Screen name={ROUTES.SALES_AUDIT_TRAIL} component={SalesAuditTrailScreen} />
      <Stack.Screen name={ROUTES.WASTE_SCREEN} component={WasteScreen} />
      <Stack.Screen name={ROUTES.EOD_RECONCILIATION} component={EODReconciliationScreen} />
      <Stack.Screen name={ROUTES.START_OF_DAY} component={StartOfDayScreen} />
      <Stack.Screen name={ROUTES.CASHIER_SALES} component={CashierSalesScreen} />
      <Stack.Screen name={ROUTES.CASHIER_PRODUCT_RECEIVING} component={CashierProductReceivingScreen} />
      <Stack.Screen name="CashierDrawer" component={CashierDrawerScreen} />
      <Stack.Screen name="CashierProducts" component={CashierProductsScreen} />
      <Stack.Screen name="WeightProducts" component={WeightProductsScreen} />
      <Stack.Screen name="QuickProducts" component={QuickProductsScreen} />
      <Stack.Screen name="CashierStockTake" component={CashierStockTakeScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
      <Stack.Screen name="LowStockAlerts" component={LowStockAlertsScreen} />
      <Stack.Screen name="ProfitAnalysis" component={ProfitAnalysisScreen} />
      <Stack.Screen name={ROUTES.SUPPLIER_MANAGEMENT} component={SupplierManagementScreen} />
      <Stack.Screen name={ROUTES.STOCK_MOVEMENTS} component={StockMovementScreen} />
      <Stack.Screen name={ROUTES.PRICE_COMPARISON} component={PriceComparisonScreen} />
      <Stack.Screen name={ROUTES.DEMAND_FORECASTING} component={DemandForecastingScreen} />
      <Stack.Screen name={ROUTES.STAFF_LUNCH} component={StaffLunchScreen} />
      <Stack.Screen name={ROUTES.EXCHANGE_RATE_MANAGEMENT} component={ExchangeRateManagementScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;