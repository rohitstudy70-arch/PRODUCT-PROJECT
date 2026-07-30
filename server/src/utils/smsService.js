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
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=q&message=${encodeURIComponent(`Your Arshi ERP Gate Verification OTP for ${staffName} is ${otp}. Valid for 10 minutes.`)}&flash=0&numbers=${cleanPhone}`;
    
    let responseData;
    if (typeof fetch !== 'undefined') {
      const res = await fetch(url);
      responseData = await res.json();
    } else {
      const res = await axios.get(url);
      responseData = res.data;
    }

    // Check Fast2SMS status code
    if (responseData.return === true || responseData.status_code === 200) {
      console.log(`✅ [REAL SMS DELIVERED TO ${cleanPhone}] Fast2SMS Response:`, responseData);
      return { success: true, mode: 'real', response: responseData };
    } else {
      console.warn(`⚠️ [FAST2SMS GATEWAY NOTICE]: ${responseData.message || 'Fast2SMS returned restriction'}`);
      return {
        success: false,
        mode: 'restricted',
        message: responseData.message || 'Fast2SMS API requires ₹100 add credit to activate real SMS sending',
        responseData
      };
    }
  } catch (error) {
    console.error('❌ [SMS GATEWAY ERROR]:', error.message || error);
    return { success: false, error: error.message };
  }
};
