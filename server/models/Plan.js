const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    price:       { type: Number, required: true, min: 0 },
    duration:    { type: String, required: true },
    mealType:    { type: String, default: "Lunch + Dinner" },
    description: { type: String, default: "" },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
