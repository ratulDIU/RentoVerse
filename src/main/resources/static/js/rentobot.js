(function () {
    const box = () => document.getElementById("rentobot-box");
    const messagesEl = () => document.getElementById("rentobot-messages");
    const inputEl = () => document.getElementById("rentobot-input");
    const sendBtn = () => document.getElementById("rentobot-send");

    // Toggle
    window.toggleRentoBot = function toggleRentoBot() {
        box().classList.toggle("hidden");
        if (!box().classList.contains("hidden")) {
            inputEl().focus();
            if (!messagesEl().dataset.booted) {
                appendMsg("RentoBot", "Hi! 👋 How can I help? You can ask about booking, posting rooms, or general help.");
                messagesEl().dataset.booted = "1";
            }
        }
    };

    // Append message
    function appendMsg(sender, text) {
        const row = document.createElement("div");
        row.className = "mb-2";
        row.innerHTML = `<strong>${sender}:</strong> ${escapeHtml(text)}`;
        messagesEl().appendChild(row);
        messagesEl().scrollTop = messagesEl().scrollHeight;
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => (
            { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]
        ));
    }

    // Send handler
    async function handleSend() {
        const q = inputEl().value.trim();
        if (!q) return;
        appendMsg("You", q);
        inputEl().value = "";

        try {
            const res = await fetch(`${window.location.origin}/api/chatbot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: q,
                    // চাইলে ইউজারের কনটেক্সট পাঠাতে পারেন:
                    userEmail: localStorage.getItem("email") || null,
                    userRole: localStorage.getItem("role") || null
                })
            });
            const text = await res.text();
            appendMsg("RentoBot", text || "Sorry, I didn't get that.");
        } catch (e) {
            appendMsg("RentoBot", "⚠️ Server error. Please try again.");
        }
    }

    // Events
    sendBtn().addEventListener("click", handleSend);
    inputEl().addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSend();
    });
})();
