const { env } = require("../config");
const { ApiError } = require("../utils/ApiError");

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  void next;

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // MySQL duplicate key (ER_DUP_ENTRY 1062)
  if (error && error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_RECORD",
        message: "A record with that value already exists",
      },
    });
  }

  // MySQL foreign-key violation → a related record is missing / in use
  if (error && error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REFERENCE",
        message: "The referenced record does not exist or is not valid",
      },
    });
  }
  if (error && error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      success: false,
      error: {
        code: "RECORD_IN_USE",
        message: "This record is in use and cannot be removed",
      },
    });
  }

  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "Something went wrong on our side"
          : error && error.message
            ? error.message
            : String(error),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
