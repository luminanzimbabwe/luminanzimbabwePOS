/**
 * Browser Console Commands to Clear License Data
 * Run these commands in your browser console (F12)
 */

// Method 1: Clear AsyncStorage keys used by the app
async function clearLicenseData() {
  console.log('🧹 Clearing License Data for Testing');
  console.log('====================================\n');
  
  try {
    // Check if AsyncStorage is available
    if (typeof AsyncStorage !== 'undefined') {
      console.log('📱 Using AsyncStorage (React Native)');
      
      // Clear license data
      await AsyncStorage.removeItem('license_data');
      console.log('✅ Cleared: license_data');
      
      // Clear shop credentials
      await AsyncStorage.removeItem('shop_credentials');
      console.log('✅ Cleared: shop_credentials');
      
      // Clear other related data
      await AsyncStorage.removeItem('license_security_data');
      console.log('✅ Cleared: license_security_data');
      
      await AsyncStorage.removeItem('user_session');
      console.log('✅ Cleared: user_session');
      
      await AsyncStorage.removeItem('app_initialized');
      console.log('✅ Cleared: app_initialized');
      
    } else if (typeof localStorage !== 'undefined') {
      console.log('🌐 Using browser localStorage');
      
      // Clear license-related keys
      const keysToClear = [
        'license_data',
        'shop_credentials', 
        'license_security_data',
        'user_session',
        'app_initialized',
        'current_license',
        'shop_credentials'
      ];
      
      keysToClear.forEach(key => {
        localStorage.removeItem(key);
        console.log('✅ Cleared:', key);
      });
      
    } else {
      console.log('❌ No storage available');
      return false;
    }
    
    console.log('\n✅ All license data cleared successfully!');
    console.log('\n📱 Next Steps:');
    console.log('1. Refresh the page (F5)');
    console.log('2. You should see the "License Required" screen');
    console.log('3. Look for "Use Founder Credentials" section');
    console.log('4. Use these credentials:');
    console.log('   Email: thisismeprivateisaacngirazi@gmail.com');
    console.log('   Password: morrill95@2001');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to clear license data:', error);
    return false;
  }
}

// Method 2: Alternative approach using global storage
function clearLicenseDataSimple() {
  console.log('🧹 Simple License Data Clearing');
  console.log('================================\n');
  
  try {
    // Try multiple storage methods
    const storageMethods = [
      () => {
        if (typeof AsyncStorage !== 'undefined') {
          Object.keys(AsyncStorage).forEach(key => {
            if (key.includes('license') || key.includes('shop')) {
              AsyncStorage.removeItem(key);
            }
          });
          console.log('✅ AsyncStorage cleared');
        }
      },
      () => {
        if (typeof localStorage !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.includes('license') || key.includes('shop')) {
              localStorage.removeItem(key);
            }
          });
          console.log('✅ localStorage cleared');
        }
      },
      () => {
        if (typeof sessionStorage !== 'undefined') {
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('license') || key.includes('shop')) {
              sessionStorage.removeItem(key);
            }
          });
          console.log('✅ sessionStorage cleared');
        }
      }
    ];
    
    storageMethods.forEach(method => method());
    
    console.log('\n✅ Storage clearing completed');
    console.log('🔄 Please refresh the page (F5)');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during clearing:', error);
    return false;
  }
}

// Quick reset command
function quickReset() {
  console.log('🔄 Quick Reset - Clearing All App Data');
  console.log('======================================');
  
  // Clear all possible storage
  try {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    if (typeof AsyncStorage !== 'undefined') {
      Object.keys(AsyncStorage).forEach(key => AsyncStorage.removeItem(key));
    }
    
    console.log('✅ All storage cleared');
    console.log('🔄 Refresh page to see license screen');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

// Export functions for easy access
window.clearLicenseData = clearLicenseData;
window.clearLicenseDataSimple = clearLicenseDataSimple;
window.quickReset = quickReset;

console.log('📋 License clearing functions loaded!');
console.log('💡 Available commands:');
console.log('   - clearLicenseData()     : Full clearing');
console.log('   - clearLicenseDataSimple(): Simple clearing'); 
console.log('   - quickReset()           : Reset everything');
console.log('\n🚀 Run any of these commands to clear license data!');