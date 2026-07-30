import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), 'server/.env'), 'utf8');
const match = envContent.match(/FAST2SMS_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

const testPhone = '9709846929';
const testOtp = '589214';

async function testAllRoutes() {
  const routes = ['q', 'otp', 'dlt', 'p', 'v3'];
  for (const route of routes) {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=${route}&variables_values=${testOtp}&message=${encodeURIComponent(`OTP ${testOtp}`)}&numbers=${testPhone}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`Route '${route}' Response:`, data);
    } catch (e) {
      console.error(`Route '${route}' Error:`, e.message);
    }
  }
}

testAllRoutes();
