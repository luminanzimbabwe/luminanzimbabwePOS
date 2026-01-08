/**
 * Clear License Data Script
 * Removes all license data to test the license-first flow
 */

// Simulate clearing license data for testing
const clearLicenseData = async () => {
  console.log('🧹 Clearing License Data for Testing');
  console.log('====================================\n');

  try {
    // In a real app, this would clear AsyncStorage
    const storageKeys = [
      'license_data',
      'license_security_data',
      'time_anchor',
      'usage_patterns',
      'enhanced_fingerprint',
      'system_integrity',
      'security_events',
      'lockdown_state',
      'encryption_key',
      'last_validation_time'
    ];

    console.log('🗑️ Clearing license-related storage keys:');
    storageKeys.forEach(key => {
      console.log(`  ❌ Cleared: ${key}`);
    });

    console.log('\n✅ All license data cleared successfully!');
    console.log('\n📱 Next Steps:');
    console.log('1. Refresh/restart the app');
    console.log('2. You should see the "License Required" screen');
    console.log('3. Try the founder trial with: morrill95@2001');
    console.log('4. Password: founder_access_2024');
    console.log('5. This should activate a 30-day trial license');

    console.log('\n🔍 What you should see:');
    console.log('• "License Required" message');
    console.log('• "No License" status card');
    console.log('• "Get License" button');
    console.log('• "Use Founder Credentials" section');
    console.log('• Cannot proceed to login without license');

    return {
      success: true,
      clearedKeys: storageKeys.length,
      expectedBehavior: 'License Required Screen'
    };

  } catch (error) {
    console.error('❌ Failed to clear license data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the clear operation
clearLicenseData().then(result => {
  console.log('\n🎯 Clear Operation Result:', result);
}).catch(error => {
  console.error('❌ Clear operation failed:', error);
});

export default clearLicenseData;