const adminAccessForm = document.getElementById("adminAccessForm");
if (adminAccessForm) {
    adminAccessForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const secret = document.getElementById("secretKey").value.trim();

        const body = { name, email, password }; // ✅ secret goes in query param, not body

        try {
            const url = `${window.location.origin}/api/admin/auth/register?secret=${encodeURIComponent(secret)}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const text = await res.text();

            if (res.ok) {
                // mark flow + email for the verify page
                localStorage.setItem("pendingEmail", email);
                localStorage.setItem("pendingFlow", "ADMIN");
                window.location.href = "verify.html";
            } else {
                alert("❌ " + text);
            }
        } catch (err) {
            console.error("❌ Error:", err);
            alert("❌ Network error. Please try again.");
        }
    });
}