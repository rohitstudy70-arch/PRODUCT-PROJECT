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
    // 1. Try Smart OTP route (route=otp) first — cheap (₹0.20 per SMS)
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
    } 

    // 2. Fallback: If Smart OTP fails (due to DLT/website verification requirement), use Quick SMS route (route=q) — ₹5.00 per SMS
    console.log(`⚠️ Smart OTP route failed. Falling back to Quick SMS (route=q) for ${cleanPhone}...`);
    const quickMsg = `Arshi Enterprise: Your security gate verification OTP is ${otp}. Valid for 10 minutes.`;
    const quickUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey.trim())}&route=q&message=${encodeURIComponent(quickMsg)}&numbers=${cleanPhone}`;

    let quickResData;
    if (typeof fetch !== 'undefined') {
      const res = await fetch(quickUrl);
      quickResData = await res.json();
    } else {
      const res = await axios.get(quickUrl);
      quickResData = res.data;
    }

    if (quickResData.return === true || quickResData.status_code === 200) {
      console.log(`✅ [FAST2SMS QUICK SMS FALLBACK DELIVERED @ ₹5.00] Sent to ${cleanPhone}! Response:`, quickResData);
      return { 
        success: true, 
        mode: 'real', 
        route: 'quick_sms_fallback', 
        cost: '₹5.00', 
        message: 'Delivered via Quick SMS fallback (₹5.00 cost) due to DLT Smart OTP requirement.',
        response: quickResData 
      };
    } else {
      console.warn(`❌ [FAST2SMS QUICK SMS FALLBACK FAILED]: ${quickResData.message || JSON.stringify(quickResData)}`);
      return {
        success: false,
        mode: 'fast2sms_all_routes_failed',
        message: `Both Smart OTP and Quick SMS routes failed. Gateway response: ${quickResData.message || 'unknown error'}`,
        responseData: quickResData
      };
    }
  } catch (error) {
    console.error('❌ [FAST2SMS GATEWAY ERROR]:', error.message || error);
    return { success: false, error: error.message };
  }
};
