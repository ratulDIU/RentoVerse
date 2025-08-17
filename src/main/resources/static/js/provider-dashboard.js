const baseURL = `${window.location.origin}`;

/* ---------- tiny UI helpers ---------- */
const chipWaiting = `
  <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm">
    ⏳ Waiting for admin confirmation
  </span>`;
const chipPaid = (when) => `
  <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-sm">
    ✅ Paid ${when ? new Date(when).toLocaleString() : ""}
  </span>`;
const payoutButton = (bid, code) => `
  <button class="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded req-payout-btn"
          onclick="openPayoutModal(${bid}, '${code.replace(/'/g, "\\'")}')">
    💸 Request 25% Payout
  </button>`;

document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("name") || "Unknown";
    const email = localStorage.getItem("email") || "Unknown";
    document.getElementById("providerName").innerText = name;
    document.getElementById("providerEmail").innerText = email;

    // payout modal wiring
    const hide = () => document.getElementById("payoutReqModal").classList.add("hidden");
    document.getElementById("prClose").addEventListener("click", hide);
    document.getElementById("prBackdrop").addEventListener("click", hide);
    document.getElementById("payoutForm").addEventListener("submit", submitPayoutRequest);

    loadMyRooms();
    loadBookingRequests();
});

function logout(){ localStorage.clear(); location.href = "login.html"; }

function showToast(message, success = true) {
    const toast = document.createElement("div");
    toast.className = `fixed top-5 right-5 z-50 px-5 py-3 rounded shadow-lg text-white text-sm font-semibold transition-all duration-300 ${success ? "bg-green-600" : "bg-red-600"}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ---------- helpers ----------
function roomPublicCode(room){ return room?.publicCode || `RENTO:${100 + (room?.id ?? 0)}`; }
function normalizeStatus(s){ if(!s) return "PENDING"; const u=String(s).toUpperCase(); if(u==="PENDING_REQUEST"||u==="REQUESTED") return "PENDING"; return u; }
function badgeClass(status){
    switch (status) {
        case "PENDING": return "bg-yellow-500";
        case "AWAITING_PAYMENT": return "bg-indigo-600";
        case "PAID_CONFIRMED":
        case "CONFIRMED": return "bg-green-600";
        case "COMPLETED": return "bg-green-700";
        case "DECLINED": return "bg-red-600";
        case "EXPIRED_UNPAID":
        case "EXPIRED_NO_VISIT":
        case "CANCELLED_AFTER_VIEWING": return "bg-gray-600";
        default: return "bg-slate-500";
    }
}

// ========================== ROOMS ==========================
async function loadMyRooms() {
    const email = localStorage.getItem("email");
    const container = document.getElementById("myRooms");
    if (!container) return;

    if (!email) {
        container.innerHTML = `<p class="text-red-500">❌ Logged in email missing. Please login again.</p>`;
        return;
    }

    try {
        const res = await fetch(`${baseURL}/api/rooms/provider?email=${encodeURIComponent(email)}`);
        const rooms = await res.json();

        if (!Array.isArray(rooms) || rooms.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No rooms posted yet.</p>`;
            return;
        }

        container.innerHTML = rooms.map(room => {
            const code = roomPublicCode(room);
            const img = room.imageUrl || "https://via.placeholder.com/600x300";
            return `
        <div class="bg-white rounded-xl shadow p-4">
          <img src="${img}" alt="Room" class="h-40 w-full object-cover rounded-md mb-3" />
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-bold text-lg">${room.title || "-"}</h3>
              <p class="text-sm text-gray-600 mt-0.5">৳${room.rent} • ${room.type} • ${room.location}</p>
            </div>
            <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${code}</span>
          </div>
          <p class="text-gray-500 text-sm mt-2">${room.description || "-"}</p>
          <button onclick="deleteRoom('${room.id}')" class="mt-3 bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600">🗑️ Delete</button>
        </div>`;
        }).join("");
    } catch (err) {
        console.error("❌ Error loading rooms:", err);
        container.innerHTML = `<p class="text-red-500">Failed to load rooms.</p>`;
    }
}

async function deleteRoom(roomId) {
    const container = document.getElementById("myRooms");
    if (!container) return;

    const status = document.createElement("p");
    status.className = "text-blue-600 font-medium mb-3";
    status.innerText = "⏳ Deleting room...";
    container.prepend(status);

    try {
        const res = await fetch(`${baseURL}/api/rooms/${roomId}`, { method: "DELETE" });
        if (res.ok) {
            status.innerText = "✅ Room deleted successfully!";
            setTimeout(loadMyRooms, 800);
        } else {
            status.innerText = "❌ Failed to delete room";
        }
    } catch (err) {
        console.error("Error deleting room:", err);
        status.innerText = "❌ Something went wrong while deleting.";
    }
}

// ========================== BOOKINGS ==========================
async function respondRequest(requestId, action) {
    try {
        const res = await fetch(
            `${baseURL}/api/bookings/respond?bookingId=${requestId}&action=${action.toUpperCase()}`,
            { method: "POST" }
        );

        if (res.ok) {
            showToast(`Booking ${action.toUpperCase()} successful ✅`, true);
            setTimeout(loadBookingRequests, 400);
        } else {
            showToast("❌ Failed to respond: " + await res.text(), false);
        }
    } catch (err) {
        console.error("Error responding to request:", err);
        showToast("❌ Error occurred while responding.", false);
    }
}

async function loadBookingRequests() {
    const email = localStorage.getItem("email");
    const container = document.getElementById("bookingRequests");
    if (!container) return;

    if (!email) {
        container.innerHTML = `<p class="text-red-500">Email missing. Please log in again.</p>`;
        return;
    }

    try {
        const res = await fetch(`${baseURL}/api/bookings/request_list?email=${encodeURIComponent(email)}`);
        const requests = await res.json();

        if (!Array.isArray(requests) || requests.length === 0) {
            container.innerHTML = `<p class="text-gray-500">No booking requests yet.</p>`;
            return;
        }

        // most recent first
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = requests.map(req => {
            const room = req.room || {};
            const renter = req.renter || {};
            const imageUrl = room.imageUrl || "https://via.placeholder.com/600x300";
            const date = req.createdAt ? new Date(req.createdAt).toLocaleString() : "Unknown";
            const rawStatus = req.status || "PENDING";
            const status = normalizeStatus(rawStatus);
            const code = roomPublicCode(room);

            const badge = `<span class="px-3 py-1 rounded-full text-white text-sm ${badgeClass(status)}">${status}</span>`;

            const depositLine =
                status === "AWAITING_PAYMENT" && (req.depositAmount || room.rent)
                    ? `<p class="text-sm text-gray-600 mt-1">🔖 25% Deposit: ৳${req.depositAmount ?? Math.round((room.rent || 0) * 0.25)}</p>`
                    : "";

            const deadlineLine =
                (status === "AWAITING_PAYMENT" && req.paymentDeadline)
                    ? `<p class="text-sm text-gray-600 mt-0.5">⏳ Pay by: ${new Date(req.paymentDeadline).toLocaleString()}</p>`
                    : (status === "PAID_CONFIRMED" && req.viewingDeadline)
                        ? `<p class="text-sm text-gray-600 mt-0.5">🕒 Visit by: ${new Date(req.viewingDeadline).toLocaleString()}</p>`
                        : "";

            // payout area container (only for COMPLETED)
            const payoutArea =
                status === "COMPLETED"
                    ? `<div id="payoutArea-${req.id}" class="mt-2"></div>`
                    : "";

            const actionSection =
                status === "PENDING"
                    ? `
            <div class="actions flex flex-col gap-2">
              <button onclick="respondRequest(${req.id}, 'APPROVE')"
                      class="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600">✅ Approve</button>
              <button onclick="respondRequest(${req.id}, 'DECLINE')"
                      class="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600">❌ Decline</button>
            </div>`
                    : `
            <div class="actions">
              ${badge}
              ${depositLine}
              ${deadlineLine}
              ${payoutArea}
            </div>`;

            return `
        <div id="booking-${req.id}" class="bg-white rounded-xl shadow p-5 flex flex-col md:flex-row gap-6">
          <img src="${imageUrl}" alt="Room Image" class="w-full md:w-1/3 h-48 object-cover rounded-lg" />
          <div class="flex-1 space-y-1">
            <div class="flex items-start justify-between gap-3">
              <p><strong>🏠 Title:</strong> ${room.title || "N/A"}</p>
              <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded whitespace-nowrap">${code}</span>
            </div>
            <p><strong>💰 Rent:</strong> ৳${room.rent ?? "-"}</p>
            <p><strong>📍 Location:</strong> ${room.location || "-"}</p>
            <p><strong>🏷 Type:</strong> ${room.type || "-"}</p>
            <p><strong>📝 Description:</strong> ${room.description || "-"}</p>
            <p><strong>📅 Requested on:</strong> ${date}</p>
            <p><strong>👤 Renter:</strong> ${renter.name || "Unknown"} (${renter.email || ""})</p>
          </div>
          ${actionSection}
        </div>`;
        }).join("");

        // For each COMPLETED booking: decide what to show in payoutArea (button / waiting / paid)
        for (const req of requests) {
            if (normalizeStatus(req.status) !== "COMPLETED") continue;
            const area = document.getElementById(`payoutArea-${req.id}`);
            if (!area) continue;
            await updatePayoutArea(req.id, roomPublicCode(req.room || {}), area);
        }

    } catch (err) {
        console.error("Error loading booking requests:", err);
        container.innerHTML = `<p class="text-red-500">Failed to load requests.</p>`;
    }
}

/* ---------- payout modal + submit ---------- */
function openPayoutModal(bookingId, roomCode){
    document.getElementById("prBookingId").value = bookingId;
    document.getElementById("prRoomCode").value = roomCode || "";
    document.getElementById("payoutReqModal").classList.remove("hidden");
}

async function submitPayoutRequest(e){
    e.preventDefault();
    const bookingId = document.getElementById("prBookingId").value;
    const method    = document.getElementById("prMethod").value;
    const account   = document.getElementById("prAccount").value.trim();
    const roomCode  = document.getElementById("prRoomCode").value.trim();

    if (!bookingId || !account){ showToast("Please enter account/number.", false); return; }

    try{
        const res = await fetch(`${baseURL}/api/provider-payouts/request`, {
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ bookingId, method, account, roomCode })
        });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt||"Failed");

        showToast("Request submitted. Waiting for admin confirm ✅", true);
        document.getElementById("payoutReqModal").classList.add("hidden");

        // UI: immediately flip the button to waiting (no second click)
        const area = document.getElementById(`payoutArea-${bookingId}`);
        if (area) area.innerHTML = chipWaiting;

        // and softly refresh list (optional)
        setTimeout(loadBookingRequests, 600);

    }catch(err){
        showToast(err.message || "Failed to submit.", false);
    }
}

/* ---------- payout area updater ---------- */
async function updatePayoutArea(bookingId, roomCode, areaEl){
    const area = areaEl || document.getElementById(`payoutArea-${bookingId}`);
    if (!area) return;

    try {
        const r = await fetch(`${baseURL}/api/provider-payouts/by-booking/${bookingId}`);
        if (!r.ok) { area.innerHTML = payoutButton(bookingId, roomCode); return; }
        const p = await r.json();
        const s = String(p.status || "").toUpperCase();
        if (s === "REQUESTED")      area.innerHTML = chipWaiting;
        else if (s === "PAID")      area.innerHTML = chipPaid(p.updatedAt || p.paidAt);
        else                        area.innerHTML = payoutButton(bookingId, roomCode);
    } catch {
        area.innerHTML = payoutButton(bookingId, roomCode);
    }
}