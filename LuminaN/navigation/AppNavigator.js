import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '../constants/navigation';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
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
import WeightProductsScreen from '../screens/WeightProductsScreen';
import QuickProductsScreen from '../screens/QuickProductsScreen';

// Import Tab Navigator
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.WELCOME}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Authentication Flow */}
      <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
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
      <Stack.Screen name="CashierDrawer" component={CashierDrawerScreen} />
      <Stack.Screen name="CashierProducts" component={CashierProductsScreen} />
      <Stack.Screen name="WeightProducts" component={WeightProductsScreen} />
      <Stack.Screen name="QuickProducts" component={QuickProductsScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;