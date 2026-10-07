/* ═══════════════════════════════════════════════════════════
   The Comfort Box — User Dashboard JS
   Phase 5: Profile editing, password change, map picker,
            all active subscriptions as scrollable cards
═══════════════════════════════════════════════════════════ */

const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
let cancelSubId = null;
let leafletMap = null;
let leafletMarker = null;
let selectedMapAddress = "";
let mapTargetField = "addressInput"; // which textarea the map fills
let dashboardData = null;

/* ── Auth guard ──────────────────────────────────────────── */
function requireUser() {
  if (!currentUser || !localStorage.getItem("authToken")) {
    window.location.href = "/"; return false;
  }
  if (currentUser.role === "admin") {
    window.location.href = "/admin-dashboard.html"; return false;
  }
  return true;
}

/* ── Auth headers ────────────────────────────────────────── */
function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatCurrency(v) { return `₹${Number(v).toLocaleString("en-IN")}`; }

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

function statusBadge(status) {
  if (status === "Active") return `<span class="badge badge-active">Active</span>`;
  if (status === "Cancelled") return `<span class="badge badge-cancelled">Cancelled</span>`;
  if (status === "Paused") return `<span class="badge badge-soft" style="background:#fbbf24;color:#000;">Paused</span>`;
  return `<span class="badge badge-soft">${status}</span>`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Tab switching ───────────────────────────────────────── */
window.switchUserTab = function (tab) {
  document.getElementById("dashboardContent").style.display = tab === "dashboard" ? "" : "none";
  document.getElementById("profileContent").style.display = tab === "profile" ? "" : "none";
  document.getElementById("tabDashboard").classList.toggle("active", tab === "dashboard");
  document.getElementById("tabProfile").classList.toggle("active", tab === "profile");

  if (tab === "profile" && dashboardData) prefillProfileForm(dashboardData.user);
};

/* ── Pre-fill profile form from cached user data ─────────── */
function prefillProfileForm(user) {
  if (!user) return;
  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profilePhone").value = user.phone || "";
  document.getElementById("profileAddress").value = user.address || "";
  // Show initials as avatar
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("profileAvatar").textContent = initials;
}

/* ═══════════════════════════════════════════════════════════
   MAP — Leaflet.js + OpenStreetMap + Nominatim
═══════════════════════════════════════════════════════════ */

function initLeafletMap() {
  // Destroy previous instance if re-opening
  if (leafletMap) { leafletMap.remove(); leafletMap = null; leafletMarker = null; }

  leafletMap = L.map("leafletMap").setView([20.5937, 78.9629], 5); // India center

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(leafletMap);

  // Auto-center on user's GPS location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => leafletMap.setView([coords.latitude, coords.longitude], 15),
      () => { } // Fail silently — stay at India center
    );
  }

  // Click to place pin + reverse geocode
  leafletMap.on("click", async ({ latlng: { lat, lng } }) => {
    if (leafletMarker) leafletMarker.remove();
    leafletMarker = L.marker([lat, lng])
      .addTo(leafletMap)
      .bindPopup("📍 Delivery here")
      .openPopup();

    document.getElementById("selectedAddressDisplay").textContent = "Fetching address…";
    document.getElementById("useAddressBtn").disabled = true;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      selectedMapAddress = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      selectedMapAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    document.getElementById("selectedAddressDisplay").textContent = selectedMapAddress;
    document.getElementById("useAddressBtn").disabled = false;
  });
}

// Open map modal → initialize map after it's fully visible
document.getElementById("mapModal").addEventListener("shown.bs.modal", () => {
  selectedMapAddress = "";
  document.getElementById("selectedAddressDisplay").textContent = "None — click on the map to select";
  document.getElementById("useAddressBtn").disabled = true;
  initLeafletMap();
});

// Open subscribe map → target the subscribe address field
document.getElementById("openMapBtn").addEventListener("click", () => {
  mapTargetField = "addressInput";
  new bootstrap.Modal(document.getElementById("mapModal")).show();
});

// Open profile map → target the profile address field
document.getElementById("openProfileMapBtn").addEventListener("click", () => {
  mapTargetField = "profileAddress";
  new bootstrap.Modal(document.getElementById("mapModal")).show();
});

// "Use This Location" — fills whichever textarea triggered the map
document.getElementById("useAddressBtn").addEventListener("click", () => {
  if (selectedMapAddress) {
    document.getElementById(mapTargetField).value = selectedMapAddress;
  }
  bootstrap.Modal.getInstance(document.getElementById("mapModal")).hide();
});

/* ═══════════════════════════════════════════════════════════
   DASHBOARD LOADER
═══════════════════════════════════════════════════════════ */
async function loadDashboard() {
  if (!requireUser()) return;

  document.getElementById("greetingTitle").textContent = `${getGreeting()}, ${currentUser.name} 👋`;
  document.getElementById("userBadge").textContent = currentUser.email;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    window.location.href = "/";
  });

  try {
    const res = await fetch(`/api/user/${currentUser.id}/dashboard`, { headers: authHeaders() });

    if (!res.ok) {
      const err = await res.json();
      showAlert(err.message || "Failed to load dashboard.", "danger");
      if (res.status === 401) { localStorage.removeItem("currentUser"); localStorage.removeItem("authToken"); window.location.href = "/"; }
      return;
    }

    const data = await res.json();
    dashboardData = data; // Cache for profile tab
    const { activeSubscriptions, allSubscriptions, stats, menu, plans, user } = data;

    /* ── Stats row ── */
    document.getElementById("statsRow").innerHTML = `
      <div class="col-sm-3">
        <div class="card stat-card">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="stat-icon green">🟢</div>
            <div><div class="stat-label">Active</div><div class="stat-value">${stats.activeSubscriptions}</div></div>
          </div>
        </div>
      </div>
      <div class="col-sm-3">
        <div class="card stat-card">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="stat-icon" style="color:#fbbf24">⏸️</div>
            <div><div class="stat-label">Paused</div><div class="stat-value">${stats.pausedSubscriptions || 0}</div></div>
          </div>
        </div>
      </div>
      <div class="col-sm-3">
        <div class="card stat-card">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="stat-icon">📦</div>
            <div><div class="stat-label">Total</div><div class="stat-value">${stats.totalSubscriptions}</div></div>
          </div>
        </div>
      </div>
      <div class="col-sm-3">
        <div class="card stat-card red">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="stat-icon red">✖</div>
            <div><div class="stat-label">Cancelled</div><div class="stat-value">${stats.cancelledSubscriptions}</div></div>
          </div>
        </div>
      </div>`;

    /* ── Plans grid ── */
    document.getElementById("plansContainer").innerHTML = (plans || []).map(plan => `
      <div class="col-sm-6">
        <div class="plan-card">
          <div class="card-body">
            <div class="plan-name">${plan.name}</div>
            <div class="plan-desc">${plan.description || ""}</div>
            <div class="plan-price">${formatCurrency(plan.price)}</div>
            <div class="plan-meta">⏱ ${plan.duration} &nbsp;·&nbsp; 🍴 ${plan.mealType || ""}</div>
          </div>
        </div>
      </div>`).join("");

    /* ── Plan select dropdown ── */
    document.getElementById("planSelect").innerHTML = (plans || []).map(plan =>
      `<option value="${plan._id}">${plan.name} — ${formatCurrency(plan.price)}</option>`
    ).join("");

    /* ── All Active Subscriptions (scrollable cards) ── */
    const subBox = document.getElementById("subscriptionBox");
    const subCount = document.getElementById("activeSubCount");
    subCount.textContent = `${activeSubscriptions.length} current`;

    if (activeSubscriptions.length > 0) {
      subBox.innerHTML = `
        <div style="max-height:320px;overflow-y:auto;padding-right:2px;">
          ${activeSubscriptions.map((sub) => {
            const isPaused = sub.status === "Paused";
            return `
            <div style="
              background: rgba(255,255,255,.03);
              border: 1px solid ${isPaused ? "#f59e0b55" : "var(--border, #2a2a2a)"};
              border-radius: .6rem;
              padding: .8rem;
              margin-bottom: .75rem;
            ">
              <div class="sub-detail-row">
                <span class="sub-detail-label">Plan</span>
                <span class="sub-detail-value">${sub.plan ? sub.plan.name : "N/A"}</span>
              </div>
              <div class="sub-detail-row">
                <span class="sub-detail-label">Status</span>
                <span class="sub-detail-value">${isPaused ? "<span style='color:#fbbf24;font-size:.78rem;font-weight:600;'>\u23f8 Paused</span>" : "<span style='color:#4ade80;font-size:.78rem;font-weight:600;'>\u25cf Active</span>"}</span>
              </div>
              <div class="sub-detail-row">
                <span class="sub-detail-label">Address</span>
                <span class="sub-detail-value" style="max-width:160px;text-align:right;font-size:.76rem;">${sub.address}</span>
              </div>
              <div class="sub-detail-row">
                <span class="sub-detail-label">Start</span>
                <span class="sub-detail-value">${sub.startDate}</span>
              </div>
              <div class="sub-detail-row">
                <span class="sub-detail-label">End</span>
                <span class="sub-detail-value">${sub.endDate || "—"}</span>
              </div>
              <div class="mt-2 d-flex gap-2">
                ${isPaused
                  ? `<button class="btn btn-sm w-100" style="background:#22c55e22;border:1px solid #22c55e55;color:#4ade80;" onclick="resumeSub('${sub.id}')">▶ Resume</button>`
                  : `<button class="btn btn-sm w-100" style="background:#f59e0b1a;border:1px solid #f59e0b55;color:#fbbf24;" onclick="pauseSub('${sub.id}')">⏸ Pause</button>`
                }
                <button class="btn btn-cancel btn-sm w-100" onclick="triggerCancel('${sub.id}')">❌ Cancel</button>
              </div>
            </div>`;
          }).join("")}
        </div>`;
    } else {
      subBox.innerHTML = `
        <div class="text-center py-3">
          <div style="font-size:2rem;margin-bottom:.5rem;">📭</div>
          <div style="font-size:.85rem;color:var(--text-muted);">No active subscription.<br>Subscribe to a plan on the left!</div>
        </div>`;
    }

    /* ── Today's menu ── */
    document.getElementById("menuBox").innerHTML = `
      <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.85rem;font-weight:600;text-transform:uppercase;letter-spacing:.8px;">
        📅 ${menu.date}
      </div>
      <div class="row g-2">
        <div class="col-6">
          <div class="menu-column">
            <div class="menu-column-title lunch">☀️ Lunch</div>
            ${menu.lunch.map(item => `<div class="menu-item">${item}</div>`).join("")}
          </div>
        </div>
        <div class="col-6">
          <div class="menu-column">
            <div class="menu-column-title dinner">🌙 Dinner</div>
            ${menu.dinner.map(item => `<div class="menu-item">${item}</div>`).join("")}
          </div>
        </div>
      </div>`;

    /* ── Subscription history ── */
    const histBody = document.getElementById("historyTable");
    histBody.innerHTML = allSubscriptions.length
      ? allSubscriptions.map(s => `
          <tr>
            <td style="font-size:.8rem;">${s.plan ? s.plan.name : "N/A"}</td>
            <td>${statusBadge(s.status)}</td>
            <td style="font-size:.78rem;color:var(--text-muted);">${s.startDate}</td>
          </tr>`).join("")
      : `<tr><td colspan="3" class="text-center text-muted py-3" style="font-size:.8rem;">No history yet.</td></tr>`;

    /* ── Default start date ── */
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("startDateInput").value = today;
    document.getElementById("startDateInput").min = today;

    /* ── Pre-fill address from profile if available ── */
    if (user.address) document.getElementById("addressInput").value = user.address;

  } catch (err) {
    console.error("Dashboard error:", err);
    showAlert("Failed to load dashboard data.", "danger");
  }
}

/* ── Subscribe form ──────────────────────────────────────── */
document.getElementById("subscribeForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("subscribeBtn");
  btn.disabled = true; btn.textContent = "Processing…";
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        planId: document.getElementById("planSelect").value,
        address: document.getElementById("addressInput").value.trim(),
        startDate: document.getElementById("startDateInput").value,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Subscription failed.", "danger");
    showAlert("🎉 Subscription created successfully!");
    document.getElementById("subscribeForm").reset();
    loadDashboard();
  } catch { showAlert("Connection error.", "danger"); }
  finally { btn.disabled = false; btn.textContent = "✓ Subscribe Now"; }
});

/* ── Pause subscription ──────────────────────────────────── */
window.pauseSub = async function(subId) {
  try {
    const res  = await fetch(`/api/subscriptions/${subId}/pause`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to pause.", "danger");
    showAlert("\u23f8 Subscription paused. Resume anytime.", "warning");
    loadDashboard();
  } catch { showAlert("Connection error.", "danger"); }
};

/* ── Resume subscription ─────────────────────────────────── */
window.resumeSub = async function(subId) {
  try {
    const res  = await fetch(`/api/subscriptions/${subId}/resume`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Failed to resume.", "danger");
    showAlert("\u25b6 Subscription resumed successfully!");
    loadDashboard();
  } catch { showAlert("Connection error.", "danger"); }
};

/* ── Cancel subscription (triggered per-card) ────────────── */
window.triggerCancel = function (subId) {
  cancelSubId = subId;
  new bootstrap.Modal(document.getElementById("cancelModal")).show();
};

document.getElementById("confirmCancelBtn").addEventListener("click", async () => {
  if (!cancelSubId) return;
  const btn = document.getElementById("confirmCancelBtn");
  btn.disabled = true; btn.textContent = "Cancelling…";
  try {
    const res = await fetch(`/api/subscriptions/${cancelSubId}/cancel`, { method: "PATCH", headers: authHeaders() });
    const data = await res.json();
    bootstrap.Modal.getInstance(document.getElementById("cancelModal"))?.hide();
    if (!res.ok) return showAlert(data.message || "Cancellation failed.", "danger");
    showAlert("Subscription cancelled. History preserved.");
    loadDashboard();
  } catch { showAlert("Connection error.", "danger"); }
  finally { btn.disabled = false; btn.textContent = "Yes, Cancel"; cancelSubId = null; }
});

/* ── Profile form ────────────────────────────────────────── */
document.getElementById("profileForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("saveProfileBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const res = await fetch(`/api/user/${currentUser.id}/profile`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({
        name: document.getElementById("profileName").value.trim(),
        phone: document.getElementById("profilePhone").value.trim(),
        address: document.getElementById("profileAddress").value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Update failed.", "danger");

    // Update cached user in localStorage
    const updated = { ...currentUser, name: data.user.name, phone: data.user.phone };
    localStorage.setItem("currentUser", JSON.stringify(updated));
    if (dashboardData) dashboardData.user = data.user;

    // Update greeting
    document.getElementById("greetingTitle").textContent = `${getGreeting()}, ${data.user.name} 👋`;

    showAlert("Profile updated successfully!");
  } catch { showAlert("Connection error.", "danger"); }
  finally { btn.disabled = false; btn.textContent = "Save Changes"; }
});

/* ── Password change form ────────────────────────────────── */
document.getElementById("passwordForm").addEventListener("submit", async e => {
  e.preventDefault();
  const newPass = document.getElementById("newPassword").value;
  const confPass = document.getElementById("confirmPassword").value;

  if (newPass !== confPass) {
    return showAlert("New passwords do not match.", "danger");
  }

  const btn = document.getElementById("changePassBtn");
  btn.disabled = true; btn.textContent = "Updating…";
  try {
    const res = await fetch(`/api/user/${currentUser.id}/password`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({
        oldPassword: document.getElementById("oldPassword").value,
        newPassword: newPass,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.message || "Password change failed.", "danger");

    showAlert("🔒 Password changed! Logging you out in 2 seconds…");
    setTimeout(() => {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
      window.location.href = "/";
    }, 2000);
  } catch { showAlert("Connection error.", "danger"); }
  finally { btn.disabled = false; btn.textContent = "Update Password"; }
});

/* ── Init ────────────────────────────────────────────────── */
loadDashboard();