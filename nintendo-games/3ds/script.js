// nintendo-games/3ds/script.js

// ─── Generic page fade navigation ────────────────
function fadeTo(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location.href = url; }, 400);
}

// Fade in on page load
document.body.classList.add('page-loading');
window.addEventListener('load', () => {
    requestAnimationFrame(() => {
        document.body.classList.remove('page-loading');
    });
});

// ─── Loading Screen ───────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const pressContinue = document.getElementById('ok-btn');
const pressBack = document.getElementById('back-btn');

// loading screen keyboard nav — only active on loading.html
if (document.getElementById('loading-screen')) {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') {
            fadeTo('./home.html');
        }
        if (e.key === 'b' || e.key === 'B') {
            fadeTo('../index.html');
        }
    });
}

if (loadingScreen && pressContinue) {
    pressContinue.addEventListener('click', () => {
        fadeTo('./home.html');
    });
}
if (loadingScreen && pressBack) {
    pressBack.addEventListener('click', () => {
        fadeTo('../index.html');
    });
}