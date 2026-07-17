import { verifyAccessToken } from '../utils/tokenUtils.js';
import Staff from '../modules/staff/staff.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Unauthorized access: No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await Staff.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'Unauthorized access: User not found');
    }

    if (user.status !== 'active') {
      throw new ApiError(403, 'Your account is deactivated or suspended');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Unauthorized access: Invalid or expired token');
  }
});
