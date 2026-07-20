import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const staff = await mongoose.connection.collection('staffs').find({}).toArray();
  console.log('--- ALL STAFF MEMBERS IN DB ---');
  staff.forEach(s => {
    console.log(`ID: ${s._id} | Name: ${s.firstName} ${s.lastName} | Email: ${s.email} | Role: ${s.role} | BranchID: ${s.branchId}`);
  });
  process.exit(0);
}

run();
