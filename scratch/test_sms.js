import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), 'server/.env'), 'utf8');
const match = envContent.match(/FAST2SMS_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

const testPhone = '9709846929';
const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

async function sendTestSMS() {
  console.log(`Sending Real SMS OTP (${testOtp}) to Staff SIM (${testPhone})...`);
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent(`Your Arshi ERP Gate Verification OTP for Staff is ${testOtp}. Valid for 10 minutes.`)}&flash=0&numbers=${testPhone}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('\n✅ Fast2SMS Live Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

sendTestSMS();
