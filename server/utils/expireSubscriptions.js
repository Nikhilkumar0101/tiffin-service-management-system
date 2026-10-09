const Subscription = require("../models/Subscription");

/*
  Marks every Active subscription whose endDate is before today as "Expired".
  Dates are stored as "YYYY-MM-DD" strings, so a simple string comparison
  ($lt) works correctly (alphabetical order == chronological order).
  Paused subscriptions are NOT expired - their endDate is extended on resume.
*/
async function expireOldSubscriptions() {
  const today = new Date().toISOString().slice(0, 10);
  await Subscription.updateMany(
    { status: "Active", endDate: { $lt: today } },
    { $set: { status: "Expired" } }
  );
}

module.exports = expireOldSubscriptions;
