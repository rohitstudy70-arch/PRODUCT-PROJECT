import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().required().email().lowercase().trim(),
  password: Joi.string().required().min(6)
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().required().email().lowercase().trim()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().required().min(8)
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(8)
});
