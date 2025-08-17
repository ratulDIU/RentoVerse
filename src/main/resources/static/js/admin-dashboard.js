const API = `${window.location.origin}/api/admin`;
const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

document.addEventListener("DOMContentLoaded", init);

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

async function init() {
    try {
        // --- Admin info (prefer values saved at admin login) ---
        const adminNameLS  = localStorage.getItem("adminName");
        const adminEmailLS = localStorage.getItem("adminEmail");
        if (adminNameLS && adminEmailLS) {
            showAdminInfo(adminNameLS, adminEmailLS);
        }

        // --- Users: split RENTER / PROVIDER; also pick ADMIN fallback for header if needed ---
        const users = await getJSON(`${API}/users`);
        const renters   = users.filter(u => u.role === "RENTER");
        const providers = users.filter(u => u.role === "PROVIDER");
        const admins    = users.filter(u => u.role === "ADMIN");

        if (!adminNameLS && admins.length) {
            showAdminInfo(admins[0].name, admins[0].email);
        }

        setTxt("renterCount", renters.length);
        setTxt("providerCount", providers.length);

        renderUserList("renterList", renters);
        renderUserList("providerList", providers);

        // --- Rooms (with image + description) ---
        const rooms = await getJSON(`${API}/rooms`);
        setTxt("roomCount", rooms.length);
        renderRooms(rooms);

        // --- Bookings ---
        const bookings = await getJSON(`${API}/bookings`);
        setTxt("bookingCount", bookings.length);
        renderBookings(bookings);

    } catch (e) {
        console.error(e);
        alert("❌ Failed to load admin data.");
    }
}

/* ------------ helpers ------------ */
async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

function showAdminInfo(name, email) {
    const box   = document.getElementById("adminInfo");
    const nameEl  = document.getElementById("adminName");
    const emailEl = document.getElementById("adminEmail");
    if (!box || !nameEl || !emailEl) return;

    nameEl.textContent  = name || "Admin";
    emailEl.textContent = email || "";
    box.classList.remove("hidden"); // show it
}

/* ------------ renderers ------------ */
function renderUserList(containerId, list) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!Array.isArray(list) || list.length === 0) {
        el.innerHTML = `<div class="text-gray-500">No users found.</div>`;
        return;
    }

    el.innerHTML = list.map(u => {
        const isAdmin = (u.role === 'ADMIN');
        return `
      <div class="bg-white p-4 rounded-xl shadow flex justify-between items-center">
        <div>
          <p class="font-semibold">${escapeHtml(u.name)} (${escapeHtml(u.email)})</p>
          <p class="text-gray-500">Role: ${escapeHtml(u.role)}</p>
        </div>

        ${
            isAdmin
                ? `<button disabled
                 class="text-sm px-4 py-2 rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed"
                 title="Admin accounts cannot be deleted">
                 🔒 Admin
               </button>`
                : `<button onclick="deleteUser('${u.id}')"
                 class="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                 🗑️ Delete
               </button>`
        }
      </div>
    `;
    }).join("");
}

function renderRooms(rooms) {
    const el = document.getElementById("roomList");
    if (!el) return;
    if (!rooms.length) {
        el.innerHTML = `<div class="text-gray-500">No data found.</div>`;
        return;
    }

    el.innerHTML = rooms.map(r => {
        const img = r.imageUrl && r.imageUrl.trim()
            ? r.imageUrl
            : "https://via.placeholder.com/160x120?text=Room";
        return `
      <div class="bg-white p-4 rounded-xl shadow flex justify-between items-start gap-4">
        <div class="flex gap-4 items-start">
          <img src="${escapeAttr(img)}"
               onerror="this.src='https://via.placeholder.com/160x120?text=Room'"
               class="w-40 h-28 object-cover rounded-md border" alt="room">
          <div>
            <p class="font-semibold">${escapeHtml(r.title)} - ৳${escapeHtml(r.rent)}</p>
            <p class="text-gray-500">${escapeHtml(r.location)} | Type: ${escapeHtml(r.type)}</p>
            <p class="mt-1 text-gray-700">${escapeHtml(r.description ?? "—")}</p>
          </div>
        </div>
        <button onclick="deleteRoom('${r.id}')"
          class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg">
          🗑️ Delete
        </button>
      </div>
    `;
    }).join("");
}

/* ---------- NEW: helpers for booking cards ---------- */
function badgeClass(status) {
    switch ((status || "").toUpperCase()) {
        case "PENDING_REQUEST":  return "bg-yellow-500";
        case "AWAITING_PAYMENT": return "bg-indigo-600";
        case "PAID_CONFIRMED":
        case "CONFIRMED":        return "bg-green-600";
        case "DECLINED":         return "bg-red-600";
        case "EXPIRED_UNPAID":
        case "EXPIRED_NO_VISIT":
        case "CANCELLED_AFTER_VIEWING":
            return "bg-gray-600";
        default:                 return "bg-slate-500";
    }
}
function roomCode(room) {
    return room?.publicCode || room?.code || room?.roomCode || (room?.id != null ? `ID#${room.id}` : "—");
}

/* ---------- UPDATED: detailed booking cards ---------- */
function renderBookings(bookings) {
    const el = document.getElementById("bookingList");
    if (!el) return;
    if (!Array.isArray(bookings) || bookings.length === 0) {
        el.innerHTML = `<div class="text-gray-500">No data found.</div>`;
        return;
    }

    el.innerHTML = bookings.map(b => {
        const r = b.room || {};
        const p = r.provider || {};
        const renter = b.renter || {};
        const status = (b.status || "PENDING_REQUEST").toUpperCase();
        const created = new Date(b.createdAt || b.created_at || Date.now()).toLocaleString();
        const img = r.imageUrl && r.imageUrl.trim()
            ? r.imageUrl
            : "https://via.placeholder.com/256x160?text=Room";
        const badge = `<span class="px-3 py-1 rounded-full text-white text-xs ${badgeClass(status)}">${status.replace(/_/g," ")}</span>`;
        const deposit = Math.round((r.rent || 0) * 0.25);

        return `
      <div class="bg-white p-5 rounded-xl shadow flex flex-col md:flex-row gap-5">
        <img src="${escapeAttr(img)}"
             onerror="this.src='https://via.placeholder.com/256x160?text=Room'"
             class="w-full md:w-64 h-40 object-cover rounded-lg" alt="room">
        <div class="flex-1">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-bold">${escapeHtml(r.title || "Room")}</h3>
              <p class="text-xs text-gray-500">Code: ${escapeHtml(roomCode(r))}</p>
            </div>
            ${badge}
          </div>

          <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm text-gray-700">
            <p>💰 <span class="font-medium">Rent:</span> ৳${escapeHtml(r.rent ?? "-")}</p>
            <p>🏷 <span class="font-medium">Type:</span> ${escapeHtml(r.type || "-")}</p>
            <p>📍 <span class="font-medium">Location:</span> ${escapeHtml(r.location || "-")}</p>
            <p>📅 <span class="font-medium">Requested:</span> ${escapeHtml(created)}</p>
            <p>🧑 <span class="font-medium">Renter:</span> ${escapeHtml(renter.name || b.renterName || "-")} (${escapeHtml(renter.email || b.renterEmail || "-")})</p>
            <p>🏢 <span class="font-medium">Provider:</span> ${escapeHtml(p.name || "-")} (${escapeHtml(p.email || "-")})</p>
          </div>

          <div class="mt-3 flex gap-2 justify-end">
            <button onclick="deleteBooking('${b.id}')"
              class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg">
              ❌ Cancel
            </button>
            ${status === "AWAITING_PAYMENT"
            ? `<a class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg"
                    href="payment.html?bookingId=${encodeURIComponent(b.id)}&amount=${encodeURIComponent(deposit)}">
                    View 25% (৳${deposit})
                 </a>`
            : ""}
          </div>
        </div>
      </div>`;
    }).join("");
}

/* ------------ actions ------------ */
async function deleteRoom(id) {
    if (!confirm("Delete this room?")) return;
    await fetch(`${API}/rooms/${id}`, { method: "DELETE" });
    location.reload();
}
async function deleteBooking(id) {
    if (!confirm("Cancel this booking?")) return;
    await fetch(`${API}/bookings/${id}`, { method: "DELETE" });
    location.reload();
}

async function deleteUser(userId) {
    if (!userId) return;
    const ok = confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
        const res = await fetch(`${window.location.origin}/api/admin/users/${encodeURIComponent(userId)}`,
            {
            method: "DELETE"
        });
        const text = await res.text();

        if (res.ok) {
            // প্রয়োজনে টোস্ট দেখাও
            // alert("✅ User deleted");
            location.reload();
        } else {
            alert("❌ " + (text || "Failed to delete user."));
        }
    } catch (e) {
        console.error(e);
        alert("❌ Network error while deleting user.");
    }
}

/* ------------ utils ------------ */
function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g, "&quot;"); }