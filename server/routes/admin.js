const express      = require("express");
const router       = express.Router();
const User         = require("../models/User");
const Plan         = require("../models/Plan");
const Subscription = require("../models/Subscription");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const getTodayMenu = require("../utils/menu");
const expireOldSubscriptions = require("../utils/expireSubscriptions");

/* ── GET /api/admin/dashboard ────────────────────────────── */
router.get("/admin/dashboard", verifyToken, requireAdmin, async (req, res) => {
  try {
    await expireOldSubscriptions();   // keep stats accurate

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

    const menu = await getTodayMenu();   // today's menu (falls back to latest past menu)

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

/* ── GET /api/admin/users — all registered users (admin only) ── */
router.get("/admin/users", verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });

    /* Subscription counts per user (total + currently active) */
    const counts = await Subscription.aggregate([
      {
        $group: {
          _id: "$userId",
          total:  { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        },
      },
    ]);
    const countMap = new Map(counts.map(c => [c._id.toString(), c]));

    const result = users.map(u => {
      const c = countMap.get(u._id.toString());
      return {
        id:                  u._id,
        name:                u.name,
        email:               u.email,
        phone:               u.phone,
        address:             u.address,
        joinedAt:            u.createdAt,
        totalSubscriptions:  c ? c.total  : 0,
        activeSubscriptions: c ? c.active : 0,
      };
    });

    res.json({ success: true, users: result });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── GET /api/health ─────────────────────────────────────── */
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running." });
});

module.exports = router;
