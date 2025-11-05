
import axios from 'axios';

// Helper to call arbitrary AVEVAPI URL and parse latest value
export async function callAvevApiUrl(apiUrl) {
  try {
    console.log(`🌐 Fetching: ${apiUrl}`);
    const response = await axios.get(apiUrl, {
      timeout: 4000, // 4s timeout
      maxContentLength: 102400, // 100KB max
      headers: { 'Accept': 'application/json' }
    });
    if (response.status !== 200 || !response.data) {
      throw new Error('Invalid response');
    }
    const data = response.data;
    console.log(`📊 Raw API Response:`, JSON.stringify(data, null, 2));

    // Assume data is array of {v0, v1} or nested
    let series = Array.isArray(data) ? data : [];
    if (!Array.isArray(data) && typeof data === 'object') {
      // Try to find array in data (e.g., data.series or first array value)
      const keys = Object.keys(data);
      console.log(`🔑 Object keys:`, keys);
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          console.log(`📋 Found array at key "${key}" with ${data[key].length} items`);
          series = data[key];
          break;
        }
      }
    }
    console.log(`📈 Series length: ${series.length}`);
    if (series.length > 0) {
      console.log(`📋 First item:`, series[0]);
      console.log(`📋 Last item:`, series[series.length - 1]);
    }

    if (!series.length) throw new Error('No series found');
    // Find latest valid point - search from end for valid v1 value
    let latest = null;
    for (let i = series.length - 1; i >= 0; i--) {
      const d = series[i];
      if (d.v1 !== null && d.v1 !== undefined && d.v1 !== 'No Data') {
        latest = d;
        break;
      }
    }
    console.log(`🎯 Latest value:`, latest);
    if (!latest) throw new Error('No valid latest value');
    return latest;
  } catch (error) {
    console.error(`❌ callAvevApiUrl error:`, error.message);
    throw new Error(`API call failed: ${error.message}`);
  }
}

