// ✅ Toast message function (unchanged behavior)
function showToast(message, color = "bg-red-500") {
    const toast = document.createElement("div");
    toast.className = `${color} text-white px-4 py-2 rounded shadow-md animate-fade-in-up mt-2`;
    toast.textContent = message;
    const container = document.getElementById("toast-container");
    container && container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ✅ Helper to generate public room code
function roomPublicCode(room) {
    return `RENTO:${100 + (room.id || 0)}`;
}

// ✅ Simple skeletons while loading
function renderSkeletons(parent, count = 6) {
    for (let i = 0; i < count; i++) {
        const sk = document.createElement("div");
        sk.className =
            "bg-white/80 backdrop-blur rounded-xl border border-white/50 shadow-sm overflow-hidden animate-fade-in-up";
        sk.style.animationDelay = `${i * 40}ms`;
        sk.innerHTML = `
      <div class="sm:flex">
        <div class="sm:w-1/2 h-44 bg-slate-200 animate-pulse"></div>
        <div class="sm:w-1/2 p-4 space-y-3">
          <div class="h-6 w-2/3 bg-slate-200 rounded animate-pulse"></div>
          <div class="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
          <div class="h-4 w-1/3 bg-slate-200 rounded animate-pulse"></div>
          <div class="h-9 w-24 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    `;
        parent.appendChild(sk);
    }
}

function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
}

// ✅ Card renderer (responsive layout that matches the new HTML)
function renderRoomCard(room) {
    const card = document.createElement("div");
    card.className =
        "bg-white/80 backdrop-blur rounded-xl border border-white/50 shadow-md overflow-hidden animate-fade-in-up sm:flex";

    const img = document.createElement("img");
    img.src = room.imageUrl || "";
    img.alt = room.title || "Room";
    img.className = "sm:w-1/2 w-full h-44 object-cover";
    img.onerror = () => {
        img.src =
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'>
           <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
             <stop stop-color='#e2e8f0' offset='0'/><stop stop-color='#cbd5e1' offset='1'/>
           </linearGradient></defs>
           <rect width='100%' height='100%' fill='url(#g)'/>
           <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial' font-size='22' fill='#475569'>No Image</text>
         </svg>`
            );
    };

    const right = document.createElement("div");
    right.className = "sm:w-1/2 w-full p-4 text-sm space-y-1";

    const code = roomPublicCode(room);
    right.innerHTML = `
    <h3 class="text-lg font-semibold leading-tight">
      🏡 <span class="font-bold">${room.title || "Untitled Room"}</span>
    </h3>
    <span class="inline-block text-[11px] mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">${code}</span>
    <p>💰 <span class="font-semibold">Rent:</span> ৳${room.rent ?? "—"}</p>
    <p>📍 <span class="font-semibold">Location:</span> ${room.location || "—"}</p>
    <p>🏷️ <span class="font-semibold">Type:</span> ${room.type || "—"}</p>
    <p class="line-clamp-2">📝 <span class="font-semibold">Description:</span> ${room.description || "—"}</p>
    <p>🧑‍💼 <span class="font-semibold text-gray-500">Provider:</span> ${room?.provider?.name || "—"}</p>
    <button class="request-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded mt-2">
      Request
    </button>
  `;

    card.appendChild(img);
    card.appendChild(right);

    // Attach request handler
    const requestBtn = right.querySelector(".request-btn");
    requestBtn.addEventListener("click", () => {
        const renterEmail = localStorage.getItem("email");
        const role = localStorage.getItem("role");

        if (!renterEmail || !role) {
            showToast("Please login as a renter to request a room.");
            return;
        }
        if (role === "PROVIDER") {
            showToast("Only renters can request a room.");
            return;
        }

        fetch(`${window.location.origin}/api/bookings/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                renterEmail: renterEmail, // ✅ backend untouched
                roomId: room.id,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error("Request failed");
                return res.text();
            })
            .then(() => showToast("✅ Booking request sent!", "bg-green-600"))
            .catch((err) => showToast("❌ Error: " + err.message));
    });

    return card;
}

// ✅ Load rooms and inject UI (aligned with new HTML)
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("room-list");
    if (!container) return;

    // show skeletons while loading
    renderSkeletons(container, 6);

    fetch(`${window.location.origin}/api/rooms/available`)
        .then((res) => res.json())
        .then((rooms) => {
            clearChildren(container);

            if (!Array.isArray(rooms) || rooms.length === 0) {
                container.innerHTML =
                    `<p class="text-center text-slate-500 col-span-full">No rooms available.</p>`;
                return;
            }

            rooms.forEach((room, idx) => {
                const card = renderRoomCard(room);
                // slight stagger for nicer entrance
                card.style.animationDelay = `${idx * 40}ms`;
                container.appendChild(card);
            });
        })
        .catch((err) => {
            console.error("❌ Failed to load rooms", err);
            clearChildren(container);
            showToast("Failed to fetch rooms.");
            container.innerHTML =
                `<p class="text-center text-red-500 col-span-full">Could not load rooms.</p>`;
        });
});
