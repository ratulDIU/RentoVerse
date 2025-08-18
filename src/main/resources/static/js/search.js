// js/search.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("heroSearchForm");
    const locationInput = document.getElementById("location");
    if (!form || !locationInput) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const locationRaw = (locationInput.value || "").trim();
        if (!locationRaw) {
            alert("Please enter a location");
            locationInput.focus();
            return;
        }

        // Keep original for display & server query
        localStorage.setItem("searchLocationOriginal", locationRaw);
        // Keep legacy lowercased key for backward compat (optional)
        localStorage.setItem("searchLocation", locationRaw.toLowerCase());

        window.location.href = "search-results.html";
    });

    // Quick chips fill helper if present
    document.querySelectorAll("[data-quick]")?.forEach(chip => {
        chip.addEventListener("click", () => {
            const val = chip.getAttribute("data-quick");
            if (val && locationInput) locationInput.value = val;
        });
    });
});
