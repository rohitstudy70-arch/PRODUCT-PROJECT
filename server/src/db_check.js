import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from './modules/staff/staff.model.js';
import Branch from './modules/branch/branch.model.js';

dotenv.config();

const check = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    
    const branches = await Branch.find({});
    console.log('Branches in DB:');
    branches.forEach(b => console.log(`- ${b.name} (${b._id}) code: ${b.code}`));

    const staffList = await Staff.find({}).populate('branchId', 'name code');
    console.log('\nStaff in DB:');
    staffList.forEach(s => {
      console.log(`- ${s.firstName} ${s.lastName} (Role: ${s.role}, EmpID: ${s.employeeId})`);
      console.log(`  Branch:`, s.branchId);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

check();
