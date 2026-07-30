/**
 * Sends a real SMS to the staff's mobile number via Fast2SMS SMS Gateway.
 * Uses native fetch (Node 18+) with zero external dependencies.
 */
export const sendSMS = async (phone, otp, staffName = 'Staff') => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

  if (!apiKey || apiKey.includes('your_fast2sms')) {
    console.log(`📱 [SMS SERVICE - DEMO MODE] Real SMS API Key not configured in .env.`);
    console.log(`📱 [SMS SENT TO ${cleanPhone}] OTP: ${otp}`);
    return { success: true, mode: 'mock', message: 'Demo mode active.' };
  }

  try {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=otp&variables_values=${otp}&flash=0&numbers=${cleanPhone}`;
    
    let responseData;
    // Use native fetch (Node.js 18+ built-in)
    if (typeof fetch !== 'undefined') {
      const res = await fetch(url);
      responseData = await res.json();
    } else {
      const axios = (await import('axios')).default;
      const res = await axios.get(url);
      responseData = res.data;
    }

    console.log(`✅ [REAL SMS DELIVERED TO ${cleanPhone}] Fast2SMS Response:`, responseData);
    return { success: true, mode: 'real', response: responseData };
  } catch (error) {
    console.error('❌ [SMS GATEWAY ERROR]:', error.message || error);
    return { success: false, error: error.message };
  }
};
