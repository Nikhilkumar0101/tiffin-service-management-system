const express      = require("express");
const router       = express.Router();
const bcrypt       = require("bcryptjs");
const User         = require("../models/User");
const Plan         = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Menu         = require("../models/Menu");
const { verifyToken } = require("../middleware/auth");

const DEFAULT_MENU_ITEMS = {
  lunch:  ["Dal", "Rice", "Roti", "Salad"],
  dinner: ["Paneer Curry", "Roti", "Rice", "Dessert"],
};

/* ── GET /api/user/:id/dashboard ─────────────────────────── */
router.get("/user/:id/dashboard", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const [userSubs, plans] = await Promise.all([
      Subscription.find({ userId }).populate("planId").sort({ createdAt: -1 }),
      Plan.find({ isActive: true }).sort({ price: 1 }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    let menu = await Menu.findOne({ date: today });
    if (!menu) menu = await Menu.findOne().sort({ date: -1 });
    if (!menu) menu = { date: today, ...DEFAULT_MENU_ITEMS };

    /* Active + Paused subscriptions (both "current") */
    const activeSubscriptions = userSubs
      .filter(s => s.status === "Active" || s.status === "Paused")
      .map(s => ({
        id:        s._id,
        plan:      s.planId,
        address:   s.address,
        status:    s.status,
        startDate: s.startDate,
        endDate:   s.endDate,
      }));

    const enrichedSubs = userSubs.map(s => ({
      id:        s._id,
      plan:      s.planId,
      address:   s.address,
      status:    s.status,
      startDate: s.startDate,
      endDate:   s.endDate,
    }));

    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address },
      activeSubscriptions,
      allSubscriptions: enrichedSubs,
      stats: {
        totalSubscriptions:     userSubs.length,
        activeSubscriptions:    userSubs.filter(s => s.status === "Active").length,
        pausedSubscriptions:    userSubs.filter(s => s.status === "Paused").length,
        cancelledSubscriptions: userSubs.filter(s => s.status === "Cancelled").length,
      },
      menu,
      plans,
    });
  } catch (err) {
    console.error("User dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PUT /api/user/:id/profile ───────────────────────────── */
router.put("/user/:id/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const { name, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: name.trim(), phone: phone || "", address: address || "" },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.json({ success: true, message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PUT /api/user/:id/password ──────────────────────────── */
router.put("/user/:id/password", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: "Password changed successfully. Please log in again." });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
