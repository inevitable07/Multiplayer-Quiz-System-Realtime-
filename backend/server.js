const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

// Health check route
app.get("/health", (_req, res) => {
  res.json({ status: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
