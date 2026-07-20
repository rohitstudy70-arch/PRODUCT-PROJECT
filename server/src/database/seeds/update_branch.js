import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await mongoose.connection.collection('branches').updateOne(
    { code: 'PRN' },
    { $set: { name: 'Central Branch (Purnea)' } }
  );
  console.log('UPDATE RESULT:', res);
  const branches = await mongoose.connection.collection('branches').find({}).toArray();
  console.log('BRANCH LIST:', branches.map(b => ({ id: b._id, name: b.name, code: b.code })));
  process.exit(0);
}

run();
