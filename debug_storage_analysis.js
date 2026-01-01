// Debug script to analyze storage contents
import { shopStorage } from './LuminaN/services/storage.js';

export const debugStorageAnalysis = async () => {
  console.log('🔍 === STORAGE ANALYSIS ===');
  
  try {
    // Check pending orders
    console.log('\n📦 PENDING ORDERS:');
    const pendingJson = await shopStorage.getItem('pending_orders');
    const pending = JSON.parse(pendingJson || '[]');
    console.log('Count:', pending.length);
    pending.forEach((order, index) => {
      console.log(`  ${index + 1}. ID: ${order.id}`);
      console.log(`     Status: ${order.status}`);
      console.log(`     CreatedBy: ${order.createdBy}`);
      console.log(`     Supplier: ${order.supplierName}`);
      console.log(`     All keys:`, Object.keys(order));
    });
    
    // Check confirmed orders
    console.log('\n✅ CONFIRMED ORDERS:');
    const confirmedJson = await shopStorage.getItem('confirmed_orders');
    const confirmed = JSON.parse(confirmedJson || '[]');
    console.log('Count:', confirmed.length);
    confirmed.forEach((order, index) => {
      console.log(`  ${index + 1}. ID: ${order.id}`);
      console.log(`     Status: ${order.status}`);
      console.log(`     CreatedBy: ${order.createdBy}`);
      console.log(`     Supplier: ${order.supplierName}`);
    });
    
    // Check cashier receiving records
    console.log('\n👤 CASHIER RECEIVING RECORDS:');
    const cashierReceiving = await shopStorage.getCashierReceivingRecords();
    console.log('Count:', cashierReceiving.length);
    cashierReceiving.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}`);
      console.log(`     Status: ${record.status}`);
      console.log(`     CreatedBy: ${record.createdBy}`);
      console.log(`     CashierName: ${record.cashierName}`);
      console.log(`     Supplier: ${record.supplierName}`);
      console.log(`     All keys:`, Object.keys(record));
    });
    
    console.log('\n🔍 === ANALYSIS COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error in storage analysis:', error);
  }
};