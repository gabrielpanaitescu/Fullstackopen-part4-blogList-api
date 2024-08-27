const logger = require("./logger");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const requestLogger = (request, response, next) => {
  logger.info("Method: ", request.method);
  logger.info("Path: ", request.path);
  logger.info("Body: ", request.body);
  logger.info("---");
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).json({ error: "unknown endpoint" });
};

const errorHandler = (error, request, response, next) => {
  logger.error(error.name, error.message);

  if (error.name === "CastError") {
    return response.status(400).json({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  } else if (
    error.name === "MongoServerError" &&
    error.message.includes("E11000 duplicate key error collection")
  ) {
    return response
      .status(400)
      .json({ error: "expected `username` to be unique" });
  } else if (error.name === "JsonWebTokenError") {
    return response.status(401).json({ error: "token missing or invalid" });
  } else if (error.name === "TokenExpiredError") {
    return response.status(401).json({ error: "token expired" });
  }
  next(error);
};

const tokenExtractor = (request, response, next) => {
  const authorization = request.headers.authorization;
  if (authorization && authorization.startsWith("Bearer")) {
    request.token = authorization.replace("Bearer ", "");
  }
  next();
};

const userExtractor = async (request, response, next) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  if (!decodedToken.id)
    return response.status(401).json({ error: "token invalid" });

  request.user = await User.findById(decodedToken.id);

  next();
};

module.exports = {
  unknownEndpoint,
  requestLogger,
  errorHandler,
  tokenExtractor,
  userExtractor,
};
