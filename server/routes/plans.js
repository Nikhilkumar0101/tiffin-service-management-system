const express  = require("express");
const router   = express.Router();
const Plan     = require("../models/Plan");
const { verifyToken, requireAdmin } = require("../middleware/auth");

/* ── GET /api/plans — public ─────────────────────────────── */
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── POST /api/plans — admin only ────────────────────────── */
router.post("/plans", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, price, duration, mealType, description } = req.body;
    if (!name || !price || !duration) {
      return res.status(400).json({ success: false, message: "Name, price and duration are required." });
    }
    const plan = await Plan.create({
      name: name.trim(),
      price: Number(price),
      duration: duration.trim(),
      mealType: mealType || "Lunch + Dinner",
      description: description || "",
    });
    res.status(201).json({ success: true, message: "Plan added successfully.", plan });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PUT /api/plans/:id — admin only ─────────────────────── */
router.put("/plans/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);

    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });

    res.json({ success: true, message: "Plan updated successfully.", plan });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── DELETE /api/plans/:id — admin only ──────────────────── */
router.delete("/plans/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
    res.json({ success: true, message: "Plan deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
