import Staff from '../staff/staff.model.js';
import Session from './session.model.js';
import Organization from '../organization/organization.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/tokenUtils.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const staff = await Staff.findOne({ email }).select('+password');
  if (!staff) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (staff.status !== 'active') {
    throw new ApiError(403, 'Your account has been deactivated or suspended');
  }

  const isMatch = await staff.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Generate tokens
  const payload = { id: staff._id, role: staff.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store Session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await Session.create({
    userId: staff._id,
    refreshToken,
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
    expiresAt
  });

  // Set refreshToken in cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  staff.lastLogin = new Date();
  await staff.save();

  await staff.populate('branchId');

  // Omit password from output
  const user = staff.toObject();
  delete user.password;

  res.status(200).json(
    new ApiResponse(200, 'Login successful', {
      accessToken,
      user
    })
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new ApiError(401, 'Refresh token not found');
  }

  try {
    const decoded = verifyRefreshToken(token);
    
    // Find session in database
    const session = await Session.findOne({ userId: decoded.id, refreshToken: token });
    if (!session) {
      throw new ApiError(403, 'Session expired or invalid refresh token');
    }

    // Delete old session
    await session.deleteOne();

    const staff = await Staff.findById(decoded.id);
    if (!staff || staff.status !== 'active') {
      throw new ApiError(403, 'Account is inactive or suspended');
    }

    // Generate new pair
    const payload = { id: staff._id, role: staff.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Save new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Session.create({
      userId: staff._id,
      refreshToken: newRefreshToken,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(
      new ApiResponse(200, 'Token refreshed successfully', {
        accessToken: newAccessToken
      })
    );
  } catch (error) {
    throw new ApiError(403, 'Invalid or expired refresh token');
  }
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  
  if (token) {
    await Session.deleteOne({ refreshToken: token });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  });

  res.status(200).json(new ApiResponse(200, 'Logout successful'));
});

export const getProfile = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.user._id).populate('branchId');
  res.status(200).json(new ApiResponse(200, 'Profile retrieved successfully', staff));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const staff = await Staff.findOne({ email });
  if (!staff) {
    // For security reasons, don't leak whether the account exists
    return res.status(200).json(new ApiResponse(200, 'If email exists in system, a reset link will be logged'));
  }

  // Generate reset token
  const resetToken = Math.random().toString(36).slice(-8); // simple reset pin
  staff.resetPasswordToken = resetToken;
  staff.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await staff.save();

  // Log it to console for demonstration
  console.log(`[PASSWORD RESET PIN FOR USER ${email}]: ${resetToken}`);

  res.status(200).json(new ApiResponse(200, `Reset token generated successfully. For development, it has been logged to console. Token: ${resetToken}`));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    throw new ApiError(400, 'Email, token and new password are required');
  }

  const staff = await Staff.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!staff) {
    throw new ApiError(400, 'Invalid token or token expired');
  }

  staff.password = newPassword;
  staff.resetPasswordToken = undefined;
  staff.resetPasswordExpires = undefined;
  await staff.save();

  // Clear all sessions for security
  await Session.deleteMany({ userId: staff._id });

  res.status(200).json(new ApiResponse(200, 'Password reset successful. Please login with your new password.'));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  const staff = await Staff.findById(req.user._id).select('+password');
  const isMatch = await staff.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Incorrect current password');
  }

  staff.password = newPassword;
  await staff.save();

  res.status(200).json(new ApiResponse(200, 'Password changed successfully'));
});
