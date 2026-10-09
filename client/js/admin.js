const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

/* ── Auth guard ──────────────────────────────────────────── */
function requireAdmin() {
  if (!currentUser || !localStorage.getItem("authToken")) {
    window.location.href = "/";
    return false;
  }
  if (currentUser.role !== "admin") {
    window.location.href = "/user-dashboard.html";
    return false;
  }
  return true;
}

/* ── Auth headers for all protected requests ─────────────── */
function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatCurrency(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

/* ── Fixed toast notification (always visible, no scrolling) ─── */
function showAlert(message, type = "success") {
  const toast = document.getElementById("fixedToast");
  const styles = {
    success: { bg: "#22c55e1a", border: "#22c55e55", text: "#4ade80", icon: "\u2705" },
    danger: { bg: "#ef44441a", border: "#ef444455", text: "#f87171", icon: "\u274c" },
    warning: { bg: "#f59e0b1a", border: "#f59e0b55", text: "#fbbf24", icon: "\u26a0\ufe0f" },
    info: { bg: "#3b82f61a", border: "#3b82f655", text: "#60a5fa", icon: "\u2139\ufe0f" },
  };
  const s = styles[type] || styles.success;
  toast.innerHTML = `
    <div style="
      background: ${s.bg};
      border: 1px solid ${s.border};
      border-radius: .75rem;
      padding: .85rem 1rem;
      color: ${s.text};
      font-size: .84rem;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    ">
      <span style="font-size:1.1rem;flex-shrink:0;">${s.icon}</span>
      <span style="flex:1;line-height:1.4;">${message}</span>
      <button onclick="document.getElementById('fixedToast').style.display='none'"
        style="background:none;border:none;color:${s.text};cursor:pointer;margin-left:.25rem;font-size:1rem;opacity:.6;flex-shrink:0;padding:0;line-height:1;">\u2715</button>
    </div>`;
  // Reset animation by briefly removing/re-adding
  toast.style.display = "none";
  requestAnimationFrame(() => { toast.style.display = "block"; });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = "none"; }, 5000);
}

function resetPlanForm() {
  document.getElementById("planId").value = "";
  document.getElementById("planForm").reset();
}

/* ── Stat cards renderer ─────────────────────────────────── */
function renderStats(stats) {
  document.getElementById("statsRow").innerHTML = `
    <div class="col-md-2 col-sm-4">
      <div class="card stat-card purple">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon purple">👥</div>
          <div><div class="stat-label">Users</div><div class="stat-value">${stats.totalUsers}</div></div>
        </div>
      </div>
    </div>
    <div class="col-md-2 col-sm-4">
      <div class="card stat-card">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon">📋</div>
          <div><div class="stat-label">Plans</div><div class="stat-value">${stats.totalPlans}</div></div>
        </div>
      </div>
    </div>
    <div class="col-md-3 col-sm-4">
      <div class="card stat-card">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon">📦</div>
          <div><div class="stat-label">Subscriptions</div><div class="stat-value">${stats.totalSubscriptions}</div></div>
        </div>
      </div>
    </div>
    <div class="col-md-2 col-sm-6">
      <div class="card stat-card green">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon green">✅</div>
          <div><div class="stat-label">Active</div><div class="stat-value">${stats.activeSubscriptions}</div></div>
        </div>
      </div>
    </div>
    <div class="col-md-3 col-sm-6">
      <div class="card stat-card" style="border-color:#22c55e44">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="stat-icon" style="color:#22c55e">💰</div>
          <div><div class="stat-label">Revenue</div><div class="stat-value" style="font-size:1rem">₹${Number(stats.totalRevenue || 0).toLocaleString("en-IN")}</div></div>
        </div>
      </div>
    </div>
  `;
}

/* ── Dashboard loader ────────────────────────────────────── */
async function loadDashboard() {
  if (!requireAdmin()) return;

  document.getElementById("adminBadge").textContent = `Logged in as ${currentUser.name}`;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    window.location.href = "/";
  });

  try {
    const statsRes = await fetch("/api/admin/dashboard", { headers: authHeaders() });
    const statsData = await statsRes.json();

    if (!statsRes.ok) {
      showAlert(statsData.message || "Failed to load dashboard", "danger");
      if (statsRes.status === 401) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("authToken");
        window.location.href = "/";
      }
      return;
    }

    renderStats(statsData.stats);

    document.getElementById("menuPreview").innerHTML = `
      <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.85rem;font-weight:600;text-transform:uppercase;letter-spacing:.8px;">
        📅 ${statsData.menu.date}${statsData.menu.isFallback ? ` · carried over from ${statsData.menu.sourceDate || "default menu"} (not updated today)` : ""}
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <div class="menu-column">
            <div class="menu-column-title lunch">☀️ Lunch</div>
            ${statsData.menu.lunch.map((item) => `<div class="menu-item">${item}</div>`).join("")}
          </div>
        </div>
        <div class="col-md-6">
          <div class="menu-column">
            <div class="menu-column-title dinner">🌙 Dinner</div>
            ${statsData.menu.dinner.map((item) => `<div class="menu-item">${item}</div>`).join("")}
          </div>
        </div>
      </div>
    `;

    await loadPlans();
    await loadSubscribers();

  } catch (err) {
    console.error("Dashboard error:", err);
    showAlert("Failed to load dashboard.", "danger");
  }
}

/* ── Plans table ─────────────────────────────────────────── */
async function loadPlans() {
  try {
    const res  = await fetch("/api/plans", { headers: authHeaders() });
    const data = await res.json();
    const plans = data.plans || [];

    document.getElementById("plansTable").innerHTML = plans.map((plan) => `
      <tr>
        <td>${plan.name}</td>
        <td>${formatCurrency(plan.price)}</td>
        <td>${plan.duration}</td>
        <td>${plan.mealType || ""}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick='editPlan(${JSON.stringify(plan).replace(/'/g, "\\'")})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePlan('${plan._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Load plans error:", err);
  }
}

/* ── Subscribers table ───────────────────────────────────── */
async function loadSubscribers() {
  try {
    const res  = await fetch("/api/subscriptions", { headers: authHeaders() });
    const data = await res.json();
    const subs = data.subscriptions || [];

    document.getElementById("subsTable").innerHTML = subs.map((sub) => {
      const statusBadge = sub.status === "Active"
        ? `<span class="badge badge-active">Active</span>`
        : sub.status === "Paused"
          ? `<span class="badge badge-soft" style="background:#f59e0b1a;color:#fbbf24;border:1px solid #f59e0b55;">⏸ Paused</span>`
          : sub.status === "Cancelled"
            ? `<span class="badge badge-cancelled">Cancelled</span>`
            : `<span class="badge badge-soft">${sub.status}</span>`;

      let actionBtns = `<span style="font-size:.75rem;color:var(--text-muted);">—</span>`;
      if (sub.status === "Active") {
        actionBtns = `
          <button class="btn btn-sm me-1" style="background:#f59e0b1a;border:1px solid #f59e0b55;color:#fbbf24;font-size:.75rem;" onclick="pauseSubscription('${sub.id}')">Pause</button>
          <button class="btn btn-cancel btn-sm" onclick="cancelSubscription('${sub.id}')">Cancel</button>`;
      } else if (sub.status === "Paused") {
        actionBtns = `
          <button class="btn btn-sm me-1" style="background:#22c55e1a;border:1px solid #22c55e55;color:#4ade80;font-size:.75rem;" onclick="resumeSubscription('${sub.id}')">Resume</button>
          <button class="btn btn-cancel btn-sm" onclick="cancelSubscription('${sub.id}')">Cancel</button>`;
      }

      return `
      <tr>
        <td>${sub.user ? sub.user.name : "-"}</td>
        <td>${sub.user ? sub.user.email : "-"}</td>
        <td>${sub.plan ? sub.plan.name : "-"}</td>
        <td style="min-width:160px;">${sub.address}</td>
        <td>${statusBadge}</td>
        <td>${sub.startDate}</td>
        <td>${sub.endDate || "—"}</td>
        <td>${actionBtns}</td>
      </tr>`;
    }).join("");
  } catch (err) {
    console.error("Load subscribers error:", err);
  }
}

/* ── Plan form submit ────────────────────────────────────── */
document.getElementById("planForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("planId").value;
  const payload = {
    name:        document.getElementById("planName").value.trim(),
    price:       document.getElementById("planPrice").value,
    duration:    document.getElementById("planDuration").value.trim(),
    mealType:    document.getElementById("planMealType").value.trim(),
    description: document.getElementById("planDescription").value.trim(),
  };

  const method = id ? "PUT" : "POST";
  const url    = id ? `/api/plans/${id}` : "/api/plans";

  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to save plan", "danger");

    showAlert(data.message || "Plan saved successfully.");
    resetPlanForm();
    loadDashboard();
  } catch {
    showAlert("Connection error.", "danger");
  }
});

/* ── Edit plan ───────────────────────────────────────────── */
window.editPlan = function(plan) {
  document.getElementById("planId").value          = plan._id;
  document.getElementById("planName").value        = plan.name;
  document.getElementById("planPrice").value       = plan.price;
  document.getElementById("planDuration").value    = plan.duration;
  document.getElementById("planMealType").value    = plan.mealType || "";
  document.getElementById("planDescription").value = plan.description || "";
  document.querySelector('#adminTabs button[data-bs-target="#plansTab"]').click();
};

/* ── Delete plan ─────────────────────────────────────────── */
window.deletePlan = async function(id) {
  if (!confirm("Delete this plan?")) return;
  try {
    const res  = await fetch(`/api/plans/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to delete plan", "danger");

    showAlert("Plan deleted successfully.");
    loadDashboard();
  } catch {
    showAlert("Connection error.", "danger");
  }
};

document.getElementById("resetPlanBtn").addEventListener("click", resetPlanForm);

/* ── Cancel subscription (admin) ─────────────────────────── */
window.cancelSubscription = async function(id) {
  if (!confirm("Cancel this subscription? The record will be kept in history.")) return;
  try {
    const res  = await fetch(`/api/subscriptions/${id}/cancel`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to cancel subscription", "danger");

    showAlert("✅ Subscription cancelled successfully.");
    await loadSubscribers();

    const statsRes  = await fetch("/api/admin/dashboard", { headers: authHeaders() });
    const statsData = await statsRes.json();
    if (statsRes.ok) renderStats(statsData.stats);
  } catch {
    showAlert("Connection error.", "danger");
  }
};

window.pauseSubscription = async function(id) {
  if (!confirm("Pause this subscription?")) return;
  try {
    const res  = await fetch(`/api/subscriptions/${id}/pause`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to pause.", "danger");
    showAlert("⏸ Subscription paused.", "warning");
    await loadSubscribers();
    const statsRes  = await fetch("/api/admin/dashboard", { headers: authHeaders() });
    const statsData = await statsRes.json();
    if (statsRes.ok) renderStats(statsData.stats);
  } catch { showAlert("Connection error.", "danger"); }
};

window.resumeSubscription = async function(id) {
  if (!confirm("Resume this subscription?")) return;
  try {
    const res  = await fetch(`/api/subscriptions/${id}/resume`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to resume.", "danger");
    showAlert("▶ Subscription resumed successfully!");
    await loadSubscribers();
    const statsRes  = await fetch("/api/admin/dashboard", { headers: authHeaders() });
    const statsData = await statsRes.json();
    if (statsRes.ok) renderStats(statsData.stats);
  } catch { showAlert("Connection error.", "danger"); }
};

/* ── Menu form submit ────────────────────────────────────── */
document.getElementById("menuForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    date:   document.getElementById("menuDate").value,
    lunch:  document.getElementById("lunchItems").value,
    dinner: document.getElementById("dinnerItems").value,
  };
  try {
    const res  = await fetch("/api/menu", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to save menu", "danger");

    showAlert("Menu updated successfully.");
    document.getElementById("menuForm").reset();
    loadDashboard();
  } catch {
    showAlert("Connection error.", "danger");
  }
});

/* ── Users tab (all registered users) ────────────────────── */
let allUsers = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

function renderUsers(users) {
  document.getElementById("usersCount").textContent = users.length;
  document.getElementById("usersTable").innerHTML = users.length
    ? users.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.phone) || "—"}</td>
        <td style="min-width:160px;">${escapeHtml(u.address) || "—"}</td>
        <td>${new Date(u.joinedAt).toLocaleDateString("en-IN")}</td>
        <td>${u.activeSubscriptions} / ${u.totalSubscriptions}</td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="text-center text-muted">No users found.</td></tr>`;
}

async function loadUsers() {
  try {
    const res  = await fetch("/api/admin/users", { headers: authHeaders() });
    const data = await res.json();
    allUsers = data.users || [];
    applyUserSearch();
  } catch (err) {
    console.error("Load users error:", err);
  }
}

function applyUserSearch() {
  const q = document.getElementById("userSearch").value.trim().toLowerCase();
  renderUsers(
    q ? allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : allUsers
  );
}

document.getElementById("userSearch").addEventListener("input", applyUserSearch);
document.querySelector('[data-bs-target="#usersTab"]').addEventListener("shown.bs.tab", loadUsers);

/* ── Init ────────────────────────────────────────────────── */
loadDashboard();
loadUsers();
