// post-room.js

// ---------- API base resolution ----------
// Deployed: same-origin (https://<your-app>/api/...)
// Local dev (file://, http://localhost): default to your Render backend,
// but allow override via localStorage.API_BASE
(function initApiBase() {
    const origin = window.location.origin;
    const isLocal =
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.") ||
        origin === "null" ||                // some file:// cases
        origin.startsWith("file:");
    const DEFAULT_REMOTE = "https://rentoverse-backend.onrender.com";
    window.API_BASE = isLocal
        ? (localStorage.getItem("API_BASE") || DEFAULT_REMOTE)
        : origin;
})();

// Optional: set once to test against a different backend from local dev
// localStorage.setItem("API_BASE", "https://your-backend.onrender.com");

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("postRoomForm");
    const imageInput = document.getElementById("image");
    const previewImg = document.getElementById("preview");
    const successMsg = document.getElementById("successMsg");

    // small helper
    const toast = (msg) => alert(msg);

    // image preview
    imageInput?.addEventListener("change", function () {
        const file = this.files?.[0];
        if (file && previewImg) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.classList.remove("hidden");
        }
    });

    form?.addEventListener("submit", onSubmit);

    async function onSubmit(e) {
        e.preventDefault();

        // auth/role guard (client-side)
        const role = localStorage.getItem("role");
        const email = localStorage.getItem("email");

        if (!email || !role) {
            toast("You must be logged in.");
            window.location.href = "login.html";
            return;
        }
        if (role !== "PROVIDER") {
            toast("Only providers can post rooms.");
            return;
        }

        // collect fields
        const title         = document.getElementById("title")?.value?.trim() || "";
        const location      = document.getElementById("location")?.value?.trim() || "";
        const rent          = document.getElementById("rent")?.value || "";
        const availableFrom = document.getElementById("availableFrom")?.value || "";
        const type          = document.getElementById("type")?.value || "";
        const description   = document.getElementById("description")?.value?.trim() || "";
        const imageFile     = imageInput?.files?.[0] || null;

        // minimal validations
        if (!title)       return toast("Please enter a title.");
        if (!location)    return toast("Please enter a location.");
        if (!rent)        return toast("Please enter rent.");
        if (!imageFile)   return toast("Please choose an image.");

        const fd = new FormData();
        fd.append("title", title);
        fd.append("location", location);
        fd.append("rent", rent);
        fd.append("availableFrom", availableFrom);
        fd.append("type", type);
        fd.append("description", description);
        fd.append("email", email);       // backend expects provider email
        fd.append("image", imageFile);   // IMPORTANT: do NOT set Content-Type manually

        try {
            const res = await fetch(`${window.API_BASE}/api/rooms/add`, {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                // show backend message if any
                const txt = await safeText(res);
                toast("❌ Failed to post room: " + (txt || `HTTP ${res.status}`));
                return;
            }

            // success UI
            form.reset();
            if (previewImg) previewImg.classList.add("hidden");
            if (successMsg) {
                successMsg.classList.remove("hidden");  // assumes class="hidden" initially
                successMsg.scrollIntoView({ behavior: "smooth" });
            } else {
                toast("✅ Room posted successfully!");
            }
        } catch (err) {
            console.error("post-room error", err);
            toast("❌ Something went wrong. Please try again.");
        }
    }

    async function safeText(res) {
        try { return await res.text(); } catch { return ""; }
    }
});
