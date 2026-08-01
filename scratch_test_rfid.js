import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './server/src/modules/staff/staff.model.js';

dotenv.config({ path: './server/.env' });

async function testRfidSave() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const staff = await Staff.findOne({ isDeleted: { $ne: true } });
    if (!staff) {
      console.log('No staff found');
      return;
    }

    console.log('Current Staff:', staff.firstName, staff.lastName, 'rfidCard:', staff.rfidCard);

    // Test saving RFID card
    const testCard = '0007373474';
    staff.rfidCard = testCard;
    await staff.save();

    console.log('Saved Staff RFID Card:', staff.rfidCard);

    // Re-query from DB to verify persistence
    const reQueried = await Staff.findById(staff._id);
    console.log('Re-queried Staff rfidCard from MongoDB:', reQueried.rfidCard);

    if (reQueried.rfidCard === testCard) {
      console.log('✅ SUCCESS: rfidCard is successfully persisted in MongoDB!');
    } else {
      console.log('❌ FAIL: rfidCard was NOT persisted');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testRfidSave();
