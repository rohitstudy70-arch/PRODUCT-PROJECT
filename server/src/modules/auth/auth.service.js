import crypto from 'crypto';
import Staff from '../staff/staff.model.js';
import Session from './session.model.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/token.utils.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

class AuthService {
  static async login(email, password) {
    const staff = await Staff.findOne({ email }).select('+password');
    if (!staff) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (staff.status !== 'active') {
      throw new ApiError(403, 'Account is not active. Please contact administrator');
    }

    const isPasswordValid = await staff.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const tokenPayload = { id: staff._id, role: staff.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await Session.create({
      userId: staff._id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    staff.lastLogin = new Date();
    await staff.save({ validateBeforeSave: false });

    const user = staff.toObject();
    delete user.password;

    return { accessToken, refreshToken, user };
  }

  static async refreshToken(token) {
    const decoded = verifyRefreshToken(token);

    const session = await Session.findOne({
      userId: decoded.id,
      refreshToken: token
    });

    if (!session) {
      throw new ApiError(401, 'Invalid refresh token. Please login again');
    }

    await Session.deleteOne({ _id: session._id });

    const tokenPayload = { id: decoded.id, role: decoded.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await Session.create({
      userId: decoded.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken };
  }

  static async logout(userId) {
    await Session.deleteMany({ userId });
    logger.info(`All sessions deleted for user: ${userId}`);
  }

  static async forgotPassword(email) {
    const staff = await Staff.findOne({ email });
    if (!staff) {
      throw new ApiError(404, 'No account found with this email');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    staff.resetPasswordToken = hashedToken;
    staff.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await staff.save({ validateBeforeSave: false });

    logger.info(`Password reset token generated for: ${email}`);

    return resetToken;
  }

  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const staff = await Staff.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!staff) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    staff.password = newPassword;
    staff.resetPasswordToken = undefined;
    staff.resetPasswordExpires = undefined;
    await staff.save();

    await Session.deleteMany({ userId: staff._id });
    logger.info(`Password reset successful for user: ${staff._id}`);
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const staff = await Staff.findById(userId).select('+password');
    if (!staff) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await staff.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    staff.password = newPassword;
    await staff.save();

    await Session.deleteMany({ userId });
    logger.info(`Password changed for user: ${userId}`);
  }

  static async getProfile(userId) {
    const staff = await Staff.findById(userId)
      .populate('branchId')
      .populate('organizationId');

    if (!staff) {
      throw new ApiError(404, 'User not found');
    }

    return staff;
  }
}

export default AuthService;
