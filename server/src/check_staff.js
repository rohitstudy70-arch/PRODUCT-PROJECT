import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const staffSchema = new mongoose.Schema({}, { strict: false });
const Staff = mongoose.model('Staff', staffSchema, 'staffs');

async function checkStaff() {
  await mongoose.connect(process.env.MONGODB_URI);
  const staffList = await Staff.find({}).lean();
  console.log('--- ALL STAFF MEMBERS IN DB ---');
  staffList.forEach(s => {
    console.log(`ID: ${s._id} | Name: ${s.firstName} ${s.lastName} | Email: ${s.email} | Phone: ${s.phone} | AltPhone: ${s.alternatePhone}`);
  });
  await mongoose.disconnect();
}

checkStaff();
