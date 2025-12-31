import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Package, BarChart3, Settings, Truck, ClipboardCheck, Trash2, Calculator, List } from 'lucide-react-native';

// Import main screens for tabs
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import WasteScreen from '../screens/WasteScreen';
import InventoryReceivingScreen from '../screens/InventoryReceivingScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import InventoryAuditTrailScreen from '../screens/InventoryAuditTrailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EODReconciliationScreen from '../screens/EODReconciliationScreen';
import SalesLedgerScreen from '../screens/SalesLedgerScreen';



const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Dashboard') {
            IconComponent = Home;
          } else if (route.name === 'Staff') {
            IconComponent = Users;
          } else if (route.name === 'Products') {
            IconComponent = Package;
          } else if (route.name === 'Waste') {
            IconComponent = Trash2;
          } else if (route.name === 'Receiving') {
            IconComponent = Truck;
          } else if (route.name === 'Confirmations') {
            IconComponent = ClipboardCheck;
          } else if (route.name === 'Reports') {
            IconComponent = BarChart3;
          } else if (route.name === 'Settings') {
            IconComponent = Settings;
          } else if (route.name === 'EODReconciliation') {
            IconComponent = Calculator;
          } else if (route.name === 'SalesLedger') {
            IconComponent = List;
          }

          return <IconComponent size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 65,
          paddingHorizontal: 5,
          position: 'relative',
          zIndex: 1000,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          color: '#ffffff',
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        tabBarItemStyle: {
          paddingVertical: 1,
          paddingHorizontal: 4,
          backgroundColor: 'transparent',
        },
        tabBarIconStyle: {
          marginBottom: 1,
        },
        headerStyle: {
          backgroundColor: '#0a0a0a',
          borderBottomColor: '#333',
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={OwnerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'LuminaN Dashboard',
          tabBarLabel: 'Home',
        }}
      />

      <Tab.Screen 
        name="Staff" 
        component={StaffManagementScreen}
        options={{
          title: 'Staff',
          headerTitle: 'Staff Management',
          tabBarLabel: 'Staff',
        }}
      />

      <Tab.Screen 
        name="Products" 
        component={ProductManagementScreen}
        options={{
          title: 'Products',
          headerTitle: 'Product Management',
          tabBarLabel: 'Products',
        }}
      />

      <Tab.Screen 
        name="Waste" 
        component={WasteScreen}
        options={{
          title: 'Waste',
          headerTitle: 'Waste Management',
          tabBarLabel: 'Waste',
        }}
      />

      <Tab.Screen 
        name="Receiving" 
        component={InventoryReceivingScreen}
        options={{
          title: 'Receiving',
          headerTitle: 'Inventory Receiving',
          tabBarLabel: 'Receive',
        }}
      />

      <Tab.Screen 
        name="Confirmations" 
        component={OrderConfirmationScreen}
        options={{
          title: 'Confirm',
          headerTitle: 'Order Confirmations',
          tabBarLabel: 'Confirm',
        }}
      />

      <Tab.Screen 
        name="Reports" 
        component={InventoryAuditTrailScreen}
        options={{
          title: 'Reports',
          headerTitle: 'Inventory Audit Trail',
          tabBarLabel: 'Reports',
        }}
      />

      <Tab.Screen 
        name="SalesLedger" 
        component={SalesLedgerScreen}
        options={{
          title: 'Ledger',
          headerTitle: 'Sales Ledger',
          tabBarLabel: 'Ledger',
        }}
      />

      <Tab.Screen 
        name="EODReconciliation" 
        component={EODReconciliationScreen}
        options={{
          title: 'EOD',
          headerTitle: 'EOD Reconciliation',
          tabBarLabel: 'EOD',
        }}
      />

      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;