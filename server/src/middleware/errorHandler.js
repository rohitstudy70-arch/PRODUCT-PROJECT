import logger from '../config/logger.js';
import ApiResponse from '../utils/ApiResponse.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message = 'Internal Server Error', errors = [] } = err;

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(val => val.message);
  }

  // Mongoose cast error (like invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found. Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered: ${field}. Please use another value.`;
  }

  logger.error(`[${req.method}] ${req.url} - Error ${statusCode}: ${message}`, {
    stack: err.stack,
    errors
  });

  const response = new ApiResponse(statusCode, message, null);
  if (errors.length > 0) response.errors = errors;
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
