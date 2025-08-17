// js/pay-escrow.js
const baseURL = window.location.origin;
const $ = (id) => document.getElementById(id);

let bookingId = null;
let depositAmount = null;

document.addEventListener("DOMContentLoaded", () => {
    // read params
    const q = new URLSearchParams(location.search);
    bookingId = q.get("bookingId");
    depositAmount = q.get("amount");

    if (!bookingId) {
        alert("Booking ID missing.");
        location.href = "renter-dashboard.html";
        return;
    }
    if (depositAmount) $("amount").value = depositAmount;

    // wire radios
    document.querySelectorAll('input[name="pmethod"]').forEach(r => {
        r.addEventListener("change", renderMethodHelp);
    });
    renderMethodHelp();

    // submit
    $("payForm").addEventListener("submit", submitPayment);

    // prefill booking summary
    loadBookingSummary();
});

function renderMethodHelp() {
    const v = document.querySelector('input[name="pmethod"]:checked')?.value || "BKASH";
    $("method").value = v;         // keep hidden/select in sync if you have it
    const map = {
        BKASH:
            `<ul class="list-disc pl-5">
  <li><b>Name:</b> RentoVerse Admin</li>
  <li><b>bKash:</b> 01XXXXXXXXX (Send Money)</li>
  <li>Please use <b>Send Money</b> (not Cash Out). Keep your <b>Transaction ID</b>.</li>
</ul>`,
        NAGAD:
            `<ul class="list-disc pl-5">
  <li><b>Name:</b> RentoVerse Admin</li>
  <li><b>Nagad:</b> 01XXXXXXXXX (Send Money)</li>
  <li>Please use <b>Send Money</b>. Keep your <b>Transaction ID</b>.</li>
</ul>`,
        ROCKET:
            `<ul class="list-disc pl-5">
  <li><b>Name:</b> RentoVerse Admin</li>
  <li><b>Rocket:</b> 01XXXXXXXXX</li>
  <li>Please keep your <b>Transaction ID</b>.</li>
</ul>`
    };
    $("methodHelp").innerHTML = map[v] || "";
}

async function loadBookingSummary() {
    try {
        const res = await fetch(`${baseURL}/api/bookings/by-id?id=${bookingId}`);
        if (!res.ok) throw new Error(await res.text());
        const b = await res.json();
        $("roomCode").value = b?.room?.publicCode || b?.room?.code || "-";
    } catch (e) {
        console.warn("Failed to load booking info:", e.message);
    }
}

async function submitPayment(e) {
    e.preventDefault();

    const method = document.querySelector('input[name="pmethod"]:checked')?.value || "BKASH";
    const payload = new URLSearchParams({
        amount: $("amount").value || "0",
        method,
        reference: `${method} ${$("txnId").value.trim()}`,
        payerName: $("payerName").value.trim(),
        payerPhone: $("payerPhone").value.trim(),
        txnId: $("txnId").value.trim(),
        note: $("note").value.trim(),
        roomCode: $("roomCode").value.trim()
    });

    try {
        const res = await fetch(`${baseURL}/api/bookings/${bookingId}/pay-escrow`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString()
        });
        if (!res.ok) throw new Error(await res.text());
        alert("Payment submitted. Please wait for admin confirmation.");
        location.href = "renter-dashboard.html";
    } catch (e) {
        alert("Failed: " + e.message);
    }
}
