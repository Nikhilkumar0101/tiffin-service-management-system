require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./server/config/db");
const seedData = require("./server/utils/seed");

// Route imports
const authRoutes = require("./server/routes/auth");
const planRoutes = require("./server/routes/plans");
const menuRoutes = require("./server/routes/menu");
const subscriptionRoutes = require("./server/routes/subscriptions");
const userRoutes = require("./server/routes/user");
const adminRoutes = require("./server/routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ──────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client")));

/* ── Connect DB then seed ────────────────────────────────── */
connectDB().then(() => seedData());

/* ── API Routes ──────────────────────────────────────────── */
app.use("/api", authRoutes);
app.use("/api", planRoutes);
app.use("/api", menuRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", userRoutes);
app.use("/api", adminRoutes);

/* ── Serve client HTML for all non-API routes ────────────── */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

/* ── Start server ────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`🚀 Tiffin Service running at http://localhost:${PORT}`);
});
