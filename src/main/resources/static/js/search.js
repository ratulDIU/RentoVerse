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

        // ✅ case-insensitive key: সবসময় lowercase রেখে সার্চ চালাবো
        const location = locationRaw.toLowerCase();

        // আগের key বজায়: যেটা রেজাল্ট পেজ পড়ে — এখানে এখন থেকে lowercase থাকবে
        localStorage.setItem("searchLocation", location);

        // চাইলে UI দেখানোর জন্য আসল টেক্সটও রেখে দিলাম (কেউ ব্যবহার করলে করবে)
        localStorage.setItem("searchLocationOriginal", locationRaw);

        window.location.href = "search-results.html";
    });
});