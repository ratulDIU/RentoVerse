document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    const container = document.getElementById("roomList");

    try {
        const res = await fetch(`${window.location.origin}/api/rooms/available`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const rooms = await res.json();
        container.innerHTML = "";

        rooms.forEach(room => {
            const card = document.createElement("div");
            card.className = "bg-white shadow rounded-xl overflow-hidden";

            card.innerHTML = `
        <img src="${room.imageUrl}" class="w-full h-52 object-cover" alt="Room Image">
        <div class="p-5 space-y-2">
          <h2 class="text-xl font-bold text-gray-800">${room.title}</h2>
          <p class="text-sm text-gray-600">📍 ${room.location}</p>
          <p class="text-sm text-gray-600">💰 Rent: ৳${room.rent}</p>
          <p class="text-sm text-gray-600">📅 Available from: ${room.availableFrom}</p>
          <p class="text-sm text-gray-600">🏷️ Type: ${room.type}</p>
          <button class="mt-3 w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
                  onclick="requestBooking('${room.id}')">
            📩 Request Booking
          </button>
        </div>
      `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p class='text-red-500'>Failed to load rooms</p>";
    }
});


// 🔁 Booking request
async function requestBooking(roomId) {
    const token = localStorage.getItem("token");
    const renterId = localStorage.getItem("userId");

    if (!renterId) {
        alert("You must login again. Missing renter ID.");
        return;
    }

    try {
        const res = await fetch(`${window.location.origin}/api/bookings/request`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                renterId: parseInt(renterId),
                roomId: parseInt(roomId)})  // ✅ Correct way
        });

        if (res.ok) {
            alert("✅ Booking request sent!");
        } else {
            const error = await res.text();
            alert("❌ Booking failed: " + error);
        }

    } catch (err) {
        console.error(err);
        alert("❌ Request failed: " + err.message);
    }
}


