import ApiError from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/\"/g, ''),
    }));
    throw new ApiError(400, 'Validation failed', errors);
  }

  next();
};
