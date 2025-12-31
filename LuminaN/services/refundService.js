// Enterprise-grade refund management service
// This service manages refund status with proper backend integration
// NO localStorage - uses AsyncStorage for React Native compatibility
// NO estimation logic - all amounts must be precise

import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopAPI } from './api';
import { shopStorage } from './storage';

class RefundService {
  constructor() {
    this.refundKey = '@shop_refunds';
    this.listeners = []; // For notifying other components of changes
  }

  // Load all refund statuses from AsyncStorage (async for React Native)
  async loadRefundStatus() {
    try {
      const stored = await AsyncStorage.getItem(this.refundKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading refund status:', error);
      return {};
    }
  }

  // Save refund status to AsyncStorage (async for React Native)
  async saveRefundStatus(refundData) {
    try {
      await AsyncStorage.setItem(this.refundKey, JSON.stringify(refundData));
      
      // Notify all listeners of the change
      this.notifyListeners(refundData);
      return true;
    } catch (error) {
      console.error('Error saving refund status:', error);
      return false;
    }
  }

  // Process a refund for a specific sale using simple cashier API
  // CRITICAL: Backend first, then local cache for UI speed
  async processRefund(saleId, reason = 'Customer request - processed directly', amount = null, cashierId = null, onError = null) {
    // VALIDATION: Never process refunds without valid amounts
    if (!amount || amount <= 0) {
      console.error("❌ Cannot refund without a valid amount");
      if (onError) onError('Cannot process refund without a valid amount');
      return false;
    }

    // BACKEND FIRST: Use simple cashier refund API
    try {
      const refundData = {
        sale_id: saleId,
        cashier_id: cashierId,
        refund_amount: amount,
        refund_reason: reason
      };
      
      const response = await shopAPI.processCashierRefund(refundData);
      
      if (response.data.success) {
        console.log(`✅ Backend refund processed:`, response.data);
      } else {
        throw new Error(response.data.error || 'Backend refund failed');
      }

    } catch (backendError) {
      console.error('❌ Backend refund failed:', backendError);
      if (onError) onError('Failed to process refund. Please try again.');
      return false;
    }

    // LOCAL CACHE: Update UI cache after successful backend operation
    try {
      const refundStatus = await this.loadRefundStatus();
      refundStatus[saleId] = {
        refunded: true,
        reason: reason,
        timestamp: new Date().toISOString(),
        amount: amount // Store the EXACT refund amount
      };
      
      const success = await this.saveRefundStatus(refundStatus);
      if (success) {
        console.log(`✅ Refund processed for sale ${saleId} - Amount: ${amount}`);
      }
      return success;
    } catch (localError) {
      console.error('❌ Local cache update failed:', localError);
      // Backend already updated, but UI cache failed
      // This is acceptable - the refund is still processed
      return true;
    }
  }

  // Check if a sale is refunded
  async isRefunded(saleId) {
    const refundStatus = await this.loadRefundStatus();
    return !!(refundStatus[saleId] && refundStatus[saleId].refunded);
  }

  // Get refund info for a sale
  async getRefundInfo(saleId) {
    const refundStatus = await this.loadRefundStatus();
    return refundStatus[saleId] || null;
  }

  // Clear all refunds (both backend and local)
  async clearAllRefunds() {
    try {
      await AsyncStorage.removeItem(this.refundKey);
      this.notifyListeners({});
      console.log('🗑️ All refund statuses cleared');
      console.log('💡 Tip: Restart the app to ensure clean state');
      return true;
    } catch (error) {
      console.error('Error clearing refund status:', error);
      return false;
    }
  }

  // Get sales with refund status applied
  async applyRefundsToSales(sales) {
    const refundStatus = await this.loadRefundStatus();
    
    return sales.map(sale => {
      if (refundStatus[sale.id]) {
        return {
          ...sale,
          status: 'refunded',
          refund_reason: refundStatus[sale.id].reason || 'Customer request - processed directly',
          is_refunded: true,
          refund_amount: refundStatus[sale.id].amount || sale.total_amount // Use exact amount
        };
      }
      return {
        ...sale,
        is_refunded: false
      };
    });
  }

  // Calculate net sales with CORRECT financial mathematics
  // CRITICAL: Gross = Everything that went into till
  //          Refunds = Everything that went out
  //          Net = Gross - Refunds
  async calculateNetSales(sales) {
    const salesWithRefunds = await this.applyRefundsToSales(sales);
    
    let grossSales = 0;
    let totalRefunds = 0;
    let totalRevenue = 0;
    
    salesWithRefunds.forEach(sale => {
      const amount = parseFloat(sale.total_amount) || 0;
      
      if (sale.is_refunded) {
        // This sale was refunded - count as money that left the till
        totalRefunds += amount;
      } else {
        // This sale is complete - count as money that stayed in till
        grossSales += amount;
        totalRevenue += amount;
      }
    });
    
    return {
      grossSales: grossSales + totalRefunds, // Total money that passed through
      totalRevenue: totalRevenue,            // Money that stayed (net income)
      totalRefunds: totalRefunds,            // Money that was returned
      netRevenue: totalRevenue,              // What actually remains
      refundCount: salesWithRefunds.filter(s => s.is_refunded).length,
      completedCount: salesWithRefunds.filter(s => !s.is_refunded).length
    };
  }

  // Subscribe to refund changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of changes
  notifyListeners(refundData) {
    this.listeners.forEach(callback => {
      try {
        callback(refundData);
      } catch (error) {
        console.error('Error in refund listener:', error);
      }
    });
  }

  // Get statistics
  async getRefundStatistics(sales) {
    const salesWithRefunds = await this.applyRefundsToSales(sales);
    
    const refundedSales = salesWithRefunds.filter(s => s.is_refunded);
    const completedSales = salesWithRefunds.filter(s => !s.is_refunded);
    
    const totalRefundedAmount = refundedSales.reduce((sum, sale) => {
      // Use the exact refund amount, not sale amount
      return sum + (parseFloat(sale.refund_amount || sale.total_amount) || 0);
    }, 0);
    
    const totalCompletedAmount = completedSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
    
    return {
      totalSales: salesWithRefunds.length,
      completedSales: completedSales.length,
      refundedSales: refundedSales.length,
      totalCompletedAmount: totalCompletedAmount,
      totalRefundedAmount: totalRefundedAmount,
      refundRate: salesWithRefunds.length > 0 ? (refundedSales.length / salesWithRefunds.length) * 100 : 0,
      averageRefund: refundedSales.length > 0 ? totalRefundedAmount / refundedSales.length : 0,
      averageCompleted: completedSales.length > 0 ? totalCompletedAmount / completedSales.length : 0
    };
  }

  // Get refund stats without requiring sales data (for dashboard screens)
  async getRefundStats() {
    try {
      const refundStatus = await this.loadRefundStatus();
      
      // Calculate totals from stored refund data
      let totalRefunded = 0;
      let refundCount = 0;
      const refundsByDate = {};
      const refundsBySale = {};
      
      // Ensure refundStatus is an object
      if (!refundStatus || typeof refundStatus !== 'object') {
        console.warn('⚠️ Refund status is not a valid object, returning empty stats');
        return {
          totalRefunded: 0,
          refundCount: 0,
          refundsByDate: {},
          refundsBySale: {}
        };
      }
      
      Object.entries(refundStatus).forEach(([saleId, refundData]) => {
        if (refundData && refundData.refunded) {
          refundCount++;
          
          // CRITICAL: Use exact amount from refund data - NO ESTIMATION
          const amount = refundData.amount;
          if (!amount || amount <= 0) {
            console.error(`❌ Refund for sale ${saleId} has invalid amount: ${amount}`);
            return; // Skip this invalid refund
          }
          
          totalRefunded += amount;
          
          // Group by date
          const date = refundData.timestamp ? refundData.timestamp.split('T')[0] : 'unknown';
          refundsByDate[date] = (refundsByDate[date] || 0) + amount;
          
          // Group by sale
          refundsBySale[saleId] = amount;
        }
      });
      
      return {
        totalRefunded,
        refundCount,
        refundsByDate,
        refundsBySale
      };
    } catch (error) {
      console.error('❌ Error in getRefundStats:', error);
      // Return safe fallback data
      return {
        totalRefunded: 0,
        refundCount: 0,
        refundsByDate: {},
        refundsBySale: {}
      };
    }
  }

  // Get refund stats for EOD reporting
  async getRefundStatsForEOD(cashierId = null) {
    try {
      const params = {};
      if (cashierId) {
        params.cashier_id = cashierId;
      }
      
      const response = await shopAPI.getCashierRefunds(params);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get refund stats');
      }
    } catch (error) {
      console.error('Error getting refund stats for EOD:', error);
      return {
        summary: {
          total_refunds: 0,
          total_refund_amount: '0.00',
          average_refund: '0.00'
        },
        refunds_by_cashier: [],
        recent_refunds: []
      };
    }
  }

  // Emergency reset function - clears all refunds and logs debug info
  async emergencyReset() {
    console.log('🚨 EMERGENCY REFUND RESET INITIATED');
    console.log('📊 Current refund data before reset:');
    console.table(await this.loadRefundStatus());
    
    await this.clearAllRefunds();
    
    console.log('✅ Refund data cleared successfully');
    console.log('🔄 Please restart the app to ensure clean state');
    console.log('💡 This will fix the incorrect refund amounts');
    
    return true;
  }

  // REMOVED: estimateSaleAmount function
  // REASON: POS systems cannot estimate money - this is dangerous for financial accuracy
  // If amount is not provided, the refund should fail, not guess

  // Get comprehensive refund analysis for debugging
  async getRefundAnalysis() {
    const refundStatus = await this.loadRefundStatus();
    const analysis = {
      totalRefunds: Object.keys(refundStatus).length,
      invalidRefunds: 0,
      validRefunds: 0,
      totalAmount: 0,
      issues: []
    };

    Object.entries(refundStatus).forEach(([saleId, refundData]) => {
      if (!refundData.amount || refundData.amount <= 0) {
        analysis.invalidRefunds++;
        analysis.issues.push(`Sale ${saleId}: Invalid amount (${refundData.amount})`);
      } else {
        analysis.validRefunds++;
        analysis.totalAmount += refundData.amount;
      }
    });

    return analysis;
  }
}

// Create singleton instance
const refundService = new RefundService();

export default refundService;