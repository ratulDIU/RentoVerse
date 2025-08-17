// js/payment.js
const baseURL = window.location.origin;
const $ = (id) => document.getElementById(id);

let bookingId, amount, roomCodeValue = "-", captchaX, captchaY;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    // read query params
    const url = new URL(window.location.href);
    bookingId = Number(url.searchParams.get("bookingId"));
    amount    = Number(url.searchParams.get("amount") || 0);

    // fill read-only inputs even if fetch fails
    $("bookingIdInput").value = bookingId || "-";
    $("amountInput").value    = amount || "-";

    if (!bookingId || !amount) {
        setStatus("Invalid booking or amount.", false);
        $("payForm").classList.add("hidden");
        return;
    }

    // fetch booking to show room summary + code
    try {
        const res = await fetch(`${baseURL}/api/bookings/by-id?id=${bookingId}`);
        if (!res.ok) throw new Error(await res.text());
        const b = await res.json();
        const r = b.room || {};
        const title    = r.title    || "-";
        const location = r.location || "-";
        const rent     = r.rent ?? "-";
        roomCodeValue  = r.publicCode || r.code || r.roomCode || (r.id != null ? `ID#${r.id}` : "-");
        $("roomCode").value = roomCodeValue;

        $("bookingSummary").innerHTML = `
      <div class="text-sm space-y-1">
        <p><span class="font-semibold">Room:</span> ${title}
           <span class="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">${roomCodeValue}</span></p>
        <p><span class="font-semibold">Location:</span> ${location}</p>
        <p><span class="font-semibold">Rent:</span> ৳${rent}</p>
        <p><span class="font-semibold">25% Deposit:</span> ৳${Math.round((r.rent || 0) * 0.25)}</p>
      </div>
    `;

        // prefill renter name/phone from localStorage if available
        const name = localStorage.getItem("name");
        if (name) $("payerName").value = name;
        const phone = localStorage.getItem("phone");
        if (phone) $("payerPhone").value = phone;
    } catch (e) {
        $("bookingSummary").textContent = "Failed to load booking details.";
    }

    // radios (your HTML uses name="pmethod")
    document.querySelectorAll('input[name="pmethod"]').forEach(r => {
        r.addEventListener("change", updateMethodFields);
    });
    updateMethodFields(); // initial

    // captcha
    generateCaptcha();
    $("regenCaptchaBtn").addEventListener("click", generateCaptcha);

    // submit
    $("payForm").addEventListener("submit", onSubmit);
}

function selectedMethod() {
    const el = document.querySelector('input[name="pmethod"]:checked');
    return el ? el.value : null;
}

function updateMethodFields() {
    const method = selectedMethod() || "BKASH";
    $("method").value = method;

    // your real numbers
    const accounts = {
        BKASH:  "01760416584 (Send Money)",
        NAGAD:  "01314939368 (Send Money)",
        ROCKET: "01604446150 (Send Money)"
    };

    $("methodHelp").innerHTML = `
    <ul class="list-disc ml-5 space-y-1">
      <li><span class="font-semibold">Name:</span> RentoVerse Admin</li>
      <li><span class="font-semibold">${method === "BKASH" ? "bKash" : method}:</span> ${accounts[method]}</li>
      <li>Please use <span class="font-semibold">Send Money</span> (not Cash Out).</li>
      <li>Keep your <span class="font-semibold">Transaction ID</span>.</li>
      <li><span class="font-semibold">Enter the Room Code in the payment reference</span>:
          <span class="inline-block px-2 py-0.5 rounded bg-gray-100">${roomCodeValue}</span></li>
    </ul>
  `;
}

function generateCaptcha() {
    captchaX = Math.floor(Math.random() * 9) + 1;
    captchaY = Math.floor(Math.random() * 9) + 1;
    $("captchaQ").textContent = `Captcha: ${captchaX} + ${captchaY} = ?`;
    $("captchaA").value = "";
}

async function onSubmit(e) {
    e.preventDefault();

    const method     = selectedMethod();
    const payerName  = $("payerName").value.trim();
    const payerPhone = $("payerPhone").value.trim();
    const txnId      = $("txnId").value.trim();
    const note       = $("note").value.trim();
    const cap        = Number($("captchaA").value || 0);

    if (!method)     return setStatus("Please select a payment method.", false);
    if (!payerName)  return setStatus("Please enter your name.", false);
    if (!payerPhone) return setStatus("Please enter your phone.", false);
    if (!txnId)      return setStatus("Please enter the Transaction ID.", false);
    if (cap !== captchaX + captchaY) return setStatus("Captcha failed.", false);

    try {
        const payload = new URLSearchParams({
            amount: String(amount),
            method,
            reference: `TXN:${txnId}|ROOM:${roomCodeValue}|BK:${bookingId}`,
            payerName,
            payerPhone,
            txnId,
            note
        });

        const res = await fetch(`${baseURL}/api/bookings/${bookingId}/pay-escrow`, {
            method: "POST",
            body: payload
        });

        if (!res.ok) throw new Error(await res.text());

        setStatus("✅ Payment submitted. Waiting for admin confirmation.", true);
        setTimeout(() => (window.location.href = "renter-dashboard.html"), 900);
    } catch (err) {
        setStatus("❌ Failed to submit payment: " + err.message, false);
    }
}

function setStatus(msg, ok) {
    const el = $("payStatus");
    el.textContent = msg;
    el.className = `text-sm ${ok ? "text-green-700" : "text-red-600"}`;
}
