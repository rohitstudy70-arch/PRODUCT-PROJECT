import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './src/modules/staff/staff.model.js';

dotenv.config({ path: './.env' });

async function fixRfid() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Find and show all staff with rfidCard assigned
    const staffWithRfid = await Staff.find({ rfidCard: { $ne: null }, isDeleted: { $ne: true } })
      .select('firstName lastName employeeId role rfidCard');
    
    console.log('\n--- All Staff with RFID Cards ---');
    staffWithRfid.forEach(s => {
      console.log(`  ${s.firstName} ${s.lastName} | ${s.employeeId} | Role: ${s.role} | RFID: ${s.rfidCard}`);
    });

    // Remove RFID from Central Admin (it was mistakenly assigned by test script)
    const admin = await Staff.findOne({ role: 'super_admin', rfidCard: '0007373474' });
    if (admin) {
      console.log(`\n⚠️ Found RFID 0007373474 on Central Admin (${admin.firstName} ${admin.lastName}). Removing...`);
      admin.rfidCard = null;
      await admin.save();
      console.log('✅ Removed RFID from Central Admin.');
    } else {
      console.log('\n✅ Central Admin does not have RFID 0007373474.');
    }

    // List all staff members (courier boys / delivery staff)
    const allStaff = await Staff.find({ isDeleted: { $ne: true } })
      .select('firstName lastName employeeId role rfidCard designation');
    
    console.log('\n--- All Staff Members ---');
    allStaff.forEach(s => {
      console.log(`  ${s.firstName} ${s.lastName} | ${s.employeeId} | Role: ${s.role} | Designation: ${s.designation} | RFID: ${s.rfidCard || 'NONE'}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixRfid();
