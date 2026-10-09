# 🍱 The Comfort Box — Tiffin Service Management System

A full-stack web application for managing a home-based tiffin (meal delivery) service. Users can browse meal plans and manage their subscriptions, while the admin manages plans, daily menus and subscribers. Built with **Node.js**, **Express**, **MongoDB** and **Bootstrap 5**.

---

## 🌟 Features

### 👤 User
- 🔐 Secure registration & login (JWT + bcrypt)
- 📋 Browse available meal plans with pricing
- 🗓️ Subscribe to a plan with custom start date and delivery address
- 📍 Pick delivery location on an interactive map (Leaflet.js + OpenStreetMap + Nominatim)
- ⏸️ Pause and resume active subscriptions
- 🔁 Automatic end-date extension on resume — paused days are never lost
- ❌ Cancel subscriptions (past subscriptions are preserved)
- 👤 Edit profile (name, phone, address)
- 🔒 Change password (old password verified)
- 🕒 View full subscription history with `Expired` status for finished plans

### 🛠️ Admin
- 📊 Dashboard with users, plans, subscriptions, paused counts and revenue stats
- ➕ Create, edit and delete meal plans
- 📅 Manage the daily menu (lunch + dinner items)
- 👥 View all registered users with subscription counts (total & active)
- 📋 View all subscribers with status and plan details
- ⏸️ Pause / resume / cancel any user's subscription
- 💰 Revenue tracking (Active + Paused subscriptions) using MongoDB aggregation
- ⏰ Automatic expiry — Active subscriptions past their end date are marked `Expired` on each dashboard load

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Authentication** | JSON Web Tokens (JWT) + bcryptjs |
| **Map** | Leaflet.js + OpenStreetMap + Nominatim (free, no API key) |
| **Dev Tools** | Nodemon, dotenv |

---

## 🔄 How It Works

1. The Express server serves the static frontend from `client/` and exposes REST APIs under `/api`.
2. On register/login, the server returns a JWT; the frontend stores it in `localStorage`.
3. Every protected request sends `Authorization: Bearer <token>`.
4. `verifyToken` middleware validates the token and attaches the user (id, role) to `req.user`; `requireAdmin` restricts admin-only routes.
5. A user picks a plan, address and start date. The server calculates `endDate` from the plan duration and creates a `Subscription`.
6. Pause / resume / cancel are `PATCH` requests that check ownership (or admin role) and validate the current status before changing it.
7. **On resume**, the server calculates how many days the subscription was paused and extends `endDate` by that amount — users never lose paid days.
8. **Auto-expiry** runs on every dashboard load (`expireOldSubscriptions` util): Active subscriptions whose `endDate` is in the past are bulk-updated to `Expired`.
9. **Menu fallback** (`getTodayMenu` util): If no menu is saved for today, the most recent past menu is returned with `isFallback: true`; if no menu exists at all, a built-in default is used.
10. The admin dashboard fetches counts and a revenue aggregation (`$lookup` + `$group`) on each load.

---

## 📁 Project Structure

```
tiffin-service-management-system/
│
├── client/                        # Frontend
│   ├── css/
│   │   ├── style.css              # Dashboard styles (dark theme)
│   │   └── home.css               # Homepage styles
│   ├── js/
│   │   ├── index.js               # Homepage (login, register, plans, menu preview)
│   │   ├── user.js                # User dashboard logic
│   │   └── admin.js               # Admin dashboard logic
│   ├── index.html                 # Landing page
│   ├── user-dashboard.html        # User dashboard
│   └── admin-dashboard.html       # Admin dashboard
│
├── server/                        # Backend
│   ├── config/
│   │   └── db.js                  # MongoDB connection (Mongoose)
│   ├── middleware/
│   │   └── auth.js                # JWT verifyToken + requireAdmin
│   ├── models/                    # Mongoose schemas
│   │   ├── User.js
│   │   ├── Plan.js
│   │   ├── Subscription.js
│   │   └── Menu.js
│   ├── routes/                    # Express route handlers
│   │   ├── auth.js                # POST /api/login, /api/register
│   │   ├── plans.js               # CRUD /api/plans
│   │   ├── menu.js                # GET + POST /api/menu
│   │   ├── subscriptions.js       # Subscribe, cancel, pause, resume
│   │   ├── user.js                # User dashboard, profile, password
│   │   └── admin.js               # Admin dashboard & revenue stats
│   └── utils/
│       ├── seed.js                # Auto-seeds DB on first run
│       ├── expireSubscriptions.js # Bulk-marks overdue Active subs as Expired
│       └── menu.js                # getTodayMenu() with fallback logic
│
├── .env.example                   # Template for environment variables
├── .gitignore
├── package.json
└── server.js                      # App entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or above
- A MongoDB database (MongoDB Atlas free tier works)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Nikhilkumar0101/tiffin-service-management-system.git
cd tiffin-service-management-system

# 2. Install dependencies
npm install

# 3. Create your .env file from the template
cp .env.example .env
# (on Windows: copy .env.example .env)
```

Then open `.env` and fill in your own values:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
```

```bash
# 4. Start the server
npm run dev      # development (nodemon)
# or
npm start        # production

# 5. Open in browser
# http://localhost:3000
```

> **Auto-seed:** On the very first run, the database is seeded with demo users, default plans and today's menu.

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@tiffin.com | admin123 |
| **User** | nikhil@example.com | 123456 |

> These are demo-only credentials created by the seed script. Change them for any real deployment.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/register` | Public | Register a new user |
| `POST` | `/api/login` | Public | Login & receive JWT token |

### Plans
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/plans` | Public | Get all active plans |
| `POST` | `/api/plans` | 🔴 Admin | Create a new plan |
| `PUT` | `/api/plans/:id` | 🔴 Admin | Update a plan |
| `DELETE` | `/api/plans/:id` | 🔴 Admin | Delete a plan |

### Menu
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/menu` | Public | Get today's menu (falls back to latest menu) |
| `POST` | `/api/menu` | 🔴 Admin | Create/update menu for a date |

### Subscriptions
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/subscribe` | 🔐 User | Create a new subscription |
| `GET` | `/api/subscriptions` | 🔴 Admin | List all subscriptions |
| `PATCH` | `/api/subscriptions/:id/cancel` | 🔐 Owner/Admin | Cancel subscription |
| `PATCH` | `/api/subscriptions/:id/pause` | 🔐 Owner/Admin | Pause subscription |
| `PATCH` | `/api/subscriptions/:id/resume` | 🔐 Owner/Admin | Resume subscription (extends end date by paused days) |

### User
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/user/:id/dashboard` | 🔐 Owner/Admin | Load dashboard data |
| `PUT` | `/api/user/:id/profile` | 🔐 Owner | Update name, phone, address |
| `PUT` | `/api/user/:id/password` | 🔐 Owner | Change password |

### Admin
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/admin/dashboard` | 🔴 Admin | Stats + revenue overview |
| `GET` | `/api/admin/users` | 🔴 Admin | All registered users with subscription counts |

### Utility
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Server health check |

---

## 🔐 Security Implementation

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcryptjs with 12 salt rounds |
| **Authentication** | JWT tokens (7-day expiry), stored in `localStorage` |
| **Authorization** | `verifyToken` + `requireAdmin` middleware on protected routes |
| **Ownership checks** | Users can only access/modify their own data (admins can manage all) |
| **Role safety** | Registration always creates a `user`; role cannot be set from the client |
| **Input Validation** | Basic server-side checks on write endpoints |
| **Secret Management** | Secrets in `.env`, which is git-ignored |

---

## 🗄️ Database Schema

### User
```js
{
  name: String,
  email: String (unique),
  password: String (bcrypt hash),
  phone: String,
  role: "user" | "admin",
  address: String,
  profileImage: String,
  timestamps: true
}
```

### Plan
```js
{
  name: String,
  price: Number,
  duration: String,      // "1 Day", "7 Days", "30 Days"
  mealType: String,      // "Lunch", "Dinner", "Lunch + Dinner"
  description: String,
  isActive: Boolean,
  timestamps: true
}
```

### Subscription
```js
{
  userId: ObjectId (ref: User),
  planId: ObjectId (ref: Plan),
  address: String,
  status: "Active" | "Paused" | "Cancelled" | "Expired",
  startDate: String,     // "YYYY-MM-DD"
  endDate: String,       // "YYYY-MM-DD" — extended on resume
  cancelledAt: String,
  pausedAt: String,
  resumedAt: String,
  timestamps: true
}
```

### Menu
```js
{
  date: String (unique, "YYYY-MM-DD"),
  lunch: [String],
  dinner: [String],
  timestamps: true
}
```

---

## 🖥️ Pages

| Page | Description |
|------|-------------|
| **Homepage** | Plan showcase, today's menu preview, login/register modal |
| **User Dashboard** | Stats, subscribe form with map picker, active/paused subscriptions, history |
| **Profile Tab** | Edit name/phone/address, change password |
| **Admin Dashboard** | Revenue stats, plan management, menu management, subscriber table with actions, user management table |

---

## 🔮 Future Improvements

- Payment gateway integration (e.g. Razorpay)
- Forgot-password / email notifications
- Stronger input validation (e.g. Joi) and rate limiting
- Store JWT in httpOnly cookies instead of `localStorage`
- Delivery tracking and per-day pause/skip meal option
- Deployment (Render / AWS) with CI

---

## 👨‍💻 Author

**Nikhil Kumar**  
MCA Student | Full Stack Developer
