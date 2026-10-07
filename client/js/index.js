/* ═══════════════════════════════════════════════════════════
   The Comfort Box — Homepage JS
   Handles: auth modal, login, register, plans fetch, menu preview
═══════════════════════════════════════════════════════════ */

/* ── Redirect if already logged in ─────────────────────── */
const existingUser = JSON.parse(localStorage.getItem("currentUser") || "null");
if (existingUser && localStorage.getItem("authToken")) {
  window.location.href = existingUser.role === "admin"
    ? "/admin-dashboard.html"
    : "/user-dashboard.html";
}

/* ── Navbar scroll effect ───────────────────────────────── */
window.addEventListener("scroll", () => {
  document.getElementById("mainNav").classList.toggle("scrolled", window.scrollY > 20);
});

/* ── Modal helpers ──────────────────────────────────────── */
const overlay   = document.getElementById("authOverlay");
const loginForm = document.getElementById("loginForm");
const regForm   = document.getElementById("registerForm");

function openModal(tab = "login") {
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  switchTab(tab);
  clearAlert();
}

function closeModal() {
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  loginForm.reset();
  regForm.reset();
  clearAlert();
}

function switchTab(tab) {
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
  loginForm.classList.toggle("hidden", tab !== "login");
  regForm.classList.toggle("hidden", tab !== "register");
}

/* ── Close modal on overlay click / Escape ──────────────── */
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
document.getElementById("modalClose").addEventListener("click", closeModal);

/* ── Tab switching ──────────────────────────────────────── */
document.getElementById("tabLogin").addEventListener("click", () => { switchTab("login"); clearAlert(); });
document.getElementById("tabRegister").addEventListener("click", () => { switchTab("register"); clearAlert(); });

/* ── Button wiring ──────────────────────────────────────── */
document.getElementById("navLoginBtn").addEventListener("click", () => openModal("login"));
document.getElementById("navRegisterBtn").addEventListener("click", () => openModal("register"));
document.getElementById("heroGetStarted").addEventListener("click", () => openModal("register"));
document.getElementById("heroLearnMore").addEventListener("click", () => {
  document.getElementById("menu-preview").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("plansSignupBtn").addEventListener("click", () => openModal("register"));
document.getElementById("footerLogin").addEventListener("click", (e) => { e.preventDefault(); openModal("login"); });
document.getElementById("footerRegister").addEventListener("click", (e) => { e.preventDefault(); openModal("register"); });

/* ── Alert ──────────────────────────────────────────────── */
function showAlert(message, type = "success") {
  const box = document.getElementById("alertBox");
  box.innerHTML = `<div class="tcb-alert ${type}">${message}</div>`;
}

function clearAlert() {
  document.getElementById("alertBox").innerHTML = "";
}

/* ── Store user + token & redirect ──────────────────────── */
function storeUser(user, token) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("authToken", token);
  if (user.role === "admin") {
    window.location.href = "/admin-dashboard.html";
  } else {
    window.location.href = "/user-dashboard.html";
  }
}

/* ── Login form ─────────────────────────────────────────── */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Signing in…";

  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res  = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.message || "Invalid email or password.", "error");
    } else {
      showAlert("Welcome back! Redirecting…", "success");
      setTimeout(() => storeUser(data.user, data.token), 700);
    }
  } catch {
    showAlert("Connection error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In →";
  }
});

/* ── Register form ──────────────────────────────────────── */
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("registerSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Creating account…";

  const name     = document.getElementById("regName").value.trim();
  const phone    = document.getElementById("regPhone").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  try {
    const res  = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.message || "Registration failed.", "error");
    } else {
      showAlert("Account created! Signing you in…", "success");
      setTimeout(() => storeUser(data.user, data.token), 700);
    }
  } catch {
    showAlert("Connection error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create My Account →";
  }
});

/* ── Load plans into homepage grid ─────────────────────── */
async function loadHomePlans() {
  try {
    const res   = await fetch("/api/plans");
    const data  = await res.json();
    const plans = data.plans || [];

    const grid = document.getElementById("homePlansGrid");
    if (!plans.length) { grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center;">No plans available yet.</p>`; return; }

    const maxPrice = Math.max(...plans.map((p) => p.price));

    grid.innerHTML = plans.map((plan) => {
      const isPopular = plan.price === maxPrice;
      return `
        <div class="plan-card-home ${isPopular ? "featured-plan" : ""}">
          ${isPopular ? `<div class="plan-badge-popular">⭐ Most Popular</div>` : ""}
          <div class="plan-name">${plan.duration}</div>
          <div class="plan-price">₹${Number(plan.price).toLocaleString("en-IN")}<span> / plan</span></div>
          <div class="plan-duration">${plan.name}</div>
          <div class="plan-desc">${plan.description || ""}</div>
          <div class="plan-type">${plan.mealType || "Lunch + Dinner"}</div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Failed to load plans:", err);
  }
}

/* ── Load today's menu preview ──────────────────────────── */
async function loadMenuPreview() {
  try {
    const res  = await fetch("/api/menu");
    const data = await res.json();
    const menu = data.menu;

    document.getElementById("menuPreviewCard").innerHTML = `
      <div class="menu-date-badge">📅 Menu for ${menu.date}</div>
      <div class="menu-cols">
        <div>
          <div class="menu-col-title lunch">☀️ Lunch</div>
          ${menu.lunch.map((item) => `<div class="menu-item-home">${item}</div>`).join("")}
        </div>
        <div>
          <div class="menu-col-title dinner">🌙 Dinner</div>
          ${menu.dinner.map((item) => `<div class="menu-item-home">${item}</div>`).join("")}
        </div>
      </div>
    `;
  } catch {
    document.getElementById("menuPreviewCard").innerHTML =
      `<div class="menu-loading">Menu unavailable right now.</div>`;
  }
}

/* ── Init ────────────────────────────────────────────────── */
loadHomePlans();
loadMenuPreview();
