document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value
    };

    try {
        const response = await fetch(window.location.origin + "/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const responseText = await response.text();

        if (response.ok) {
            // Store email for pre-filling on verify page
            localStorage.setItem("pendingEmail", userData.email);

            // Redirect to verification page
            window.location.href = "verify.html";
        } else {
            alert("❌ " + responseText);
        }
    } catch (error) {
        console.error("Network error:", error);
        alert("❌ Network error. Please try again.");
    }
});


