/**
 * Exchange Rate Service
 * Provides current exchange rates throughout the app
 */
import { shopAPI } from './api';

class ExchangeRateService {
  constructor() {
    this.cachedRates = null;
    this.lastFetchTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current exchange rates with caching
   */
  async getCurrentRates() {
    try {
      // Return cached rates if still valid
      if (this.cachedRates && this.lastFetchTime && 
          (Date.now() - this.lastFetchTime) < this.cacheTimeout) {
        return this.cachedRates;
      }

      // Fetch fresh rates
      const response = await shopAPI.getExchangeRates();
      
      if (response.data && response.data.success) {
        const rates = response.data.data || response.data.rates;
        this.cachedRates = {
          usd_to_zig: parseFloat(rates.usd_to_zig) || 1.0,
          usd_to_rand: parseFloat(rates.usd_to_rand) || 18.5,
          last_updated: rates.last_updated || new Date().toISOString(),
          date: rates.date || new Date().toISOString().split('T')[0]
        };
        this.lastFetchTime = Date.now();
        return this.cachedRates;
      }
      
      // Return default rates if API fails
      return this.getDefaultRates();
    } catch (error) {
      console.warn('Failed to fetch exchange rates:', error);
      return this.getDefaultRates();
    }
  }

  /**
   * Get default exchange rates
   */
  getDefaultRates() {
    return {
      usd_to_zig: 1.0,
      usd_to_rand: 18.5,
      last_updated: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    const rates = await this.getCurrentRates();
    
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Convert using USD as base currency
    if (fromCurrency === 'USD') {
      if (toCurrency === 'ZIG') {
        return amount * rates.usd_to_zig;
      } else if (toCurrency === 'RAND') {
        return amount * rates.usd_to_rand;
      }
    } else if (fromCurrency === 'ZIG') {
      if (toCurrency === 'USD') {
        return amount / rates.usd_to_zig;
      } else if (toCurrency === 'RAND') {
        // Convert ZIG -> USD -> RAND
        const usdAmount = amount / rates.usd_to_zig;
        return usdAmount * rates.usd_to_rand;
      }
    } else if (fromCurrency === 'RAND') {
      if (toCurrency === 'USD') {
        return amount / rates.usd_to_rand;
      } else if (toCurrency === 'ZIG') {
        // Convert RAND -> USD -> ZIG
        const usdAmount = amount / rates.usd_to_rand;
        return usdAmount * rates.usd_to_zig;
      }
    }

    throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
  }

  /**
   * Format currency amount with proper formatting
   */
  formatCurrency(amount, currency = 'USD') {
    const symbols = {
      'USD': '$',
      'ZIG': 'ZIG',
      'RAND': 'R'
    };

    const symbol = symbols[currency] || currency;
    
    if (currency === 'ZIG') {
      return `${symbol} ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    } else if (currency === 'RAND') {
      return `${symbol} ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    } else {
      return `${symbol}${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
  }

  /**
   * Get rate display string
   */
  getRateDisplay(fromCurrency, toCurrency, rates = null) {
    if (!rates) {
      rates = this.getDefaultRates();
    }

    if (fromCurrency === 'USD' && toCurrency === 'ZIG') {
      return `1 USD = ${this.formatCurrency(rates.usd_to_zig, 'ZIG')}`;
    } else if (fromCurrency === 'USD' && toCurrency === 'RAND') {
      return `1 USD = ${this.formatCurrency(rates.usd_to_rand, 'RAND')}`;
    } else if (fromCurrency === 'ZIG' && toCurrency === 'USD') {
      return `1 ZIG = ${this.formatCurrency(1 / rates.usd_to_zig, 'USD')}`;
    } else if (fromCurrency === 'RAND' && toCurrency === 'USD') {
      return `1 RAND = ${this.formatCurrency(1 / rates.usd_to_rand, 'USD')}`;
    }

    return '1 USD = 1.0 USD';
  }

  /**
   * Clear cache to force refresh
   */
  clearCache() {
    this.cachedRates = null;
    this.lastFetchTime = null;
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;