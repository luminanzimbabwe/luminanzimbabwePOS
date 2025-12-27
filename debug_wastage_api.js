// Debug script to test wastages API
const axios = require('axios');

async function debugWastageAPI() {
  try {
    console.log('🔍 Testing wastages API...');
    
    // Test wastages summary endpoint
    const summaryResponse = await axios.get('http://localhost:8000/api/v1/shop/wastes/summary/');
    console.log('📊 Wastages Summary Response:', JSON.stringify(summaryResponse.data, null, 2));
    
    // Test wastages list endpoint  
    const listResponse = await axios.get('http://localhost:8000/api/v1/shop/wastes/');
    console.log('📋 Wastages List Response:', JSON.stringify(listResponse.data, null, 2));
    
    // Parse the data structure
    const summaryData = summaryResponse.data;
    const listData = listResponse.data;
    
    console.log('🔍 Summary data structure:', {
      hasSuccess: !!summaryData.success,
      hasSummary: !!summaryData.summary,
      summaryFields: summaryData.summary ? Object.keys(summaryData.summary) : null
    });
    
    console.log('🔍 List data structure:', {
      hasSuccess: !!listData.success,
      hasWastes: !!listData.wastes,
      wasteCount: listData.wastes ? listData.wastes.length : 0
    });
    
    // Calculate what the frontend should display
    const wastagesImpact = {
      totalCost: summaryData.summary?.total_waste_value || 0,
      totalItems: summaryData.summary?.waste_count || 0,
      details: listData.wastes ? listData.wastes.slice(0, 5) : []
    };
    
    console.log('💰 Calculated wastages impact:', wastagesImpact);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('📡 Response status:', error.response.status);
      console.error('📡 Response data:', error.response.data);
    }
  }
}

debugWastageAPI();