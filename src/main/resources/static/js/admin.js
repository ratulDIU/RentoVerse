const BASE = window.location.origin;

function setMsg(el, text, ok = true) {
    if (!el) return;
    el.textContent = text;
    el.className = `text-sm mt-2 ${ok ? "text-green-700" : "text-red-600"}`;
}

// ✅ Mark deposit paid by booking ID
async function markDepositPaid() {
    const idInput = document.getElementById("bookingIdInput");
    const msg = document.getElementById("confirmMsg");
    setMsg(msg, "");

    const id = (idInput?.value || "").trim();
    if (!id) {
        return setMsg(msg, "Please enter a Booking ID.", false);
    }

    try {
        const res = await fetch(`${BASE}/api/bookings/${encodeURIComponent(id)}/deposit-paid`, {
            method: "POST",
        });

        const text = await res.text();
        setMsg(msg, res.ok ? `✅ ${text}` : `❌ ${text}`, res.ok);
    } catch (e) {
        setMsg(msg, `❌ Request failed: ${e.message}`, false);
    }
}

// 🔎 Helper: list awaiting-payment bookings by renter email
async function listAwaitingByRenter() {
    const emailInput = document.getElementById("renterEmailInput");
    const list = document.getElementById("awaitingList");
    list.innerHTML = "";

    const email = (emailInput?.value || "").trim();
    if (!email) {
        list.innerHTML = `<div class="text-red-600 text-sm">Please enter renter email.</div>`;
        return;
    }

    try {
        // 1) find user by email
        const ur = await fetch(`${BASE}/api/users/by-email?email=${encodeURIComponent(email)}`);
        if (!ur.ok) {
            list.innerHTML = `<div class="text-red-600 text-sm">User not found.</div>`;
            return;
        }
        const user = await ur.json();
        if (!user?.id) {
            list.innerHTML = `<div class="text-red-600 text-sm">User id not available.</div>`;
            return;
        }

        // 2) fetch awaiting bookings for that renter
        const br = await fetch(`${BASE}/api/bookings/awaiting?renterId=${user.id}`);
        if (!br.ok) {
            list.innerHTML = `<div class="text-red-600 text-sm">Failed to load bookings.</div>`;
            return;
        }
        const bookings = await br.json();
        if (!Array.isArray(bookings) || bookings.length === 0) {
            list.innerHTML = `<div class="text-gray-600 text-sm">No AWAITING_PAYMENT bookings for this renter.</div>`;
            return;
        }

        // 3) render
        list.innerHTML = bookings
            .map((b) => {
                const r = b.room || {};
                const deposit = b.depositAmount ?? Math.round((r.rent || 0) * 0.25);
                const deadline = b.expiresAt ? new Date(b.expiresAt).toLocaleString() : "-";
                return `
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Booking ID: ${b.id}</div>
              <span class="text-xs bg-indigo-600 text-white px-2 py-1 rounded">AWAITING_PAYMENT</span>
            </div>
            <div class="text-sm text-gray-700 mt-2">
              <div>🏠 ${r.title || "Room"}</div>
              <div>📍 ${r.location || "-"}</div>
              <div>💰 Rent: ৳${r.rent || "-"}</div>
              <div>🔖 25% Deposit: ৳${deposit}</div>
              <div>⏳ Deadline: ${deadline}</div>
            </div>
            <div class="mt-3">
              <button onclick="quickConfirm(${b.id})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                Mark Deposit Paid
              </button>
            </div>
          </div>
        `;
            })
            .join("");
    } catch (e) {
        list.innerHTML = `<div class="text-red-600 text-sm">Error: ${e.message}</div>`;
    }
}

// convenience: call markDepositPaid with a preset id and refresh list
async function quickConfirm(id) {
    const msg = document.getElementById("confirmMsg");
    document.getElementById("bookingIdInput").value = id;
    await markDepositPaid();
    // re-run renter list if visible
    await listAwaitingByRenter();
}
