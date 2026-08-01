import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './src/modules/staff/staff.model.js';

dotenv.config({ path: './.env' });

async function testRfidSave() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected successfully');

    const staff = await Staff.findOne({ isDeleted: { $ne: true } });
    if (!staff) {
      console.log('No staff found');
      return;
    }

    console.log('Target Staff:', staff.firstName, staff.lastName, 'Old rfidCard:', staff.rfidCard);

    // Save test RFID
    const testCard = '0007373474';
    staff.rfidCard = testCard;
    await staff.save();

    console.log('Saved in memory:', staff.rfidCard);

    // Re-fetch from MongoDB database
    const freshStaff = await Staff.findById(staff._id);
    console.log('Re-fetched from MongoDB:', freshStaff.rfidCard);

    if (freshStaff.rfidCard === testCard) {
      console.log('✅ TEST PASSED: RFID Card is saved and persisted in MongoDB!');
    } else {
      console.log('❌ TEST FAILED!');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testRfidSave();
