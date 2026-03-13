// nintendo-games/script.js

// ── Page-fade navigation ──────────────────────────────────────────────

function fadeTo(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location.href = url; }, 400);
}
window.fadeTo = fadeTo;

// Fade in on load
document.body.classList.add('page-loading');
window.addEventListener('load', () => {
    requestAnimationFrame(() => document.body.classList.remove('page-loading'));
});

// ── Console-picker keyboard navigation (index.html only) ──────────────

if (document.getElementById('loading-screen')) {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toUpperCase();
        if (key === 'X') fadeTo('./switch/loading.html');
        if (key === 'Y') fadeTo('./3ds/loading.html');
    });
}