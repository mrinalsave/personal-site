// nintendo-games/script.js

// ─── Generic page fade navigation ────────────────
function fadeTo(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location.href = url; }, 400);
}
window.fadeTo = fadeTo;

// Fade in on page load
document.body.classList.add('page-loading');
window.addEventListener('load', () => {
    requestAnimationFrame(() => {
        document.body.classList.remove('page-loading');
    });
});

// ─── Loading Screen ───────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const switchButton = document.getElementById('switch-btn');
const dsButton = document.getElementById('ds-btn');

// loading screen keyboard nav — only active on loading.html
if (document.getElementById('loading-screen')) {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'x' || e.key === 'X') {
            fadeTo('./switch/loading.html');
        }
        if (e.key === 'y' || e.key === 'Y') {
            fadeTo('./3ds/loading.html');
        }
    });
}

if (loadingScreen && switchButton) {
    switchButton.addEventListener('click', () => {
        fadeTo('./switch/loading.html');
    });
}
if (loadingScreen && dsButton) {
    dsButton.addEventListener('click', () => {
        fadeTo('./3ds/loading.html');
    });
}