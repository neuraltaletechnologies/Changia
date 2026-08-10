const { ApiError } = require("../utils/ApiError");

/**
 * Validates request body/query/params against Zod schemas and replaces them
 * with the parsed values.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        Object.defineProperty(req, "params", {
          value: schemas.params.parse(req.params),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.query) {
        Object.defineProperty(req, "query", {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      const issues = (error && error.issues) || [];
      next(
        ApiError.badRequest(
          "Validation failed — please check the submitted data",
          "VALIDATION_ERROR",
          issues
        )
      );
    }
  };
}

module.exports = { validate };
