const express      = require("express");
const router       = express.Router();
const User         = require("../models/User");
const Plan         = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Menu         = require("../models/Menu");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const DEFAULT_MENU_ITEMS = {
  lunch:  ["Dal", "Rice", "Roti", "Salad"],
  dinner: ["Paneer Curry", "Roti", "Rice", "Dessert"],
};

/* ── GET /api/admin/dashboard ────────────────────────────── */
router.get("/admin/dashboard", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalPlans, totalSubscriptions, activeSubscriptions, pausedSubscriptions] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        Plan.countDocuments({ isActive: true }),
        Subscription.countDocuments(),
        Subscription.countDocuments({ status: "Active" }),
        Subscription.countDocuments({ status: "Paused" }),
      ]);

    /* Revenue — sum of plan prices for Active + Paused subscriptions */
    const revenueData = await Subscription.aggregate([
      { $match: { status: { $in: ["Active", "Paused"] } } },
      { $lookup: { from: "plans", localField: "planId", foreignField: "_id", as: "plan" } },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, totalRevenue: { $sum: "$plan.price" } } },
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    const today = new Date().toISOString().slice(0, 10);
    let menu = await Menu.findOne({ date: today });
    if (!menu) menu = await Menu.findOne().sort({ date: -1 });
    if (!menu) menu = { date: today, ...DEFAULT_MENU_ITEMS };

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPlans,
        totalSubscriptions,
        activeSubscriptions,
        pausedSubscriptions,
        totalRevenue,
      },
      menu,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── GET /api/health ─────────────────────────────────────── */
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running." });
});

module.exports = router;
