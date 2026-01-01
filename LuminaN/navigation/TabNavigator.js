import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView, Platform, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Custom Tab Bar Component with Safe Area Handling
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#1a1a1a' }}>
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        paddingBottom: Platform.OS === 'web' ? 20 : 15, // Extra padding for web task bars
        paddingTop: 5,
        height: Platform.OS === 'web' ? 80 : 65, // Taller on web to avoid task bar
        borderTopColor: '#333',
        borderTopWidth: 1,
        paddingHorizontal: 5,
        marginBottom: Platform.OS === 'web' ? 10 : 0, // Extra margin for web
      }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

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

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 1,
                paddingHorizontal: 4,
                backgroundColor: 'transparent',
              }}
            >
              <IconComponent 
                size={20} 
                color={isFocused ? '#3b82f6' : '#999'} 
                style={{ marginBottom: 1 }}
              />
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                marginTop: 0,
                color: isFocused ? '#ffffff' : '#999',
                includeFontPadding: false,
                textAlignVertical: 'center',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const TabNavigator = () => {
  return (
    <SafeAreaProvider>
      <Tab.Navigator
        tabBar={CustomTabBar}
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#999',
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
    </SafeAreaProvider>
  );
};

export default TabNavigator;