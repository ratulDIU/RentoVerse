document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("postRoomForm");
    const imageInput = document.getElementById("image");

    imageInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const preview = document.getElementById("preview");
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
        }
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const role = localStorage.getItem("role");
        const email = localStorage.getItem("email");

        if (!email || !role) {
            alert("You must be logged in.");
            window.location.href = "login.html";
            return;
        }

        if (role !== "PROVIDER") {
            alert("Only providers can post rooms.");
            return;
        }

        const formData = new FormData();
        formData.append("title", document.getElementById("title").value);
        formData.append("location", document.getElementById("location").value);
        formData.append("rent", document.getElementById("rent").value);
        formData.append("availableFrom", document.getElementById("availableFrom").value);
        formData.append("type", document.getElementById("type").value);
        formData.append("description", document.getElementById("description").value);
        formData.append("email", email);
        formData.append("image", imageInput.files[0]);

        try {
            const res = await fetch("http://localhost:8080/api/rooms/add", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                form.reset();
                document.getElementById("preview").classList.add("hidden");
                const msg = document.getElementById("successMsg");
                msg.classList.remove("hidden");
                msg.scrollIntoView({ behavior: "smooth" });
            } else {
                const err = await res.text();
                alert("❌ Failed to post room: " + err);
            }
        } catch (err) {
            console.error("❌ Error:", err);
            alert("❌ Something went wrong.");
        }
    });
});
