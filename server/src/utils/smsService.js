import axios from 'axios';

/**
 * Sends a real SMS to the staff's mobile SIM card via Fast2SMS SMS Gateway.
 */
export const sendSMS = async (phone, otp, staffName = 'Staff') => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

  if (!apiKey || apiKey.includes('your_fast2sms')) {
    console.log(`📱 [FAST2SMS DEMO MODE] SMS to ${cleanPhone}: OTP ${otp}`);
    return { success: true, mode: 'mock', message: 'Demo mode active. Add FAST2SMS_API_KEY in .env for real SMS' };
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

    if (responseData.return === true || responseData.status_code === 200) {
      console.log(`✅ [FAST2SMS REAL SMS DELIVERED] Sent to ${cleanPhone}! Response:`, responseData);
      return { success: true, mode: 'real', response: responseData };
    } else {
      console.warn(`⚠️ [FAST2SMS GATEWAY RESPONSE]: ${responseData.message || JSON.stringify(responseData)}`);
      return {
        success: false,
        mode: 'fast2sms_notice',
        message: responseData.message || 'Fast2SMS requirement: Add ₹100 credit on Fast2SMS dashboard to enable SMS',
        responseData
      };
    }
  } catch (error) {
    console.error('❌ [FAST2SMS GATEWAY ERROR]:', error.message || error);
    return { success: false, error: error.message };
  }
};
