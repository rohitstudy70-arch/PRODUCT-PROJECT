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
    // Short 1-credit message (<70 chars) to prevent multi-part SMS charges on Fast2SMS
    const shortMessage = `Arshi Gate OTP is ${otp}. Valid 10 min.`;
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=otp&variables_values=${encodeURIComponent(otp)}&numbers=${cleanPhone}`;
    const fallbackUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=q&message=${encodeURIComponent(shortMessage)}&flash=0&numbers=${cleanPhone}`;
    
    let responseData;
    if (typeof fetch !== 'undefined') {
      const res = await fetch(url);
      responseData = await res.json();
      if (!responseData.return && !responseData.status_code) {
        // Fallback to short Quick SMS route if OTP route template not configured
        const resFallback = await fetch(fallbackUrl);
        responseData = await resFallback.json();
      }
    } else {
      const res = await axios.get(url);
      responseData = res.data;
      if (!responseData.return && !responseData.status_code) {
        const resFallback = await axios.get(fallbackUrl);
        responseData = resFallback.data;
      }
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
