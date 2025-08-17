// ✅ Toast display helper
function showToast(message, color = "bg-red-500") {
    const toast = document.createElement("div");
    toast.className = `${color} text-white px-4 py-2 rounded shadow-md animate-fade-in-up`;
    toast.innerText = message;

    const container = document.getElementById("toast-container");
    if (container) container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ✅ Helper to generate public room code
function roomPublicCode(room) {
    return `RENTO:${100 + (room.id || 0)}`;
}

// ✅ Handle "Post Room" button click
function handleAddRoom() {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");

    if (!email || !role) {
        showToast("Please login as provider to post a room.");
        return;
    }
    if (role !== "PROVIDER") {
        showToast("Only providers can post rooms.");
        return;
    }

    window.location.href = "post-room.html";
}

// ✅ Load all posted rooms on window load
window.onload = () => {
    fetch(`${window.location.origin}/api/rooms/all`)
        .then(res => res.json())
        .then(rooms => {
            const container = document.getElementById('room-list');
            if (!container) return;

            if (rooms.length === 0) {
                container.innerHTML = `<p class="text-gray-500 col-span-full text-center">No rooms available.</p>`;
                return;
            }

            rooms.forEach(room => {
                const card = document.createElement('div');
                card.className = "bg-white rounded-xl shadow-md overflow-hidden flex";

                const code = roomPublicCode(room);
                card.innerHTML = `
                    <img src="${room.imageUrl}" class="w-1/2 h-44 object-cover">
                    <div class="w-1/2 p-4 text-sm space-y-1">
                        <h3 class="text-lg font-semibold">🏡 Title: <span class="font-bold">${room.title}</span></h3>
                        <span class="inline-block text-[11px] mt-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 tracking-wider">${code}</span>

                        <p>💰 <span class="font-semibold">Rent:</span> ৳${room.rent}</p>
                        <p>📍 <span class="font-semibold">Location:</span> ${room.location}</p>
                        <p>📅 <span class="font-semibold">Type:</span> ${room.type}</p>
                        <p>📝 <span class="font-semibold">Description:</span> ${room.description}</p>
                        <p>🧑‍💼 <span class="font-semibold text-gray-500">Provider:</span> ${room.provider?.name || "Unknown"}</p>
                    </div>
                `;

                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error("❌ Failed to fetch rooms", err);
            showToast("Failed to load rooms. Try again later.");
        });
};
