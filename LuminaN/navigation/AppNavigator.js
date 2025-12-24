import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '../constants/navigation';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CashierResetPasswordScreen from '../screens/CashierResetPasswordScreen';
import RegistrationDetailsScreen from '../screens/RegistrationDetailsScreen';
import SuccessScreen from '../screens/SuccessScreen';
import StaffContractScreen from '../screens/StaffContractScreen';
import CashierRegisterScreen from '../screens/CashierRegisterScreen';
import InventoryAuditTrailScreen from '../screens/InventoryAuditTrailScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';

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
      <Stack.Screen name={ROUTES.STAFF_CONTRACT} component={StaffContractScreen} />
      <Stack.Screen name={ROUTES.CASHIER_REGISTER} component={CashierRegisterScreen} />
      <Stack.Screen name={ROUTES.INVENTORY_AUDIT_TRAIL} component={InventoryAuditTrailScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;