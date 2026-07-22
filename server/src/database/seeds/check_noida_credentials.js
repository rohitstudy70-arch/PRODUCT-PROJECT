import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const noidaBranch = await mongoose.connection.collection('branches').findOne({
    $or: [
      { code: 'NOI' },
      { name: { $regex: 'noida', $options: 'i' } }
    ]
  });

  console.log('--- NOIDA BRANCH DETAILS ---');
  console.log(noidaBranch);

  if (noidaBranch) {
    const noidaStaff = await mongoose.connection.collection('staffs').find({
      $or: [
        { branchId: noidaBranch._id },
        { email: { $regex: 'noida', $options: 'i' } }
      ]
    }).toArray();

    console.log('\n--- NOIDA STAFF ACCOUNTS ---');
    noidaStaff.forEach(s => {
      console.log(`- Name: ${s.firstName} ${s.lastName} | Email: ${s.email} | Role: ${s.role} | EmpID: ${s.employeeId} | Status: ${s.status}`);
    });
  } else {
    console.log('No Noida branch found');
  }

  process.exit(0);
}

run();
