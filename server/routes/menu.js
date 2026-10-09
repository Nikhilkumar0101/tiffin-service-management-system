const express = require("express");
const router  = express.Router();
const Menu    = require("../models/Menu");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const getTodayMenu = require("../utils/menu");

/* ── GET /api/menu — public ──────────────────────────────── */
router.get("/menu", async (req, res) => {
  try {
    const menu = await getTodayMenu();
    res.json({ success: true, menu });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── POST /api/menu — admin only ─────────────────────────── */
router.post("/menu", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { date, lunch, dinner } = req.body;
    if (!date || !lunch || !dinner) {
      return res.status(400).json({ success: false, message: "Date, lunch and dinner are required." });
    }

    const lunchArr  = Array.isArray(lunch)  ? lunch  : String(lunch).split(",").map(x => x.trim()).filter(Boolean);
    const dinnerArr = Array.isArray(dinner) ? dinner : String(dinner).split(",").map(x => x.trim()).filter(Boolean);

    const menu = await Menu.findOneAndUpdate(
      { date },
      { date, lunch: lunchArr, dinner: dinnerArr },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Menu updated successfully.", menu });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
