import axios from 'axios';

/**
 * Sends a real SMS to the staff's mobile number via Fast2SMS SMS Gateway.
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
    // Fast2SMS V2 OTP API Call
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${otp}&flash=0&numbers=${cleanPhone}`;
    const response = await axios.get(url);

    console.log(`✅ [REAL SMS DELIVERED TO ${cleanPhone}] Fast2SMS Response:`, response.data);
    return { success: true, mode: 'real', response: response.data };
  } catch (error) {
    console.error('❌ [SMS GATEWAY ERROR]:', error.response?.data || error.message);
    
    // Fallback POST try if GET encounters parameters mismatch
    try {
      const fallbackRes = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          variables_values: otp,
          route: 'otp',
          numbers: cleanPhone
        },
        {
          headers: {
            authorization: apiKey
          }
        }
      );
      console.log(`✅ [REAL SMS DELIVERED VIA POST] To ${cleanPhone}:`, fallbackRes.data);
      return { success: true, mode: 'real', response: fallbackRes.data };
    } catch (fallbackErr) {
      console.error('❌ [SMS FALLBACK ERROR]:', fallbackErr.response?.data || fallbackErr.message);
      return { success: false, error: error.message };
    }
  }
};
