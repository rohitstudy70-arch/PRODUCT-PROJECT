import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const noidaBranch = await mongoose.connection.collection('branches').findOne({ code: 'NOI' });
  const org = await mongoose.connection.collection('organizations').findOne({});

  if (!noidaBranch || !org) {
    console.log('Noida branch or org not found');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  // Check if noida staff exists
  let staff = await mongoose.connection.collection('staffs').findOne({ email: 'noida.admin@arshi.com' });

  if (staff) {
    await mongoose.connection.collection('staffs').updateOne(
      { _id: staff._id },
      {
        $set: {
          password: hashedPassword,
          branchId: noidaBranch._id,
          role: 'branch_admin',
          status: 'active'
        }
      }
    );
    console.log('UPDATED NOIDA ADMIN ACCOUNT');
  } else {
    // Get sequence
    const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
      { name: 'employee' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const seq = counter.value ? counter.value.seq : 100;
    const employeeId = `EMP${String(seq).padStart(5, '0')}`;

    staff = await mongoose.connection.collection('staffs').insertOne({
      organizationId: org._id,
      branchId: noidaBranch._id,
      firstName: 'Noida',
      lastName: 'Admin',
      email: 'noida.admin@arshi.com',
      password: hashedPassword,
      phone: noidaBranch.phone || '+919534904148',
      role: 'branch_admin',
      employeeId,
      qrCode: 'noida-admin-qr-' + Date.now(),
      status: 'active',
      dutyStatus: 'OFF_DUTY',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('CREATED NEW NOIDA ADMIN ACCOUNT');
  }

  const noidaStaff = await mongoose.connection.collection('staffs').findOne({ email: 'noida.admin@arshi.com' });
  console.log('NOIDA ADMIN CREATED/UPDATED SUCCESSFUL:');
  console.log(`- Email: ${noidaStaff.email}`);
  console.log(`- Password: Admin@123`);
  console.log(`- Employee ID: ${noidaStaff.employeeId}`);
  console.log(`- Role: ${noidaStaff.role}`);
  console.log(`- Branch ID: ${noidaStaff.branchId}`);

  process.exit(0);
}

run();
