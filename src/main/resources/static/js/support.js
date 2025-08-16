const form = document.getElementById('supportForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';

    const data = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const res = await fetch('/api/support-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const t = await res.text();
            throw new Error(t || 'Failed to submit. Try again.');
        }

        const ticket = await res.json();
        form.reset();
        msg.innerHTML = `<div class="success">
      Thanks! Your ticket (#${ticket.id}) was submitted. We’ll reach out via email.
    </div>`;
    } catch (err) {
        msg.innerHTML = `<div class="error">${err.message}</div>`;
    } finally {
        btn.disabled = false;
    }
});
