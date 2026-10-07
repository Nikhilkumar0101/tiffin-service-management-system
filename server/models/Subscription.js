const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId:      { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    address:     { type: String, required: true },
    status:      { type: String, enum: ["Active", "Paused", "Cancelled", "Expired"], default: "Active" },
    startDate:   { type: String, required: true },
    endDate:     { type: String, default: "" },
    cancelledAt: { type: String, default: "" },
    pausedAt:    { type: String, default: "" },
    resumedAt:   { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
