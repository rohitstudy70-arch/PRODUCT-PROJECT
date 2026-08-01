import axios from 'axios';

/**
 * Sends a real SMS to the staff's mobile SIM card via Fast2SMS SMS Gateway.
 * Uses ONLY Smart OTP route (₹0.20 per SMS). No Quick SMS fallback.
 */
export const sendSMS = async (phone, otp, staffName = 'Staff') => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

  if (!apiKey || apiKey.includes('your_fast2sms')) {
    console.log(`📱 [FAST2SMS DEMO MODE] SMS to ${cleanPhone}: OTP ${otp}`);
    return { success: true, mode: 'mock', message: 'Demo mode active. Add FAST2SMS_API_KEY in .env for real SMS' };
  }

  try {
    // Fast2SMS Smart OTP API (route=otp) — ₹0.20 (20 paise) per SMS
    // NO Quick SMS fallback — we NEVER want ₹5 charges
    const otpUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=otp&variables_values=${encodeURIComponent(otp)}&numbers=${cleanPhone}`;

    let responseData;
    if (typeof fetch !== 'undefined') {
      const res = await fetch(otpUrl);
      responseData = await res.json();
    } else {
      const res = await axios.get(otpUrl);
      responseData = res.data;
    }

    if (responseData.return === true || responseData.status_code === 200) {
      console.log(`✅ [FAST2SMS OTP DELIVERED @ ₹0.20] Sent to ${cleanPhone}! Response:`, responseData);
      return { success: true, mode: 'real', route: 'otp', cost: '₹0.20', response: responseData };
    } else {
      console.warn(`⚠️ [FAST2SMS OTP ROUTE RESPONSE]: ${responseData.message || JSON.stringify(responseData)}`);
      // DO NOT fallback to Quick SMS (₹5) — return error instead
      return {
        success: false,
        mode: 'fast2sms_otp_failed',
        message: responseData.message || 'Smart OTP route failed. Check Fast2SMS dashboard: enable OTP template under Smart OTP section.',
        responseData
      };
    }
  } catch (error) {
    console.error('❌ [FAST2SMS GATEWAY ERROR]:', error.message || error);
    return { success: false, error: error.message };
  }
};
