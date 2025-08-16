// search.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".space-y-6"); // Your search form
    const locationInput = document.getElementById("location");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const location = locationInput.value.trim();
        if (!location) {
            alert("Please enter a location");
            return;
        }

        // Save location to localStorage so results page can use it
        localStorage.setItem("searchLocation", location);

        // Redirect to results page
        window.location.href = "search-results.html";
    });
});
