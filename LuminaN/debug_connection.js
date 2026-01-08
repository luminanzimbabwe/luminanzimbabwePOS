// Simple debug script to test API connectivity
const axios = require('axios');

async function testConnection() {
  console.log('🔍 Testing API connection...');
  
  try {
    console.log('Testing with http://localhost:8000...');
    const response = await axios.get('http://localhost:8000/api/v1/shop/status/', {
      timeout: 5000,
      headers: {
        'Origin': 'http://localhost:8081'
      }
    });
    
    console.log('✅ SUCCESS! Response:', response.data);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
  } catch (error) {
    console.log('❌ FAILED! Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running on port 8000');
    } else if (error.response) {
      console.log('💡 Server responded with:', error.response.status);
      console.log('💡 Response data:', error.response.data);
    } else {
      console.log('💡 Network error or timeout');
    }
  }
}

testConnection();