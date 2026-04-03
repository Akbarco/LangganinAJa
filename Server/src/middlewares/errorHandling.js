import { errorResponse } from "../utils/response.js";

export const globalErrorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || null;

  return errorResponse(res, message, errors, status);
};
