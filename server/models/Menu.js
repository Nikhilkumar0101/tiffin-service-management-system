const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    date:   { type: String, required: true, unique: true },
    lunch:  [{ type: String }],
    dinner: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema);
