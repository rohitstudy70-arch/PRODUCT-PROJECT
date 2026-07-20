import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const purnea = await mongoose.connection.collection('branches').findOne({ code: 'PRN' });
  console.log('Purnea Branch ID:', purnea._id);

  // Update all staff named Sunil or containing Sunil to be active and linked to Purnea if branchId is null
  const res = await mongoose.connection.collection('staffs').updateMany(
    { 
      $or: [
        { firstName: { $regex: 'sunil', $options: 'i' } },
        { lastName: { $regex: 'sunil', $options: 'i' } }
      ] 
    },
    { $set: { branchId: purnea._id, status: 'active' } }
  );

  console.log('UPDATE SUNIL RESULT:', res);

  const updatedSunils = await mongoose.connection.collection('staffs').find({
    $or: [
      { firstName: { $regex: 'sunil', $options: 'i' } },
      { lastName: { $regex: 'sunil', $options: 'i' } }
    ]
  }).toArray();

  console.log('UPDATED SUNIL STAFF MEMBERS:');
  updatedSunils.forEach(s => {
    console.log(`- ${s.firstName} ${s.lastName} | Email: ${s.email} | BranchID: ${s.branchId}`);
  });

  process.exit(0);
}

run();
