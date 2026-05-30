const hamburger    = document.getElementById('hamburger');
const mobileDrawer = document.getElementById('mobileDrawer');
const drawerScrim  = document.getElementById('drawerScrim');

function openDrawer() {
    mobileDrawer.classList.add('open');
    drawerScrim.classList.add('active');
}
function closeDrawer() {
    mobileDrawer.classList.remove('open');
    drawerScrim.classList.remove('active');
}

hamburger.addEventListener('click', openDrawer);
drawerScrim.addEventListener('click', closeDrawer);

/* #region Dark mode toggle */
const DARK_KEY = 'theme';
const DARK_VAL = 'dark';

// Selects both the nav link and the drawer link by looking for the ☀️/🌑 text.
function getDarkToggles() {
    return [...document.querySelectorAll('nav a, .mobile-drawer a')]
        .filter(a => /^[☀️🌑]/.test(a.textContent.trim()));
}

window._onThemeChange = [];

function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);

    getDarkToggles().forEach(a => {
        const isDrawer = a.closest('.mobile-drawer');
        a.textContent = dark
            ? (isDrawer ? '🌑 toggle dark mode'  : '🌑')
            : (isDrawer ? '☀️ toggle light mode' : '☀️');
    });

    // Swap background gif
    const bgSource = document.querySelector('.bg-gif source');
    const bgImg    = document.querySelector('.bg-gif img');
    if (bgSource) bgSource.srcset = dark
        ? './assets/images/mobile-bg-dark.gif'
        : './assets/images/mobile-bg.gif';
    if (bgImg) bgImg.src = dark
        ? './assets/images/desktop-bg-dark.gif'
        : './assets/images/desktop-bg.gif';

    window._onThemeChange.forEach(fn => fn(dark));
}

// On load, restore saved preference — but not on pages that are hardcoded dark.
if (!document.body.classList.contains('dark')) {
    applyTheme(localStorage.getItem(DARK_KEY) === DARK_VAL);
} else {
    // Still wire up the toggle icons so they reflect the dark state correctly,
    // but don't overwrite the body class.
    getDarkToggles().forEach(a => {
        const isDrawer = a.closest('.mobile-drawer');
        a.textContent = isDrawer ? '🌑 toggle dark mode' : '🌑';
    });
}

// Wire up toggle — use event delegation since nav links animate in.
document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;

    const txt = a.textContent.trim();
    if (!txt.startsWith('☀️') && !txt.startsWith('🌑')) return;

    e.preventDefault();
    if (document.body.dataset.forceDark) return;
    const goingDark = !document.body.classList.contains('dark');
    localStorage.setItem(DARK_KEY, goingDark ? DARK_VAL : 'light');
    applyTheme(goingDark);
});

// Hover preview: peek at the opposite state on hover.
document.addEventListener('mouseover', e => {
    const a = e.target.closest('nav a, .mobile-drawer a');
    if (!a || !/^[☀️🌑]/.test(a.textContent.trim())) return;
    
    const isDark = document.body.classList.contains('dark');
    const isDrawer = a.closest('.mobile-drawer');
    a.textContent = isDark
        ? (isDrawer ? '☀️ toggle light mode' : '☀️')
        : (isDrawer ? '🌑 toggle dark mode'  : '🌑');
});

document.addEventListener('mouseout', e => {
    const a = e.target.closest('nav a, .mobile-drawer a');
    if (!a || !/^[☀️🌑]/.test(a.textContent.trim())) return;
    
    const isDark = document.body.classList.contains('dark');
    const isDrawer = a.closest('.mobile-drawer');
    a.textContent = isDark
        ? (isDrawer ? '🌑 toggle dark mode'  : '🌑')
        : (isDrawer ? '☀️ toggle light mode' : '☀️');
});

/* #endregion Dark mode toggle */

/* #region Back to top */

// Source: https://stackoverflow.com/a/69643526
const backToTopLink = document.getElementById('back-to-top');

backToTopLink.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo(0, 0);
    setRandomGif();
});

/* #endregion Back to top */