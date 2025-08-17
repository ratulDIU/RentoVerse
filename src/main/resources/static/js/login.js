document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("responseMessage");

    if (message) {
        message.innerText = "";
        message.className = "";
    }

    try {
        const res = await fetch(`${window.location.origin}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            alert("❌ " + errorText);
            return;
        }

        const data = await res.json(); // ✅ CORRECT

        // ✅ Save info
        localStorage.setItem("name", data.name);
        localStorage.setItem("email", data.email);
        localStorage.setItem("role", data.role);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("roomId", data.roomId);


        // ✅ Redirect
        const role = data.role;
        if (role === "RENTER") {
            window.location.href = "renter-dashboard.html";
        } else if (role === "PROVIDER") {
            window.location.href = "provider-dashboard.html";
        } else if (role === "ADMIN") {
            window.location.href = "admin-dashboard.html";
        }
    } catch (err) {
        console.error("Login error", err);
        alert("❌ Something went wrong. Try again later.");
    }
});

async function adminLogin() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch(`${window.location.origin}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Login successful!");
            localStorage.setItem("role", data.role);
            localStorage.setItem("email", data.email);
            localStorage.setItem("name", data.name);
            localStorage.setItem("userId", data.userId);
            window.location.href = "admin-dashboard.html";
        } else {
            alert(data);
        }
    } catch (err) {
        console.error(err);
        alert("❌ Login failed.");
    }
}

