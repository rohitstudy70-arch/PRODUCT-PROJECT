import mongoose from '../server/node_modules/mongoose/index.js';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'server/.env' });

import Product from '../server/src/modules/product/product.model.js';
import Inventory from '../server/src/modules/inventory/inventory.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function syncMissingInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find({ isDeleted: { $ne: true } });
    console.log(`Total active products in database: ${products.length}`);

    let createdCount = 0;
    for (const p of products) {
      const inv = await Inventory.findOne({ productId: p._id });
      if (!inv) {
        await Inventory.create({
          productId: p._id,
          branchId: p.currentBranchId || null,
          status: p.status === 'in_transit' ? 'in_transit' : p.status === 'assigned' ? 'reserved' : 'available',
          assignedTo: p.currentHolderId || null
        });
        createdCount++;
        console.log(`Created inventory record for product: ${p.name} (${p.productId})`);
      }
    }

    console.log(`Successfully synced ${createdCount} missing inventory records!`);
  } catch (err) {
    console.error('Error syncing inventory:', err);
  } finally {
    await mongoose.disconnect();
  }
}

syncMissingInventory();
