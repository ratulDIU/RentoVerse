const baseURL = window.location.origin;
const el = (id) => document.getElementById(id);

/* helpers */
const esc = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
const truncate = (s, n = 40) => (s.length > n ? s.slice(0, n) + "…" : s);
const up = (v) => String(v || "").toUpperCase();

/* NEW: newest-first timestamp + status order helpers */
function stamp(p) {
    const t = p.updatedAt ?? p.confirmedAt ?? p.createdAt ?? p.created_at ?? p.createdAtTs ?? p.timestamp;
    if (!t) return 0;
    if (typeof t === "object" && "seconds" in t) {
        return t.seconds * 1000 + (t.nanoseconds || 0) / 1e6;
    }
    if (typeof t === "number") return t;
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? 0 : ms;
}
const STATUS_ORDER = { PENDING: 0, CONFIRMED: 1, REFUNDED: 2, FAILED: 3 };

let currentPayout = null;

document.addEventListener("DOMContentLoaded", () => {
    setupAdminHeader();

    // payout modal wiring
    const hide = () => el("payoutModal").classList.add("hidden");
    el("payoutClose")?.addEventListener("click", hide);
    el("payoutClose2")?.addEventListener("click", hide);
    el("payoutBackdrop")?.addEventListener("click", hide);
    el("payoutMarkPaid")?.addEventListener("click", markPayoutPaid);

    el("applyFilters").addEventListener("click", loadPayments);
    el("filterOverdue").addEventListener("change", loadPayments);
    loadPayments();
});

/* ---------- Admin header ---------- */
function setupAdminHeader() {
    const box = el("adminInfo");
    if (!box) return;
    const name = localStorage.getItem("adminName") || "Admin";
    const email = localStorage.getItem("adminEmail") || "";
    el("adminName").textContent = name;
    el("adminEmail").textContent = email;
    box.classList.remove("hidden");
    const toggle = el("adminToggle");
    const dd = el("adminDropdown");
    toggle?.addEventListener("click", () => dd.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
        if (!toggle.contains(e.target) && !dd.contains(e.target)) dd.classList.add("hidden");
    });
}
function logout() {
    localStorage.clear();
    location.href = "login.html";
}

/* ---------- Payments ---------- */
function toast(msg, ok = true) {
    const t = el("toast");
    t.textContent = msg;
    t.className = `fixed bottom-6 right-6 px-4 py-2 rounded text-white shadow-lg ${
        ok ? "bg-green-600" : "bg-red-600"
    }`;
    t.classList.remove("hidden");
    setTimeout(() => t.classList.add("hidden"), 2500);
}

async function loadPayments() {
    const status = el("filterStatus").value.trim();
    const bookingId = el("filterBooking").value.trim();
    const renterEmail = el("filterEmail").value.trim();

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (bookingId) params.set("bookingId", bookingId);
    if (renterEmail) params.set("renterEmail", renterEmail);

    try {
        const res = await fetch(`${baseURL}/api/payments?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        let items = await res.json();

        const overdueOnly = el("filterOverdue").checked;
        if (overdueOnly) items = items.filter(isOverdue);

        /* NEW: sort so that PENDING first, then newest first within same status */
        items.sort((a, b) => {
            const sa = STATUS_ORDER[up(a.status)] ?? 99;
            const sb = STATUS_ORDER[up(b.status)] ?? 99;
            if (sa !== sb) return sa - sb;     // status grouping
            return stamp(b) - stamp(a);        // newest first
        });

        renderPayments(items);
    } catch (e) {
        toast("Failed to load payments: " + e.message, false);
        el("paymentsBody").innerHTML =
            `<tr><td colspan="17" class="px-4 py-3 text-red-600">Failed to load payments.</td></tr>`;
    }
}

function isOverdue(p) {
    const now = Date.now();
    if (p.status === "PENDING" && p.paymentDeadline) return new Date(p.paymentDeadline).getTime() < now;
    if (p.status === "CONFIRMED" && p.viewingDeadline) return new Date(p.viewingDeadline).getTime() < now;
    return false;
}
const overdueBadge = (p) =>
    isOverdue(p)
        ? `<span class="ml-2 text-xs px-2 py-0.5 rounded bg-red-600 text-white align-middle">OVERDUE</span>`
        : "";

function decisionChip(p) {
    const d = up(p.decisionStatus || p.bookingDecision);
    if (!d || d === "NONE") return `<span class="text-gray-400">—</span>`;
    const map = {
        REFUND_REQUESTED: "bg-red-100 text-red-700",
        COMPLETE_REQUESTED: "bg-emerald-100 text-emerald-700",
        COMPLETION_REQUESTED: "bg-emerald-100 text-emerald-700",
    };
    const cls = map[d] || "bg-gray-100 text-gray-700";
    return `<span class="px-2 py-1 rounded text-xs ${cls}">${d.replaceAll("_", " ")}</span>`;
}
function windowText(p) {
    try {
        if (p.status === "PENDING" && p.paymentDeadline) return `Pay by ${new Date(p.paymentDeadline).toLocaleString()}`;
        if (p.status === "CONFIRMED" && p.viewingDeadline) return `Visit by ${new Date(p.viewingDeadline).toLocaleString()}`;
    } catch (_) {}
    return "—";
}
function resolveNote(p) {
    const dn = (p.decisionNote || "").trim();
    const pn = (p.note || "").trim();
    return dn || pn;
}
function resolveRoomCode(p) {
    if (p.roomCode && String(p.roomCode).trim()) return p.roomCode;
    if (p.roomId != null && String(p.roomId).trim() !== "") return String(p.roomId);
    if (p.reference) {
        const m = String(p.reference).match(/ROOM:([A-Za-z0-9:-]+)/);
        if (m) return m[1];
    }
    return "-";
}

/* final/terminal booking states where actions must be hidden */
function isFinalBooking(p) {
    const bs = up(p.bookingStatus);
    return bs === "COMPLETED" || bs === "CANCELLED_AFTER_VIEWING" || bs === "EXPIRED_UNPAID" || bs === "EXPIRED_NO_VISIT";
}

/* payout helpers */
function payoutBadge(status) {
    const map = {
        REQUESTED: "bg-purple-100 text-purple-700",
        PAID: "bg-green-100 text-green-700",
        REJECTED: "bg-red-100 text-red-700",
    };
    const cls = map[status] || "bg-gray-100 text-gray-700";
    return `<span class="px-2 py-1 rounded text-xs ${cls}">${status || "—"}</span>`;
}

async function openPayoutForBooking(bookingId) {
    try {
        const res = await fetch(`${baseURL}/api/provider-payouts/by-booking/${bookingId}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json(); // flat view
        currentPayout = data;

        el("po_booking").textContent = `#${data.bookingId}`;
        el("po_provider").textContent = data.providerEmail || "-";
        el("po_room").textContent = data.roomCode || "-";
        el("po_method").textContent = data.method || "-";
        el("po_account").textContent = data.account || "-";
        el("po_requested").textContent = data.createdAt ? new Date(data.createdAt).toLocaleString() : "-";
        el("po_status").innerHTML = payoutBadge(data.status);

        const btn = el("payoutMarkPaid");
        if (up(data.status) === "PAID") {
            btn.disabled = true;
            btn.classList.add("opacity-50", "cursor-not-allowed");
        } else {
            btn.disabled = false;
            btn.classList.remove("opacity-50", "cursor-not-allowed");
        }

        el("payoutModal").classList.remove("hidden");
    } catch (e) {
        toast("No payout request found for this booking (or failed to load).", false);
    }
}
async function markPayoutPaid() {
    if (!currentPayout) return;
    try {
        const res = await fetch(`${baseURL}/api/provider-payouts/${currentPayout.id}/mark-paid`, { method: "POST" });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt || "Failed");
        toast("Payout marked as PAID & provider notified ✅");
        el("payoutModal").classList.add("hidden");
        await loadPayments();
    } catch (e) {
        toast(e.message || "Failed to mark paid", false);
    }
}

function renderPayments(items) {
    const body = el("paymentsBody");
    if (!Array.isArray(items) || items.length === 0) {
        body.innerHTML = `<tr><td colspan="17" class="px-4 py-3 text-gray-500">No payments found.</td></tr>`;
        return;
    }

    body.innerHTML = items
        .map((p) => {
            const amount = p.amount != null ? `৳${p.amount}` : "-";
            const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : "-";
            const confirmed = p.confirmedAt ? new Date(p.confirmedAt).toLocaleString() : "-";
            const bookingTxt = p.bookingId ? `#${p.bookingId}` : "-";
            const renterTxt = p.renterEmail || "-";
            const room = resolveRoomCode(p);

            const statusBadge = (s) => {
                const map = { PENDING: "bg-yellow-500", CONFIRMED: "bg-green-600", REFUNDED: "bg-gray-600", FAILED: "bg-red-600" };
                return `<span class="px-2 py-1 rounded text-white ${map[s] || "bg-slate-500"}">${s}</span>`;
            };

            const noteFull = resolveNote(p);
            const noteCell = noteFull
                ? `<span title="${esc(noteFull)}" style="max-width:220px;display:inline-block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(
                    truncate(noteFull, 40)
                )}</span>`
                : `<span class="text-gray-400">—</span>`;

            // payout column
            const payoutStatus = up(p.providerPayoutStatus);
            const payoutCell = payoutStatus
                ? `<div class="flex items-center gap-2">
             ${payoutBadge(payoutStatus)}
             ${
                    p.bookingId
                        ? `<button class="text-xs px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white"
                        data-act="payout-view" data-bid="${p.bookingId}">Pay</button>`
                        : ""
                }
           </div>`
                : `<span class="text-gray-400">—</span>`;

            const actions = actionButtons(p);

            return `
        <tr class="border-b last:border-b-0 ${isOverdue(p) ? "bg-red-50" : ""}">
          <td class="px-4 py-2 font-medium">PMT-${p.id}</td>
          <td class="px-4 py-2">${bookingTxt}</td>
          <td class="px-4 py-2">${renterTxt}</td>
          <td class="px-4 py-2">${p.payerName || "-"}</td>
          <td class="px-4 py-2">${p.payerPhone || "-"}</td>
          <td class="px-4 py-2">${room}</td>
          <td class="px-4 py-2">${p.txnId || "-"}</td>
          <td class="px-4 py-2">${amount}</td>
          <td class="px-4 py-2">${p.method || "-"}</td>
          <td class="px-4 py-2">${statusBadge(p.status || "-")}${overdueBadge(p)}</td>
          <td class="px-4 py-2">${created}</td>
          <td class="px-4 py-2">${confirmed}</td>
          <td class="px-4 py-2">${windowText(p)}</td>
          <td class="px-4 py-2">${decisionChip(p)}</td>
          <td class="px-4 py-2">${noteCell}</td>
          <td class="px-4 py-2">${payoutCell}</td>
          <td class="px-4 py-2 actions-cell">${actions}</td>
        </tr>`;
        })
        .join("");

    // wire buttons
    setTimeout(() => {
        document.querySelectorAll(".act-btn").forEach((btn) => (btn.onclick = onActionClick));
        document
            .querySelectorAll('[data-act="payout-view"]')
            .forEach((btn) => (btn.onclick = () => openPayoutForBooking(btn.getAttribute("data-bid"))));
    }, 0);
}

function actionButtons(p) {
    // Hide actions for terminal states
    if (isFinalBooking(p)) return `<span class="text-gray-400">—</span>`;

    let html = "";

    // Keep Confirm (normal size)
    if (p.status === "PENDING") {
        html += `<button data-id="${p.id}" data-act="confirm"
      class="act-btn bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded mr-2">
      Confirm
    </button>`;
    }

    // Compact + add small gap between the two
    if (p.status === "CONFIRMED") {
        const compact = "act-btn text-xs font-medium leading-tight whitespace-nowrap rounded-md px-2.5 py-1 shadow-sm";
        html += `<div class="flex flex-col items-start gap-1.5">
      <button data-id="${p.id}" data-act="refund-cancel"
        class="${compact} bg-red-600 hover:bg-red-700 text-white">
        Refund & Cancel
      </button>
      <button data-id="${p.id}" data-act="complete"
        class="${compact} bg-green-600 hover:bg-green-700 text-white">
        Complete & Release
      </button>
    </div>`;
    }

    return html || `<span class="text-gray-400">—</span>`;
}



async function onActionClick(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");

    const map = { confirm: "Confirming…", "refund-cancel": "Processing…", complete: "Completing…" };
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = map[act] || "Working…";

    // Instantly blank the action cell for 'complete' (nice UX while we reload)
    if (act === "complete" || act === "refund-cancel") {
        const td = btn.closest("td");
        if (td) td.innerHTML = `<span class="text-gray-400">—</span>`;
    }

    try {
        let path = "";
        if (act === "confirm") path = `/api/payments/${id}/confirm`;
        else if (act === "refund-cancel") path = `/api/payments/${id}/refund-and-cancel`;
        else if (act === "complete") path = `/api/payments/${id}/complete-and-release`;
        else throw new Error("Unknown action");

        const res = await fetch(`${baseURL}${path}`, { method: "POST" });
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Action failed");

        toast("Done ✅");
        await loadPayments();
    } catch (err) {
        toast(err.message || "Action failed", false);
    } finally {
        // (no need to restore button text; the row will be re-rendered by loadPayments)
    }
}