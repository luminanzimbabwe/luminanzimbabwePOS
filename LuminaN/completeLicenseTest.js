/**
 * Complete License Fix Verification and Testing Script
 * This script will help verify the founder credentials work correctly
 */

import licenseService from './services/licenseService.js';
import { shopStorage } from './services/storage.js';

async function completeLicenseTest() {
  console.log('🔧 COMPREHENSIVE LICENSE SYSTEM TEST');
  console.log('=====================================');
  
  try {
    // Step 1: Initialize services
    console.log('\n📋 Step 1: Initializing services...');
    await licenseService.initialize();
    console.log('✅ License service initialized');
    
    // Step 2: Check current credentials
    console.log('\n🔑 Step 2: Checking configured credentials...');
    const serviceInstance = licenseService;
    console.log(`📧 Configured Email: ${serviceInstance.FOUNDER_EMAIL}`);
    console.log(`🔐 Configured Password: ${serviceInstance.FOUNDER_PASSWORD}`);
    console.log(`📏 Password Length: ${serviceInstance.FOUNDER_PASSWORD.length}`);
    
    // Step 3: Test exact credentials you're using
    console.log('\n🧪 Step 3: Testing your credentials...');
    const testEmail = 'thisismeprivateisaacngirazi@gmail.com';
    const testPassword = 'morrill95@2001';
    
    console.log(`📧 Testing Email: ${testEmail}`);
    console.log(`🔑 Testing Password: ${testPassword}`);
    console.log(`🔍 Email Match: ${testEmail === serviceInstance.FOUNDER_EMAIL}`);
    console.log(`🔍 Password Match: ${testPassword === serviceInstance.FOUNDER_PASSWORD}`);
    
    // Step 4: Test founder trial access
    console.log('\n🚀 Step 4: Testing founder trial activation...');
    const result = await licenseService.attemptFounderTrialAccess(testEmail, testPassword);
    
    console.log('📊 Trial Activation Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! Founder credentials are working correctly!');
      console.log('📅 License Details:');
      console.log(`   License ID: ${result.license.id}`);
      console.log(`   Type: ${result.license.type}`);
      console.log(`   Status: ${result.license.status}`);
      console.log(`   Expires: ${result.license.expiry_date}`);
      console.log(`   Shop: ${result.license.shop_name}`);
      
      // Step 5: Verify license was stored
      console.log('\n💾 Step 5: Verifying license storage...');
      const storedLicense = await licenseService.getStoredLicense();
      if (storedLicense) {
        console.log('✅ License successfully stored and retrievable');
        console.log(`📋 Stored License ID: ${storedLicense.id}`);
      } else {
        console.log('❌ License was not properly stored');
      }
      
    } else {
      console.log('\n❌ FAILED: Trial activation failed');
      console.log(`Error Details: ${JSON.stringify(result, null, 2)}`);
      
      // Additional debugging
      console.log('\n🔍 Debugging Information:');
      console.log('Expected Email:', serviceInstance.FOUNDER_EMAIL);
      console.log('Received Email:', testEmail);
      console.log('Email Match:', testEmail === serviceInstance.FOUNDER_EMAIL);
      console.log('Expected Password:', serviceInstance.FOUNDER_PASSWORD);
      console.log('Received Password:', testPassword);
      console.log('Password Match:', testPassword === serviceInstance.FOUNDER_PASSWORD);
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
  
  console.log('\n🏁 Test completed');
  console.log('=====================================');
}

// Instructions for the user
console.log('📱 MOBILE APP RELOAD INSTRUCTIONS:');
console.log('=====================================');
console.log('Since you modified the JavaScript code, your React Native app needs to reload the bundle:');
console.log('');
console.log('🔄 For React Native Metro (development):');
console.log('   • Shake your device or emulator');
console.log('   • Select "Reload" or "Reload JS Bundle"');
console.log('   • Or press Ctrl+M (Windows/Linux) or Cmd+M (Mac)');
console.log('');
console.log('🔄 For Expo (if using Expo):');
console.log('   • Shake your device or emulator');
console.log('   • Select "Reload" from the menu');
console.log('   • Or press r in the terminal');
console.log('');
console.log('🔄 For Physical Device:');
console.log('   • Shake the device');
console.log('   • Select "Reload" from the developer menu');
console.log('');
console.log('After reloading, try the founder trial activation again!');
console.log('=====================================');

// Run the test
completeLicenseTest();