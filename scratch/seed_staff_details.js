import mongoose from '../server/node_modules/mongoose/index.js';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'server/.env' });

import Staff from '../server/src/modules/staff/staff.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function seedStaffDetails() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const staffMembers = await Staff.find({ isDeleted: { $ne: true } });
    console.log(`Found ${staffMembers.length} staff members.`);

    const sampleFathers = ['Ramesh Kumar', 'Suresh Prasad', 'Rajendra Sharma', 'Mahesh Singh', 'Binod Verma'];
    const sampleDistricts = ['Purnea', 'Patna', 'Gautam Buddha Nagar', 'Katihar', 'Bhagalpur'];
    
    let updatedCount = 0;
    for (let i = 0; i < staffMembers.length; i++) {
      const s = staffMembers[i];
      let needsSave = false;

      if (!s.fatherName) {
        s.fatherName = sampleFathers[i % sampleFathers.length];
        needsSave = true;
      }
      if (!s.phone) {
        s.phone = `98765${10000 + i}`;
        needsSave = true;
      }
      if (!s.alternatePhone) {
        s.alternatePhone = `98123${10000 + i}`;
        needsSave = true;
      }
      if (!s.aadharNumber) {
        s.aadharNumber = `${4532 + i} 7890 ${1234 + i}`;
        needsSave = true;
      }
      if (!s.panNumber) {
        s.panNumber = `ABCDE${1000 + i}F`;
        needsSave = true;
      }
      if (!s.addressDetails || !s.addressDetails.street) {
        s.addressDetails = {
          street: 'Main Road, Station Chowk',
          district: sampleDistricts[i % sampleDistricts.length],
          state: 'Bihar',
          pincode: '854301'
        };
        needsSave = true;
      }
      if (!s.bloodGroup) {
        s.bloodGroup = 'B+';
        needsSave = true;
      }
      if (!s.emergencyContact) {
        s.emergencyContact = `99887${10000 + i}`;
        needsSave = true;
      }

      if (needsSave) {
        await s.save();
        updatedCount++;
        console.log(`Updated Staff: ${s.firstName} ${s.lastName} (S/O ${s.fatherName}) - Mob: ${s.phone} - Aadhar: ${s.aadharNumber}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} staff records.`);
  } catch (err) {
    console.error('Error seeding staff details:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedStaffDetails();
