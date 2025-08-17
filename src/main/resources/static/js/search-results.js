// /public/js/search-results.js (robust version)
(() => {
    // ----- DOM refs (with fallbacks) -----
    const roomsEl  = document.getElementById('rooms')   || document.getElementById('results');
    const emptyEl  = document.getElementById('empty');
    const banner   = document.getElementById('banner');
    const bLoc     = document.getElementById('b_location');
    const newBtn   = document.getElementById('newSearch');

    // ----- Ensure a toast container exists -----
    let toastRoot = document.getElementById('toast-container');
    if (!toastRoot) {
        toastRoot = document.createElement('div');
        toastRoot.id = 'toast-container';
        toastRoot.className = 'fixed top-20 right-5 z-50 space-y-2';
        document.body.appendChild(toastRoot);
    }

    // ----- Toast -----
    function showToast(message, color = "bg-red-500") {
        const toast = document.createElement("div");
        toast.className = `${color} text-white px-4 py-2 rounded shadow-md animate-fade-in-up mt-2`;
        toast.innerText = message;
        toastRoot.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Back button (optional)
    newBtn?.addEventListener('click', () => {
        sessionStorage.removeItem('rv_search_results');
        sessionStorage.removeItem('rv_search_query');
        window.location.href = 'index.html';
    });

    // ----- Load results: prefer sessionStorage -----
    let results = [];
    let query = null;
    try {
        results = JSON.parse(sessionStorage.getItem('rv_search_results') || '[]');
        query   = JSON.parse(sessionStorage.getItem('rv_search_query') || 'null');
    } catch {}

    if (query?.location) {
        showBanner(query.location);
        renderRooms(results);
        return;
    }

    // Fallback: URL ?location=...
    const loc = (new URLSearchParams(location.search).get('location') || '').trim();
    if (loc) {
        showBanner(loc);
        // Use absolute backend URL to avoid origin issues
        fetch(`${window.location.origin}/api/rooms/filter?location=${encodeURIComponent(loc)}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(renderRooms)
            .catch((e) => {
                console.error('fetch rooms error', e);
                emptyEl?.classList.remove('hidden');
                showToast('Failed to load search results.');
            });
    } else {
        emptyEl?.classList.remove('hidden');
    }

    // ----- UI helpers -----
    function showBanner(location) {
        if (bLoc) bLoc.textContent = location;
        banner?.classList.remove('hidden');
    }

    function renderRooms(list) {
        if (!roomsEl) {
            console.warn('No container element (#rooms or #results) found.');
            showToast('No results container on page.');
            return;
        }
        roomsEl.innerHTML = '';
        if (!Array.isArray(list) || list.length === 0) {
            emptyEl?.classList.remove('hidden');
            return;
        }
        emptyEl?.classList.add('hidden');
        list.forEach(room => roomsEl.appendChild(card(room)));
    }

    function card(room) {
        const esc = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
        const img = room.imageUrl?.startsWith('http') ? room.imageUrl : (room.imageUrl || '/images/placeholder-room.jpg');

        const el = document.createElement('div');
        el.className = 'bg-white rounded-2xl shadow-md overflow-hidden animate-fade-in-up ring-1 ring-slate-200';

        el.innerHTML = `
      <img src="${img}" alt="${esc(room.title || 'Room')}" class="w-full h-40 object-cover"
           onerror="this.src='/images/placeholder-room.jpg'; this.onerror=null;">
      <div class="p-4 text-sm space-y-1">
        <h3 class="text-lg font-semibold">${esc(room.title || 'Room')}</h3>
        <div class="text-gray-700">💰 <b>৳${room.rent ?? '-'}</b></div>
        <div class="text-gray-700">📍 ${esc(room.location || '')}</div>
        <p class="text-gray-600 line-clamp-2">${esc(room.description || '')}</p>
        <div class="pt-2 flex items-center gap-3">
          <a href="room-detail.html?id=${room.id}" class="text-indigo-600 hover:underline font-medium">View details</a>
          <button class="request-btn ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5">
            Request
          </button>
        </div>
      </div>
    `;

        // ----- Request handler (your exact logic & endpoint) -----
        const requestBtn = el.querySelector(".request-btn");
        requestBtn?.addEventListener("click", () => {
            const renterEmail = localStorage.getItem("email");
            const role = localStorage.getItem("role");

            if (!renterEmail || !role) {
                showToast("Please login as a renter to request a room.");
                return;
            }
            if (role !== "RENTER") {
                showToast("Only renters can request a room.");
                return;
            }

            requestBtn.disabled = true;
            requestBtn.classList.add('opacity-60','cursor-not-allowed');

            fetch(`${window.location.origin}/api/bookings/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ renterEmail, roomId: room.id }),
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Request failed");
                    return res.text();
                })
                .then(() => showToast("✅ Booking request sent!", "bg-green-600"))
                .catch((err) => {
                    console.error('request error', err);
                    showToast("❌ Error: " + (err.message || 'Failed'));
                })
                .finally(() => {
                    requestBtn.disabled = false;
                    requestBtn.classList.remove('opacity-60','cursor-not-allowed');
                });
        });

        return el;
    }
})();