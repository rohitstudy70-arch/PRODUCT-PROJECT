import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../../modules/organization/organization.model.js';
import Branch from '../../modules/branch/branch.model.js';
import Staff from '../../modules/staff/staff.model.js';
import ProductCategory from '../../modules/product/productCategory.model.js';
import Product from '../../modules/product/product.model.js';
import Inventory from '../../modules/inventory/inventory.model.js';
import QRCode from '../../modules/qr/qrCode.model.js';
import Counter from '../../utils/counter.model.js';
import logger from '../../config/logger.js';
import crypto from 'crypto';

dotenv.config();

const seed = async () => {
  try {
    logger.info('Connecting to Database for seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Database connected. Clearing existing collections...');

    // Clear collections
    await Counter.deleteMany({});
    await Organization.deleteMany({});
    await Branch.deleteMany({});
    await Staff.deleteMany({});
    await ProductCategory.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await QRCode.deleteMany({});
    
    logger.info('Cleared collections. Seeding Organization...');

    // 1. Seed Organization
    const org = await Organization.create({
      name: 'Arshi Enterprise',
      code: 'ARSHI',
      email: 'contact@arshi.com',
      phone: '+919999988888',
      address: {
        street: '12 Gandhi Maidan Road',
        city: 'Patna',
        state: 'Bihar',
        country: 'India',
        pincode: '800001'
      },
      status: 'active'
    });

    logger.info(`Organization Seeded: ${org.name}. Seeding Branches...`);

    // 2. Seed Branches
    const purneaBranch = await Branch.create({
      organizationId: org._id,
      name: 'Purnea Branch',
      code: 'PRN',
      email: 'purnea@arshi.com',
      phone: '+919999988000',
      address: { street: 'Main Line Bazar Road', city: 'Purnea', state: 'Bihar', country: 'India', pincode: '854301' },
      contactPerson: 'Super Admin',
      status: 'active'
    });

    const patnaBranch = await Branch.create({
      organizationId: org._id,
      name: 'Patna Branch',
      code: 'PATNA',
      email: 'patna@arshi.com',
      phone: '+919999988001',
      address: { street: 'Kankarbagh Colony', city: 'Patna', state: 'Bihar', country: 'India', pincode: '800020' },
      contactPerson: 'Sanjay Singh',
      status: 'active'
    });

    const rajasthanBranch = await Branch.create({
      organizationId: org._id,
      name: 'Rajasthan Branch',
      code: 'RAJ',
      email: 'jaipur@arshi.com',
      phone: '+919999988002',
      address: { street: 'Malviya Nagar', city: 'Jaipur', state: 'Rajasthan', country: 'India', pincode: '302017' },
      contactPerson: 'Rajesh Sharma',
      status: 'active'
    });

    const haryanaBranch = await Branch.create({
      organizationId: org._id,
      name: 'Haryana Branch',
      code: 'HAR',
      email: 'gurugram@arshi.com',
      phone: '+919999988003',
      address: { street: 'DLF Phase 3', city: 'Gurugram', state: 'Haryana', country: 'India', pincode: '122002' },
      contactPerson: 'Amit Yadav',
      status: 'active'
    });

    const delhiBranch = await Branch.create({
      organizationId: org._id,
      name: 'Delhi Branch',
      code: 'DEL',
      email: 'delhi@arshi.com',
      phone: '+919999988004',
      address: { street: 'Connaught Place', city: 'New Delhi', state: 'Delhi', country: 'India', pincode: '110001' },
      contactPerson: 'Vikas Gupta',
      status: 'active'
    });

    const kolkataBranch = await Branch.create({
      organizationId: org._id,
      name: 'Kolkata Branch',
      code: 'KOL',
      email: 'kolkata@arshi.com',
      phone: '+919999988005',
      address: { street: 'Salt Lake Sector 5', city: 'Kolkata', state: 'West Bengal', country: 'India', pincode: '700091' },
      contactPerson: 'Subhasish Roy',
      status: 'active'
    });

    logger.info('Branches Seeded. Seeding Staff Members...');

    // Init employee counter
    await Counter.create({ name: 'employee', seq: 1 });

    // 3. Seed Super Admin (Assigned to main Purnea Branch)
    const superAdmin = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@arshi.com',
      password: 'Admin@123', // Will be hashed on save
      phone: '+919999999999',
      role: 'super_admin',
      employeeId: 'EMP00001',
      status: 'active'
    });

    // Seed Patna Branch Users
    const patnaAdmin = await Staff.create({
      organizationId: org._id,
      branchId: patnaBranch._id,
      firstName: 'Patna',
      lastName: 'Admin',
      email: 'patna.admin@arshi.com',
      password: 'Admin@123',
      phone: '+919876543210',
      role: 'branch_admin',
      employeeId: 'EMP00002',
      status: 'active'
    });

    const patnaMgr = await Staff.create({
      organizationId: org._id,
      branchId: patnaBranch._id,
      firstName: 'Patna Store',
      lastName: 'Manager',
      email: 'patna.mgr@arshi.com',
      password: 'Admin@123',
      phone: '+919876543211',
      role: 'store_manager',
      employeeId: 'EMP00003',
      status: 'active'
    });

    const patnaGuard = await Staff.create({
      organizationId: org._id,
      branchId: patnaBranch._id,
      firstName: 'Patna Security',
      lastName: 'Guard',
      email: 'patna.guard@arshi.com',
      password: 'Admin@123',
      phone: '+919876543212',
      role: 'security_guard',
      employeeId: 'EMP00004',
      status: 'active'
    });

    const patnaStaff = await Staff.create({
      organizationId: org._id,
      branchId: patnaBranch._id,
      firstName: 'Patna Courier',
      lastName: 'Staff',
      email: 'patna.staff@arshi.com',
      password: 'Admin@123',
      phone: '+919876543215',
      role: 'staff',
      employeeId: 'EMP00010',
      status: 'active'
    });

    // Seed Purnea Branch Users (other than Super Admin)
    const purneaAdmin = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Purnea',
      lastName: 'Admin',
      email: 'purnea.admin@arshi.com',
      password: 'Admin@123',
      phone: '+919876543216',
      role: 'branch_admin',
      employeeId: 'EMP00007',
      status: 'active'
    });

    const purneaMgr = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Purnea Store',
      lastName: 'Manager',
      email: 'purnea.mgr@arshi.com',
      password: 'Admin@123',
      phone: '+919876543217',
      role: 'store_manager',
      employeeId: 'EMP00008',
      status: 'active'
    });

    const purneaGuard = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Purnea Security',
      lastName: 'Guard',
      email: 'purnea.guard@arshi.com',
      password: 'Admin@123',
      phone: '+919876543218',
      role: 'security_guard',
      employeeId: 'EMP00009',
      status: 'active'
    });

    // Seed courier Rahul (Assigned to Purnea Branch)
    const courierRahul = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Rahul',
      lastName: 'Kumar',
      email: 'rahul@arshi.com',
      password: 'Admin@123',
      phone: '+919876543213',
      role: 'staff',
      employeeId: 'EMP00005',
      status: 'active'
    });

    // Seed courier Sunil KP (Assigned to Purnea Branch)
    const courierSunil = await Staff.create({
      organizationId: org._id,
      branchId: purneaBranch._id,
      firstName: 'Sunil',
      lastName: 'KP',
      email: 'sunil@arshi.com',
      password: 'Admin@123',
      phone: '+919876543214',
      role: 'staff',
      employeeId: 'EMP00006',
      status: 'active'
    });

    // Update Counter sequence
    await Counter.findOneAndUpdate({ name: 'employee' }, { seq: 10 });

    logger.info('Staff Seeded. Generating Staff QRs...');

    // Generate QRs for staff (representing Org Admin generation)
    const staffMembers = [
      superAdmin, 
      patnaAdmin, 
      patnaMgr, 
      patnaGuard, 
      patnaStaff,
      purneaAdmin, 
      purneaMgr, 
      purneaGuard, 
      courierRahul, 
      courierSunil
    ];
    for (const member of staffMembers) {
      const qrUUID = crypto.randomUUID();
      let branchName = 'Main Head Office';
      if (member.branchId) {
        if (member.branchId.toString() === purneaBranch._id.toString()) {
          branchName = 'Purnea Branch';
        } else {
          branchName = 'Patna Branch';
        }
      }
      const payload = {
        employeeId: member.employeeId,
        name: `${member.firstName} ${member.lastName}`,
        branch: branchName,
        role: member.role,
        status: member.status,
        createdDate: new Date()
      };

      await QRCode.create({
        organizationId: org._id,
        entityType: 'staff',
        entityId: member._id,
        code: qrUUID,
        payload,
        generatedBy: superAdmin._id
      });

      member.qrCode = qrUUID;
      await member.save();
    }

    logger.info('Staff QRs generated. Seeding Product Categories...');

    // 4. Seed Product Categories
    const catGps = await ProductCategory.create({
      organizationId: org._id,
      name: 'GPS Device',
      code: 'GPS',
      prefix: 'GPS',
      description: 'Global Positioning System Tracking Devices'
    });

    const catCam = await ProductCategory.create({
      organizationId: org._id,
      name: 'Camera',
      code: 'CAM',
      prefix: 'CAM',
      description: 'Asset surveillance cameras'
    });

    const catAcc = await ProductCategory.create({
      organizationId: org._id,
      name: 'Accessories',
      code: 'ACC',
      prefix: 'ACC',
      description: 'Cables, mounting stands, power adapters'
    });

    const catSim = await ProductCategory.create({
      organizationId: org._id,
      name: 'SIM Card',
      code: 'SIM',
      prefix: 'SIM',
      description: 'Telemetry SIM cards'
    });

    logger.info('Categories seeded. Seeding Product inventory at Head Office...');

    // Init product category sequences
    await Counter.create({ name: 'GPS', seq: 5 });
    await Counter.create({ name: 'CAM', seq: 0 });
    await Counter.create({ name: 'ACC', seq: 0 });
    await Counter.create({ name: 'SIM', seq: 0 });

    // Seed 5 default products belonging to Head Office (which has no branchId)
    const gpsDevices = [
      { id: 'GPS000001', sn: 'SN980001', imei: 'IMEI9870001' },
      { id: 'GPS000002', sn: 'SN980002', imei: 'IMEI9870002' },
      { id: 'GPS000003', sn: 'SN980003', imei: 'IMEI9870003' },
      { id: 'GPS000004', sn: 'SN980004', imei: 'IMEI9870004' },
      { id: 'GPS000005', sn: 'SN980005', imei: 'IMEI9870005' }
    ];

    for (const item of gpsDevices) {
      const qrUUID = crypto.randomUUID();
      const product = await Product.create({
        organizationId: org._id,
        productId: item.id,
        name: 'Arshi Smart GPS Tracker V2',
        category: catGps._id,
        serialNumber: item.sn,
        imei: item.imei,
        model: 'AR-GPS-V2',
        batch: 'BATCH-2026-07',
        vendor: 'A-Z Electronics India',
        purchaseDate: new Date(),
        status: 'available',
        currentBranchId: purneaBranch._id,
        qrCode: qrUUID
      });

      // Generate product QR Code document
      await QRCode.create({
        organizationId: org._id,
        entityType: 'product',
        entityId: product._id,
        code: qrUUID,
        payload: {
          productId: product.productId,
          serialNumber: product.serialNumber,
          imei: product.imei,
          model: product.model,
          batch: product.batch,
          currentBranch: 'Purnea Branch',
          currentStatus: 'available'
        },
        generatedBy: superAdmin._id
      });

      // Create Inventory Stock Record
      await Inventory.create({
        productId: product._id,
        branchId: purneaBranch._id, // Seed directly under Purnea branch stock
        status: 'available'
      });
    }

    logger.info('Products and stock records seeded successfully.');
    logger.info('========================================================');
    logger.info('SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('Super Admin Credentials:');
    logger.info('Email: admin@arshi.com');
    logger.info('Password: Admin@123');
    logger.info('========================================================');

    await mongoose.disconnect();
    logger.info('Database disconnected.');
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seed();
