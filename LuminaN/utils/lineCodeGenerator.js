// Geographic Line Code Generator for LuminaN
// Format: XX-YYY-ZZZZ (Country-City-Product Number)

const REGION_CODES = {
  // Africa
  'Zimbabwe': 'ZW',
  'Kenya': 'KE', 
  'Nigeria': 'NG',
  'South Africa': 'ZA',
  'Ghana': 'GH',
  'Uganda': 'UG',
  'Tanzania': 'TZ',
  'Ethiopia': 'ET',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Libya': 'LY',
  'Sudan': 'SD',
  'Rwanda': 'RW',
  'Burundi': 'BI',
  'Mozambique': 'MZ',
  'Zambia': 'ZM',
  'Botswana': 'BW',
  'Namibia': 'NA',
  'Angola': 'AO',
  'Democratic Republic of Congo': 'CD',
  'Cameroon': 'CM',
  'Ivory Coast': 'CI',
  'Senegal': 'SN',
  'Mali': 'ML',
  'Niger': 'NE',
  'Chad': 'TD',
  'Central African Republic': 'CF',
  'Republic of the Congo': 'CG',
  'Gabon': 'GA',
  'Equatorial Guinea': 'GQ',
  'Sao Tome and Principe': 'ST',
  'Cape Verde': 'CV',
  'Guinea-Bissau': 'GW',
  'Guinea': 'GN',
  'Sierra Leone': 'SL',
  'Liberia': 'LR',
  'Mauritania': 'MR',
  'Western Sahara': 'EH',
  'Lesotho': 'LS',
  'Swaziland': 'SZ',
  'Madagascar': 'MG',
  'Mauritius': 'MU',
  'Comoros': 'KM',
  'Seychelles': 'SC',
  'Djibouti': 'DJ',
  'Eritrea': 'ER',
  'Somalia': 'SO',
  'South Sudan': 'SS',
  'Malawi': 'MW',
  'Burkina Faso': 'BF',
  'Benin': 'BJ',
  'Togo': 'TG',
  'Gambia': 'GM',
  'Guinea': 'GN',
  'Tunisia': 'TN',
  
  // Other regions
  'United Kingdom': 'UK',
  'United States': 'US',
  'Canada': 'CA',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'India': 'IN',
  'China': 'CN',
  'Japan': 'JP',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Mexico': 'MX'
};

const CITY_CODES = {
  // Zimbabwe
  'Harare': 'HAR',
  'Bulawayo': 'BUL', 
  'Marondera': 'MAR',
  'Mutare': 'MUT',
  'Gweru': 'GWE',
  'Kwekwe': 'KWE',
  'Kadoma': 'KAD',
  'Masvingo': 'MAS',
  'Chinhoyi': 'CHI',
  'Bindura': 'BIN',
  'Zvishavane': 'ZVI',
  'Hwange': 'HWA',
  'Victoria Falls': 'VFA',
  'Murehwa': 'MUR',
  'Chitungwiza': 'CHI2',
  'Ruwa': 'RUW',
  'Mabvuku': 'MAB',
  'Tynwald': 'TYN',
  'Greencroft': 'GRE',
  'Newlands': 'NEW',
  'Avondale': 'AVO',
  'Mount Pleasant': 'MPL',
  'Borrowdale': 'BOR',
  'Hatcliffe': 'HAT',
  'Mabvuku': 'MAB2',
  'Glen View': 'GLV',
  'Highlands': 'HIG',
  'Mabelreign': 'MAB3',
  'Southerton': 'SOU',
  'Graniteside': 'GRA',
  
  // Kenya
  'Nairobi': 'NAI',
  'Mombasa': 'MOM',
  'Kisumu': 'KIS',
  'Nakuru': 'NAK',
  'Eldoret': 'ELD',
  
  // Nigeria
  'Lagos': 'LAG',
  'Abuja': 'ABU',
  'Port Harcourt': 'POR',
  'Kano': 'KAN',
  'Ibadan': 'IBA',
  
  // South Africa
  'Cape Town': 'CPT',
  'Johannesburg': 'JNB',
  'Durban': 'DUR',
  'Pretoria': 'PTA',
  'Port Elizabeth': 'PLZ',
  
  // Other African Cities
  'Accra': 'ACC', // Ghana
  'Lusaka': 'LUS', // Zambia
  'Harare': 'HAR', // Zimbabwe
  'Kampala': 'KAM', // Uganda
  'Dar es Salaam': 'DAR', // Tanzania
  'Addis Ababa': 'ADD', // Ethiopia
  'Cairo': 'CAI', // Egypt
  'Casablanca': 'CAS', // Morocco
  'Algiers': 'ALG', // Algeria
  'Tunis': 'TUN', // Tunisia
  'Dakar': 'DAK', // Senegal
  'Bamako': 'BAM', // Mali
  'Abidjan': 'ABI', // Ivory Coast
  'Douala': 'DOU', // Cameroon
  'Luanda': 'LUA', // Angola
  'Kinshasa': 'KIN', // DRC
  'Brazzaville': 'BRA', // Republic of Congo
  'Libreville': 'LIB', // Gabon
  'Yaounde': 'YAO', // Cameroon
  'Nouakchott': 'NOU', // Mauritania
  'Freetown': 'FRE', // Sierra Leone
  'Monrovia': 'MON', // Liberia
  'Banjul': 'BAN', // Gambia
  'Conakry': 'CON', // Guinea
  'Nouakchott': 'NOU', // Mauritania
  'Windhoek': 'WIN', // Namibia
  'Gaborone': 'GAB', // Botswana
  'Maseru': 'MAS2', // Lesotho
  'Mbabane': 'MBA', // Swaziland
  'Port Louis': 'PLU', // Mauritius
  'Antananarivo': 'ANT', // Madagascar
  'Victoria': 'VIC', // Seychelles
  
  // International
  'London': 'LDN',
  'New York': 'NYC',
  'Los Angeles': 'LAX',
  'Toronto': 'TOR',
  'Sydney': 'SYD',
  'Melbourne': 'MEL',
  'Auckland': 'AKL',
  'Mumbai': 'MUM',
  'Delhi': 'DEL',
  'Beijing': 'BEJ',
  'Shanghai': 'SHA',
  'Tokyo': 'TOK',
  'Berlin': 'BER',
  'Paris': 'PAR',
  'Rome': 'ROM',
  'Madrid': 'MAD',
  'São Paulo': 'SAO',
  'Buenos Aires': 'BUE',
  'Mexico City': 'MEX'
};

class LineCodeGenerator {
  constructor() {
    this.lastCodes = new Map(); // Store last used codes per location
  }

  /**
   * Generate a geographic line code
   * @param {string} country - Country name
   * @param {string} city - City name  
   * @param {number} productNumber - Sequential product number (optional)
   * @returns {string} Line code in format XX-YYY-ZZZZ
   */
  generateLineCode(country, city, productNumber = null) {
    // Get country code
    const countryCode = this.getCountryCode(country);
    if (!countryCode) {
      throw new Error(`Country "${country}" not supported. Please check REGION_CODES.`);
    }

    // Get city code
    const cityCode = this.getCityCode(city);
    if (!cityCode) {
      throw new Error(`City "${city}" not supported. Please check CITY_CODES.`);
    }

    // Get product number (sequential if not provided)
    const prodNumber = productNumber || this.getNextProductNumber(countryCode, cityCode);

    // Format: XX-YYY-ZZZZ
    return `${countryCode}-${cityCode}-${prodNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Get country code
   */
  getCountryCode(country) {
    const normalized = country.trim().toLowerCase();
    for (const [key, value] of Object.entries(REGION_CODES)) {
      if (key.toLowerCase() === normalized) {
        return value;
      }
    }
    return null;
  }

  /**
   * Get city code  
   */
  getCityCode(city) {
    const normalized = city.trim().toLowerCase();
    for (const [key, value] of Object.entries(CITY_CODES)) {
      if (key.toLowerCase() === normalized) {
        return value;
      }
    }
    return null;
  }

  /**
   * Get next sequential product number for location
   */
  getNextProductNumber(countryCode, cityCode) {
    const locationKey = `${countryCode}-${cityCode}`;
    const currentNumber = this.lastCodes.get(locationKey) || 0;
    const nextNumber = currentNumber + 1;
    this.lastCodes.set(locationKey, nextNumber);
    return nextNumber;
  }

  /**
   * Parse line code to get location info
   */
  parseLineCode(lineCode) {
    const parts = lineCode.split('-');
    if (parts.length !== 3) {
      throw new Error('Invalid line code format. Expected: XX-YYY-ZZZZ');
    }

    const [countryCode, cityCode, productNumber] = parts;
    return {
      countryCode,
      cityCode,
      productNumber: parseInt(productNumber, 10),
      locationKey: `${countryCode}-${cityCode}`
    };
  }

  /**
   * Check if line code is valid format
   */
  isValidLineCode(lineCode) {
    try {
      this.parseLineCode(lineCode);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported countries
   */
  getSupportedCountries() {
    return Object.keys(REGION_CODES);
  }

  /**
   * Get all supported cities
   */
  getSupportedCities(country = null) {
    if (!country) {
      return Object.keys(CITY_CODES);
    }
    
    // For simplicity, return all cities for now
    // In production, you might want to filter by country
    return Object.keys(CITY_CODES);
  }

  /**
   * Auto-detect location from shop info
   */
  autoDetectLocation(shopInfo) {
    // Try to extract from shop address or name
    const address = (shopInfo.address || '').toLowerCase();
    const name = (shopInfo.name || '').toLowerCase();
    
    // Look for city names in address
    for (const [city, code] of Object.entries(CITY_CODES)) {
      if (address.includes(city.toLowerCase())) {
        // Try to determine country from address or use default
        let country = 'Zimbabwe'; // Default to Zimbabwe
        if (address.includes('kenya') || address.includes('nairobi')) country = 'Kenya';
        else if (address.includes('south africa') || address.includes('cape town')) country = 'South Africa';
        else if (address.includes('nigeria') || address.includes('lagos')) country = 'Nigeria';
        else if (address.includes('ghana') || address.includes('accra')) country = 'Ghana';
        else if (address.includes('uk') || address.includes('london')) country = 'United Kingdom';
        else if (address.includes('usa') || address.includes('america') || address.includes('new york')) country = 'United States';
        
        return { country, city };
      }
    }
    
    // Default fallback
    return { country: 'Zimbabwe', city: 'Harare' };
  }
}

// Export singleton instance
export const lineCodeGenerator = new LineCodeGenerator();

// Convenience functions
export const generateLineCode = (country, city, productNumber) => 
  lineCodeGenerator.generateLineCode(country, city, productNumber);

export const parseLineCode = (lineCode) => 
  lineCodeGenerator.parseLineCode(lineCode);

export const isValidLineCode = (lineCode) => 
  lineCodeGenerator.isValidLineCode(lineCode);