const ErrorResponse = require('../utils/helpers/ErrorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console
  if (err.name !== 'ValidationError') {
    // console.log(err);
    // console.log(err.name);
  }
  // validation error
  if (err.name === 'ValidationError') {
    // const message = Object.values(err.errors).map(val => val.message);
    const message = `${err.message}`;
    error = new ErrorResponse(message, 400);
  }
  // JWT Token Expired Error
  if (err.name === 'TokenExpiredError') {
    const message = `${err.message}`;
    error = new ErrorResponse(message, 403);
  }
  // JWT Token Authorization Error
  if (err.name === 'AuthorizationError') {
    const message = `${err.message}`;
    error = new ErrorResponse(message, 401);
  }
  // Database connectivity/authentication is service configuration, not
  // caller authentication. Never expose DB usernames, hosts, or SQL details.
  if ([
    'ER_ACCESS_DENIED_ERROR',
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST',
    'ER_CON_COUNT_ERROR'
  ].includes(err.code)) {
    error = new ErrorResponse('EmpMonitor data service is temporarily unavailable.', 503);
  }
  // MySQL Parse error
  // if (err.code === 'ER_PARSE_ERROR') {
  //     const message = `${err.name}: ${err.message}`;
  //     error = new ErrorResponse(message, 500);
  // }

  res.status(error.statusCode || 500).json({
    code: error.statusCode || 500,
    error: error.statusCode === 503 ? 'SERVICE_UNAVAILABLE' : (err.name || 'Server Error'),
    data: null,
    message: error.message
  });
};

module.exports = errorHandler;
