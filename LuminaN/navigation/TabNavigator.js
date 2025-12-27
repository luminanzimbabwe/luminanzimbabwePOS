import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Home, Users, Package, BarChart3, Settings, Truck, ClipboardCheck, DollarSign, Trash2 } from 'lucide-react-native';

// Import main screens for tabs
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import OwnerSalesScreen from '../screens/OwnerSalesScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import WasteScreen from '../screens/WasteScreen';
import InventoryReceivingScreen from '../screens/InventoryReceivingScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import InventoryAuditTrailScreen from '../screens/InventoryAuditTrailScreen';
import SettingsScreen from '../screens/SettingsScreen';



const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Dashboard') {
            IconComponent = Home;
          } else if (route.name === 'Sales') {
            IconComponent = DollarSign;
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
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0a0a0a',
          borderBottomColor: '#333',
          borderBottomWidth: 1,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={OwnerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'LuminaN Dashboard',
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={OwnerSalesScreen}
        options={{
          title: 'Sales',
          headerTitle: 'Today\'s Sales',
        }}
      />
      <Tab.Screen 
        name="Staff" 
        component={StaffManagementScreen}
        options={{
          title: 'Staff',
          headerTitle: 'Staff Management',
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductManagementScreen}
        options={{
          title: 'Products',
          headerTitle: 'Product Management',
        }}
      />
      <Tab.Screen 
        name="Waste" 
        component={WasteScreen}
        options={{
          title: 'Waste',
          headerTitle: 'Waste Management',
        }}
      />
      <Tab.Screen 
        name="Receiving" 
        component={InventoryReceivingScreen}
        options={{
          title: 'Receiving',
          headerTitle: 'Inventory Receiving',
        }}
      />
      <Tab.Screen 
        name="Confirmations" 
        component={OrderConfirmationScreen}
        options={{
          title: 'Confirm',
          headerTitle: 'Order Confirmations',
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={InventoryAuditTrailScreen}
        options={{
          title: 'Reports',
          headerTitle: 'Inventory Audit Trail',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;