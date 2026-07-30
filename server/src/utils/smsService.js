import axios from 'axios';

/**
 * Sends a real SMS to the staff's mobile number.
 * Supports Fast2SMS (India) and generic SMS API gateways via environment variables.
 */
export const sendSMS = async (phone, otp, staffName = 'Staff') => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;

  if (!apiKey) {
    console.log(`📱 [SMS SERVICE - DEMO MODE] Real SMS API Key not configured in .env.`);
    console.log(`📱 [SMS SENT TO ${cleanPhone}] Message: Hello ${staffName}, your Arshi Gate Verification OTP is ${otp}. Valid for 10 mins.`);
    return { success: true, mode: 'mock', message: 'Demo mode active. Add FAST2SMS_API_KEY in .env for real SMS' };
  }

  try {
    // Fast2SMS API call
    const response = await axios.post(
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

    console.log(`✅ [REAL SMS DELIVERED] Sent to ${cleanPhone} via Fast2SMS Gateway:`, response.data);
    return { success: true, mode: 'real', response: response.data };
  } catch (error: any) {
    console.error('❌ [SMS GATEWAY ERROR]:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};
