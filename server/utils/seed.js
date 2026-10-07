const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Menu = require("../models/Menu");

async function seedData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("ℹ️  Database already seeded. Skipping.");
      return;
    }

    console.log("🌱 Seeding database with default data...");

    const [adminHash, userHash] = await Promise.all([
      bcrypt.hash("admin123", 12),
      bcrypt.hash("123456", 12),
    ]);

    const [admin, defaultUser] = await User.insertMany([
      { name: "Admin", email: "admin@tiffin.com", password: adminHash, phone: "9999999999", role: "admin" },
      { name: "Nikhil", email: "nikhil@example.com", password: userHash, phone: "9876543210", role: "user" },
    ]);

    const plans = await Plan.insertMany([
      { name: "Daily Lunch", price: 80, duration: "1 Day", mealType: "Lunch", description: "Light and healthy lunch plan" },
      { name: "Daily Dinner", price: 90, duration: "1 Day", mealType: "Dinner", description: "Fresh dinner delivered at night" },
      { name: "Weekly Veg", price: 1000, duration: "7 Days", mealType: "Lunch + Dinner", description: "Balanced weekly veg meals" },
      { name: "Monthly Premium", price: 3200, duration: "30 Days", mealType: "Lunch + Dinner", description: "Premium monthly subscription" },
    ]);

    const today = new Date().toISOString().slice(0, 10);

    await Subscription.create({
      userId: defaultUser._id,
      planId: plans[2]._id,
      address: "Dera bassi, Punjab",
      status: "Active",
      startDate: today,
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    await Menu.create({
      date: today,
      lunch: ["Dal", "Rice", "Roti", "Salad"],
      dinner: ["Paneer Curry", "Roti", "Rice", "Dessert"],
    });

    console.log("✅ Database seeded successfully!");
    console.log("   Admin  → admin@tiffin.com  / admin123");
    console.log("   User   → nikhil@example.com / 123456");
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
  }
}

module.exports = seedData;
