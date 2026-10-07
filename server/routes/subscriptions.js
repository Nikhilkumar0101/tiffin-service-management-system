const express      = require("express");
const router       = express.Router();
const Subscription = require("../models/Subscription");
const Plan         = require("../models/Plan");
const { verifyToken, requireAdmin } = require("../middleware/auth");

/* ── Helper: calc end date ───────────────────────────────── */
function calcEndDate(startDate, durationText) {
  const start = new Date(startDate);
  const days  = Number(String(durationText).match(/\d+/)?.[0] || 1);
  start.setDate(start.getDate() + days - 1);
  return start.toISOString().slice(0, 10);
}

/* ── GET /api/subscriptions — admin only ─────────────────── */
router.get("/subscriptions", verifyToken, requireAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find()
      .populate("userId", "name email phone")
      .populate("planId", "name price duration mealType")
      .sort({ createdAt: -1 });

    const enriched = subs.map(s => ({
      id:          s._id,
      user:        s.userId,
      plan:        s.planId,
      address:     s.address,
      status:      s.status,
      startDate:   s.startDate,
      endDate:     s.endDate,
      cancelledAt: s.cancelledAt,
    }));

    res.json({ success: true, subscriptions: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── POST /api/subscribe — authenticated user ────────────── */
router.post("/subscribe", verifyToken, async (req, res) => {
  try {
    const { planId, address, startDate } = req.body;
    const userId = req.user.id;

    if (!planId || !address || !address.trim()) {
      return res.status(400).json({ success: false, message: "Plan and delivery address are required." });
    }

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });

    const effectiveStart = startDate || new Date().toISOString().slice(0, 10);
    const endDate = calcEndDate(effectiveStart, plan.duration);

    const sub = await Subscription.create({
      userId,
      planId,
      address: address.trim(),
      status:    "Active",
      startDate: effectiveStart,
      endDate,
    });

    res.status(201).json({ success: true, message: "Subscription created successfully.", subscription: sub });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PATCH /api/subscriptions/:id/cancel ─────────────────── */
router.patch("/subscriptions/:id/cancel", verifyToken, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });

    if (req.user.role !== "admin" && sub.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (sub.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Subscription is already cancelled." });
    }

    sub.status      = "Cancelled";
    sub.cancelledAt = new Date().toISOString().slice(0, 10);
    await sub.save();

    res.json({ success: true, message: "Subscription cancelled successfully.", subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PATCH /api/subscriptions/:id/pause ──────────────────── */
router.patch("/subscriptions/:id/pause", verifyToken, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });

    if (req.user.role !== "admin" && sub.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (sub.status !== "Active") {
      return res.status(400).json({ success: false, message: "Only active subscriptions can be paused." });
    }

    sub.status   = "Paused";
    sub.pausedAt = new Date().toISOString().slice(0, 10);
    await sub.save();

    res.json({ success: true, message: "Subscription paused.", subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/* ── PATCH /api/subscriptions/:id/resume ─────────────────── */
router.patch("/subscriptions/:id/resume", verifyToken, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: "Subscription not found." });

    if (req.user.role !== "admin" && sub.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (sub.status !== "Paused") {
      return res.status(400).json({ success: false, message: "Only paused subscriptions can be resumed." });
    }

    sub.status    = "Active";
    sub.resumedAt = new Date().toISOString().slice(0, 10);
    await sub.save();

    res.json({ success: true, message: "Subscription resumed.", subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
