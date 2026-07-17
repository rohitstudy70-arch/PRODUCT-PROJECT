export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  STORE_MANAGER: 'store_manager',
  SECURITY_GUARD: 'security_guard',
  STAFF: 'staff'
};

export const PRODUCT_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  MISSING: 'missing',
  SCRAPPED: 'scrapped'
};

export const TRANSFER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PREPARING: 'preparing',
  READY: 'ready_for_dispatch',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

export const QR_ENTITY_TYPES = {
  STAFF: 'staff',
  PRODUCT: 'product'
};

export const SCAN_TYPES = {
  EXIT: 'exit',
  ENTRY: 'entry'
};

export const SCAN_RESULTS = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
};
