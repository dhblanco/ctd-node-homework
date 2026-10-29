const express = require("express");
const dogsRouter = require("./routes/dogs");
const { randomUUID } = require("crypto");
const path = require("path");

const app = express();

// Assignment 3b and 3c ask you to add middleware in this file.

// 1. Assign unique IDs to each request
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// 2. Log incoming requests with their request IDs
app.use((req, res, next) => {
  console.log(
    `[${new Date().toString()}]: ${req.method} ${req.path} (${req.requestId})`,
  );
  next();
});

// 3. Set security-related response headers
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  });
  next();
});

// 4. Parse JSON bodies up to 1 MB
app.use(express.json({ limit: "1mb" }));

// 5. Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// 6. Validate the content type of POST requests
app.use((req, res, next) => {
  if (req.method !== "POST") {
    return next();
  }

  if (!req.is("application/json")) {
    res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
    return;
  }

  next();
});

// 7.  Register dog routes, followed by 404 and error handlers
app.use("/", dogsRouter); // Do not remove this line

app.use((req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} - ${err.message}`);
  } else {
    console.error(`ERROR: ${err.name} - ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

// Export app
module.exports = app;
