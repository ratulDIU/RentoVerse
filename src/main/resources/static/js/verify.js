document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('verifyForm');
    const message = document.getElementById('responseMessage');
    const email = localStorage.getItem("pendingEmail");

    if (!email) {
        message.innerText = "❌ No email found. Please register again.";
        message.classList.add("text-red-500");
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = document.getElementById('code').value;

        const params = new URLSearchParams();
        params.append("email", email);
        params.append("code", code);

        try {
            const res = await fetch(`${window.location.origin}/api/auth/verify-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params
            });

            const text = await res.text();

            if (res.ok) {
                // ✅ Redirect to success page
                window.location.href = "verification-success.html";
            } else {
                message.innerText = "❌ " + text;
                message.classList.remove("text-green-600");
                message.classList.add("text-red-500");
            }

        } catch (err) {
            message.innerText = "❌ Network error. Try again.";
            message.classList.add("text-red-500");
        }
    });
});
