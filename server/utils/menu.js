const Menu = require("../models/Menu");

const DEFAULT_MENU = {
  lunch:  ["Dal", "Rice", "Roti", "Salad"],
  dinner: ["Paneer Curry", "Roti", "Rice", "Dessert"],
};

/*
  Returns the menu to show as "today's menu".
  1. If admin saved a menu for today          -> use it.
  2. Otherwise reuse the most recent PAST menu -> but label it with today's date
     (isFallback = true, sourceDate = the date it was originally saved for).
  3. If no menu exists at all                 -> default menu.
  Dates are "YYYY-MM-DD" strings, so $lt / sort on them is chronological.
*/
async function getTodayMenu() {
  const today = new Date().toISOString().slice(0, 10);

  const todays = await Menu.findOne({ date: today }).lean();
  if (todays) {
    return { date: today, lunch: todays.lunch, dinner: todays.dinner, isFallback: false };
  }

  const latest = await Menu.findOne({ date: { $lt: today } }).sort({ date: -1 }).lean();
  if (latest) {
    return {
      date: today,
      lunch: latest.lunch,
      dinner: latest.dinner,
      isFallback: true,
      sourceDate: latest.date,
    };
  }

  return { date: today, ...DEFAULT_MENU, isFallback: true, sourceDate: null };
}

module.exports = getTodayMenu;
