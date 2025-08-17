const baseURL = `${window.location.origin}`;

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("name") || "Unknown";
    const email = localStorage.getItem("email") || "Unknown";

    byId("renterName").innerText = name;
    byId("renterEmail").innerText = email;

    loadAllRooms();
    loadPendingRequests();
    loadAwaitingPayments();
    loadVisitWindow();
    loadRecentUpdates(); // updates banner (no-op if section missing)

    // cancel modal
    byId("cancelYesBtn")?.addEventListener("click", handleCancelConfirmed);
    byId("cancelNoBtn")?.addEventListener("click", () => {
        selectedBookingId = null;
        byId("cancelModal")?.classList.add("hidden");
    });

    // decision modal
    byId("decisionCancelBtn")?.addEventListener("click", closeDecisionModal);
    byId("decisionSubmitBtn")?.addEventListener("click", submitDecision);

    byId("confirmationRefresh")?.addEventListener("click", loadAwaitingPayments);
    byId("visitRefresh")?.addEventListener("click", loadVisitWindow);
    byId("updatesRefresh")?.addEventListener("click", loadRecentUpdates);
});

// ---------- utils ----------
function byId(id) { return document.getElementById(id); }

function toast(msg, ok = true) {
    const t = byId("rdToast");
    if (!t) return;
    t.textContent = msg;
    t.className = `fixed bottom-6 right-6 px-4 py-2 rounded text-white shadow-lg ${ok ? "bg-green-600" : "bg-red-600"}`;
    t.classList.remove("hidden");
    setTimeout(() => t.classList.add("hidden"), 2400);
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function showRequestStatus(message, success) {
    const statusEl = byId("requestStatus");
    if (!statusEl) return;
    statusEl.innerText = message;
    statusEl.className = `text-center font-semibold mb-4 ${success ? "text-green-600" : "text-red-600"}`;
    setTimeout(() => (statusEl.innerText = ""), 3000);
}

// ---------- time helper (new) ----------
function tsMillis(obj) {
    // আপনার ডেটায় যেটা আছে সেটাই ধরে:
    const t =
        obj?.createdAt ?? obj?.requestedAt ?? obj?.created_at ??
        obj?.createdAtTs ?? obj?.created;

    if (!t) return 0;
    // Firestore Timestamp?
    if (typeof t === 'object' && 'seconds' in t) {
        return t.seconds * 1000 + (t.nanoseconds || 0) / 1e6;
    }
    if (typeof t === 'number') return t;              // already ms
    const ms = Date.parse(t);                         // ISO/string
    return Number.isNaN(ms) ? 0 : ms;
}


// helper to show a public code or fallback to ID
function roomCode(room) {
    if (room?.publicCode) return room.publicCode;
    if (room?.code) return room.code;
    if (room?.roomCode) return room.roomCode;
    if (room?.id != null) return `ID#${room.id}`;
    return "ID#—";
}

// =================== ROOMS ===================
async function loadAllRooms() {
    const container = byId("allRooms");
    if (!container) return;
    container.innerHTML = "⏳ Loading rooms...";

    try {
        const res = await fetch(`${baseURL}/api/rooms/available`);
        const rooms = await res.json();

        if (!Array.isArray(rooms) || rooms.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No rooms available.</p>`;
            return;
        }

        container.innerHTML = rooms.map(room => {
            const code = roomCode(room);
            return `
        <div class="bg-white shadow rounded-lg p-4">
          <img src="${room.imageUrl || ""}" class="h-40 w-full object-cover rounded mb-2" />
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-bold text-lg">${room.title || "-"}</h3>
            <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${code}</span>
          </div>
          <p class="text-gray-600 text-sm">৳${room.rent ?? "-"} | ${room.type || ""} | ${room.location || ""}</p>
          <p class="text-sm text-gray-500 mt-2">${room.description || ""}</p>
          <button onclick="requestRoom('${room.id}')"
                  class="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            📩 Request
          </button>
        </div>`;
        }).join("");
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-red-500">❌ Failed to load rooms.</p>`;
    }
}

// =================== SEARCH ===================
async function searchRooms() {
    const location = byId("searchLocation")?.value || "";
    const maxRent = byId("searchMaxRent")?.value || "";
    const type = byId("searchType")?.value || "";

    const url = `${baseURL}/api/rooms/filter?location=${encodeURIComponent(location)}&type=${encodeURIComponent(type)}`;

    try {
        const res = await fetch(url);
        let rooms = await res.json();
        if (maxRent) rooms = rooms.filter(r => r.rent <= parseFloat(maxRent));

        const container = byId("allRooms");
        if (!rooms.length) {
            container.innerHTML = `<p class="text-gray-500">No matching rooms found.</p>`;
            return;
        }

        container.innerHTML = rooms.map(room => {
            const code = roomCode(room);
            return `
        <div class="bg-white shadow rounded-lg p-4">
          <img src="${room.imageUrl || ""}" class="h-40 w-full object-cover rounded mb-2" />
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-bold text-lg">${room.title || "-"}</h3>
            <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${code}</span>
          </div>
          <p class="text-gray-600 text-sm">৳${room.rent ?? "-"} | ${room.type || ""} | ${room.location || ""}</p>
          <p class="text-sm text-gray-500 mt-2">${room.description || ""}</p>
          <button onclick="requestRoom('${room.id}')"
                  class="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            📩 Request
          </button>
        </div>`;
        }).join("");
    } catch (err) {
        console.error("❌ Search failed:", err);
    }
}

// =================== BOOKING: REQUEST/CANCEL ===================
async function requestRoom(roomId) {
    const email = localStorage.getItem("email");
    if (!email) {
        showRequestStatus("❌ You must be logged in to request.", false);
        return;
    }
    try {
        const res = await fetch(`${baseURL}/api/bookings/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId, renterEmail: email })
        });
        const message = res.ok ? "✅ Room request sent!" : `❌ Failed: ${await res.text()}`;
        showRequestStatus(message, res.ok);
        if (res.ok) loadPendingRequests();
    } catch (err) {
        console.error("❌ Request failed:", err);
        showRequestStatus("❌ Something went wrong while requesting.", false);
    }
}

// Cancel modal
let selectedBookingId = null;

function showCancelModal(bookingId) {
    selectedBookingId = bookingId;
    byId("cancelModal")?.classList.remove("hidden");
}

async function handleCancelConfirmed() {
    if (!selectedBookingId) return;
    try {
        const res = await fetch(`${baseURL}/api/bookings/cancel/${selectedBookingId}`, { method: "DELETE" });
        const msg = await res.text();
        if (res.ok) {
            showRequestStatus("❎ Booking request canceled.", true);
            loadPendingRequests();
        } else {
            showRequestStatus("❌ Failed to cancel: " + msg, false);
        }
    } catch (err) {
        showRequestStatus("❌ Request failed: " + err, false);
    }
    selectedBookingId = null;
    byId("cancelModal")?.classList.add("hidden");
}

// =================== BOOKING LISTS ===================
function badgeClass(status) {
    switch (status) {
        case "PENDING":
        case "PENDING_REQUEST": return "bg-yellow-500";
        case "AWAITING_PAYMENT": return "bg-indigo-600";
        case "PAID_CONFIRMED":
        case "CONFIRMED": return "bg-green-600";
        case "DECLINED": return "bg-red-600";
        case "EXPIRED_UNPAID":
        case "EXPIRED_NO_VISIT": return "bg-gray-600";
        case "CANCELLED_AFTER_VIEWING": return "bg-gray-600";
        default: return "bg-slate-500";
    }
}

async function loadPendingRequests() {
    const email = localStorage.getItem("email");
    const container = byId("pendingRequests");
    if (!container) return;

    if (!email) {
        container.innerHTML = `<p class="text-red-500">Please log in to see your requests.</p>`;
        return;
    }

    try {
        const res = await fetch(`${baseURL}/api/bookings/all_by_renter?renterEmail=${encodeURIComponent(email)}`);
        const requests = await res.json();

        const sorted = Array.isArray(requests)
            ? [...requests].sort((a, b) => tsMillis(b) - tsMillis(a))  // NEW: newest first
            : [];

        if (sorted.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No requests yet.</p>`;
            return;
        }

        container.innerHTML = sorted.map(req => {
            const room = req.room || {};
            const provider = room.provider || {};
            const status = (req.status || "PENDING_REQUEST").toUpperCase();

            const whenMs = tsMillis(req) || Date.now();
            const date = new Date(whenMs).toLocaleString();

            const badge = `<span class="px-3 py-1 rounded-full text-white text-sm ${badgeClass(status)}">${status}</span>`;

            return `
        <div class="bg-white rounded-xl shadow p-5 flex flex-col md:flex-row gap-6">
          <img src="${room.imageUrl || ""}" alt="Room Image" class="w-full md:w-1/3 h-48 object-cover rounded-lg" />
          <div class="flex-1 space-y-1">
            <p><strong>🏠 Title:</strong> ${room.title || "N/A"}</p>
            <p><strong>💰 Rent:</strong> ৳${room.rent ?? "-"}</p>
            <p><strong>📍 Location:</strong> ${room.location || "-"}</p>
            <p><strong>🏷 Type:</strong> ${room.type || "-"}</p>
            <p><strong>📅 Requested on:</strong> ${date}</p>
            <p><strong>👤 Provider:</strong> ${provider.name || "Unknown"} (${provider.email || ""})</p>
          </div>
          <div class="flex flex-col items-end justify-between">
            ${badge}
            ${status === "PENDING_REQUEST"
                ? `<button onclick="showCancelModal(${req.id})"
                   class="mt-4 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-sm">❌ Cancel Request</button>`
                : ""}
          </div>
        </div>`;
        }).join("");
    } catch (err) {
        console.error("Error loading requests:", err);
        container.innerHTML = `<p class="text-red-500">Failed to load requests.</p>`;
    }
}


// =================== AWAITING PAYMENT ===================
let countdownIntervals = {}; // id -> intervalId

async function loadAwaitingPayments() {
    const email = localStorage.getItem("email");
    const section = byId("confirmationSection");
    const list = byId("confirmationList");
    const note = byId("confirmationNote");
    const msg  = byId("confirmationStatus");
    if (!section || !list) return;

    section.classList.add("hidden");
    note?.classList.add("hidden");
    list.innerHTML = "";
    if (msg) msg.textContent = "";

    if (!email) return;

    try {
        const res = await fetch(`${baseURL}/api/bookings/awaiting?renterEmail=${encodeURIComponent(email)}`);
        const bookings = await res.json();

        // clear timers
        for (const id in countdownIntervals) clearInterval(countdownIntervals[id]);
        countdownIntervals = {};

        if (!Array.isArray(bookings) || bookings.length === 0) return;

        section.classList.remove("hidden");
        note?.classList.remove("hidden");

        const rows = await Promise.all(bookings.map(async (b) => {
            const r = b.room || {};
            const deposit = Math.round((r.rent || 0) * 0.25);

            // check if there is a PENDING payment already
            let pending = false;
            let pendingInfo = null;
            try {
                const resp = await fetch(`${baseURL}/api/payments?status=PENDING&bookingId=${b.id}`);
                if (resp.ok) {
                    const arr = await resp.json();
                    pending = Array.isArray(arr) && arr.length > 0;
                    pendingInfo = pending ? arr[0] : null;
                }
            } catch {}

            if (pending) {
                return `
          <div class="bg-white rounded-xl shadow p-5 space-y-2">
            <img src="${r.imageUrl || ""}" class="h-40 w-full object-cover rounded mb-2" />
            <div class="flex items-start justify-between gap-3">
              <h3 class="font-bold text-lg">${r.title || "Room"}</h3>
              <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${roomCode(r)}</span>
            </div>
            <p class="text-sm text-gray-600">📍 ${r.location || "-"}</p>
            <p class="text-sm text-gray-600">💰 Rent: ৳${r.rent ?? "-"}</p>
            <p class="text-sm text-gray-600">🔖 25% Deposit: <span class="font-semibold">৳${deposit}</span></p>
            <p class="text-sm text-indigo-700 font-medium">⏳ Waiting for admin confirmation</p>
            <p class="text-xs text-gray-500">Ref: ${pendingInfo?.reference || "-"}</p>
          </div>`;
            }

            // No pending payment → show timer + Pay button
            const cdId = `cd-${b.id}`;
            setTimeout(() => startDeadlineCountdown(cdId, b.paymentDeadline), 0);

            return `
        <div class="bg-white rounded-xl shadow p-5 space-y-2">
          <img src="${r.imageUrl || ""}" class="h-40 w-full object-cover rounded mb-2" />
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-bold text-lg">${r.title || "Room"}</h3>
            <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${roomCode(r)}</span>
          </div>
          <p class="text-sm text-gray-600">📍 ${r.location || "-"}</p>
          <p class="text-sm text-gray-600">💰 Rent: ৳${r.rent ?? "-"}</p>
          <p class="text-sm text-gray-600">🔖 25% Deposit: <span class="font-semibold">৳${deposit}</span></p>
          <p class="text-sm text-gray-600">⏳ Time left: <span id="${cdId}" class="font-semibold text-indigo-700">--:--:--</span></p>
          <div class="pt-2">
            <button onclick="payDeposit(${b.id}, ${deposit})"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
              Pay 25% (send to admin)
            </button>
          </div>
        </div>`;
        }));

        list.innerHTML = rows.join("");
        if (msg) msg.textContent = "Admin receives your 25% deposit and confirms the booking.";
    } catch (err) {
        console.error("Failed to load awaiting payments", err);
    }
}

// ---------- pay 25% ----------
function payDeposit(bookingId, amount) {
    window.location.href = `payment.html?bookingId=${encodeURIComponent(bookingId)}&amount=${encodeURIComponent(amount)}`;
}

// =================== VISIT WINDOW (with decision modal) ===================
let decisionBookingId = null;
let decisionAction = null; // "REFUND" | "COMPLETE"

async function loadVisitWindow() {
    const email = localStorage.getItem("email");
    const section = byId("visitSection");
    const list = byId("visitList");
    if (!section || !list) return;

    section.classList.add("hidden");
    list.innerHTML = "";

    if (!email) return;

    try {
        const res = await fetch(`${baseURL}/api/bookings/visit?renterEmail=${encodeURIComponent(email)}`);
        const bookings = await res.json();

        if (!Array.isArray(bookings) || bookings.length === 0) return;

        section.classList.remove("hidden");

        list.innerHTML = bookings.map(b => {
            const r = b.room || {};
            const deadlineMs = b.viewingDeadline ? new Date(b.viewingDeadline).getTime() : null;
            const cdId = `visit-cd-${b.id}`;

            // If renter already submitted a decision, show status and DO NOT show timer/buttons
            const decision = (b.decisionStatus || "NONE").toUpperCase();
            const decided = decision !== "NONE";

            const statusChip = decided
                ? decision === "REFUND_REQUESTED"
                    ? `<span class="inline-block px-3 py-1 rounded bg-red-100 text-red-700 font-medium">Refund requested</span>`
                    : `<span class="inline-block px-3 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">Completion requested</span>`
                : "";

            if (!decided) setTimeout(() => startCountdown(cdId, deadlineMs), 0);

            const actionArea = decided
                ? `<p class="text-sm text-gray-600">Waiting for admin to process your request.</p>`
                : `
          <div class="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-1">
            <button onclick="openDecisionModal('REFUND', ${b.id})"
                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Request Refund
            </button>
            <button onclick="openDecisionModal('COMPLETE', ${b.id})"
                    class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded">
              Confirm Completion
            </button>
          </div>`;

            return `
        <div class="bg-white rounded-xl shadow p-5 space-y-2">
          <img src="${r.imageUrl || ""}" class="h-40 w-full object-cover rounded mb-2" />
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-bold text-lg">${r.title || "Room"}</h3>
            <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${roomCode(r)}</span>
          </div>
          <p class="text-sm text-gray-600">📍 ${r.location || "-"}</p>
          <p class="text-sm text-gray-600">💰 Rent: ৳${r.rent ?? "-"}</p>
          ${decided ? "" : `<p class="text-sm text-gray-600">⏳ Visit before: <span id="${cdId}" class="font-semibold">--:--:--</span></p>`}
          <div class="pt-2 text-sm text-gray-600">
            <p>✔ If you like the room, pay the remaining 75% offline and confirm completion.</p>
            <p>↩ If you don’t like it, request a refund from admin.</p>
          </div>
          <div class="pt-2">${statusChip}</div>
          ${actionArea}
        </div>`;
        }).join("");
    } catch (e) {
        console.error("Failed to load visit window", e);
    }
}

// ---- Decision modal helpers ----
function openDecisionModal(action, bookingId) {
    decisionAction = action;           // "REFUND" | "COMPLETE"
    decisionBookingId = bookingId;

    byId("decisionTitle").textContent =
        action === "REFUND" ? "Request Refund" : "Confirm Completion";

    // elements (wrapper is optional)
    const wrap  = byId("decisionNoteWrap");    // may not exist
    const label = byId("decisionNoteLabel");   // may exist
    const ta    = byId("decisionNoteInput");   // textarea (exists)

    if (action === "REFUND") {
        // show note
        wrap ? wrap.classList.remove("hidden") : (label && label.classList.remove("hidden"), ta?.classList.remove("hidden"));
        if (label) label.textContent = "Optional note for admin (why refund / any info):";
        if (ta) {
            ta.placeholder = "Say why you'd like a refund (optional)";
            ta.value = "";
        }
    } else {
        // hide note for completion
        wrap ? wrap.classList.add("hidden") : (label && label.classList.add("hidden"), ta?.classList.add("hidden"));
        if (ta) ta.value = "";
    }

    byId("decisionModal").classList.remove("hidden");
}

function closeDecisionModal() {
    byId("decisionModal").classList.add("hidden");
    decisionAction = null;
    decisionBookingId = null;
}

async function submitDecision() {
    if (!decisionBookingId || !decisionAction) return;
    const ta = byId("decisionNoteInput");
    const note = (decisionAction === "REFUND" && ta) ? ta.value.trim() : "";

    try {
        const res = await fetch(
            `${baseURL}/api/bookings/${decisionBookingId}/decision?action=${decisionAction}&note=${encodeURIComponent(note)}`,
            { method: "POST" }
        );
        const text = await res.text();
        if (!res.ok) throw new Error(text);

        toast(decisionAction === "REFUND" ? "Refund request submitted." : "Completion request submitted.");

        closeDecisionModal();
        await loadVisitWindow();
        await loadRecentUpdates();
    } catch (e) {
        toast(e.message || "Failed to submit decision", false);
    }
}

// ---------- countdowns ----------
function startDeadlineCountdown(elId, deadlineIso) {
    if (!deadlineIso) return;
    const el = byId(elId);
    if (!el) return;
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => {
        const now = Date.now();
        let diff = Math.max(0, Math.floor((deadline - now) / 1000));
        const d = Math.floor(diff / 86400);
        diff -= d * 86400;
        const h = Math.floor(diff / 3600);
        diff -= h * 3600;
        const m = Math.floor(diff / 60);
        const s = diff - m * 60;
        el.textContent = `${d}d ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    };
    tick();
    countdownIntervals[elId] = setInterval(tick, 1000);
}

function startCountdown(elId, deadlineMs) {
    if (!deadlineMs) return;
    const el = byId(elId);
    if (!el) return;
    const tick = () => {
        const now = Date.now();
        let diff = Math.max(0, Math.floor((deadlineMs - now) / 1000));
        const d = Math.floor(diff / 86400); diff -= d * 86400;
        const h = Math.floor(diff / 3600);  diff -= h * 3600;
        const m = Math.floor(diff / 60);    const s = diff - m * 60;
        el.textContent = `${d}d ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    };
    tick();
    setInterval(tick, 1000);
}

// =================== RECENT UPDATES (optional section) ===================
async function loadRecentUpdates() {
    const email = localStorage.getItem("email");
    const sec = byId("recentUpdatesSec");
    const list = byId("recentUpdatesList");
    if (!sec || !list || !email) return; // silently skip if section not present

    list.innerHTML = "";
    sec.classList.add("hidden");

    try {
        const res = await fetch(`${baseURL}/api/updates/renter?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(await res.text());
        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) return;

        sec.classList.remove("hidden");
        list.innerHTML = items.map(renderUpdateItem).join("");
    } catch (e) {
        console.warn("Updates load failed:", e.message);
    }
}

function renderUpdateItem(u) {
    const type = (u.type || "INFO").toUpperCase();
    const meta = {
        COMPLETE_DONE:  { icon: "✅", tone: "bg-emerald-50 border-emerald-200", title: "Thank you for choosing RentoVerse" },
        REFUND_DONE:    { icon: "💸", tone: "bg-blue-50 border-blue-200",     title: "Refund processed" },
        REFUND_PENDING: { icon: "⏳", tone: "bg-amber-50 border-amber-200",    title: "Refund requested" },
        INFO:           { icon: "📝", tone: "bg-gray-50 border-gray-200",      title: "Update" }
    }[type] || { icon: "📝", tone: "bg-gray-50 border-gray-200", title: "Update" };

    const when = timeAgo(u.createdAtTs || u.createdAt);
    const room = u.roomTitle ? ` — <span class="font-medium">${escapeHtml(u.roomTitle)}</span>` : "";
    const code = u.roomCode ? ` <span class="text-xs bg-gray-100 px-2 py-0.5 rounded ml-1">${escapeHtml(u.roomCode)}</span>` : "";
    const msg  = escapeHtml(u.message || "");

    return `
    <li class="border ${meta.tone} rounded-lg p-3">
      <div class="flex items-start gap-3">
        <div class="text-lg leading-none">${meta.icon}</div>
        <div class="flex-1">
          <div class="font-semibold">${meta.title}${room}${code}</div>
          <div class="text-sm text-gray-700 mt-0.5">${msg}</div>
          <div class="text-xs text-gray-500 mt-1">${when}</div>
        </div>
      </div>
    </li>`;
}

function timeAgo(ts) {
    let t = ts;
    if (typeof ts === "string") t = Date.parse(ts);
    const diff = Math.max(0, Date.now() - (typeof t === "number" ? t : 0));
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
}

function escapeHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}