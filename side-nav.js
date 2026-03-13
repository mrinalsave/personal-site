// side-nav.js
//
// Injects the shared sidenav and handles open/close as a pure overlay.
// Content never shifts — the nav slides over the page with a scrim behind it.
// On mobile (≤ 768px wide) the nav expands to full viewport width.

const NAV_LINKS = [
    { label: 'home',                      href: '/index.html'                  },
    { label: 'favorite pokemon cards',    href: '/pokemon-cards/index.html'    },
    { label: 'audio visualizer',          href: '/audio-visualizer/index.html' },
    { label: 'nintendo games',            href: '/nintendo-games/index.html'   },
    { label: 'coming soon',               href: '/ideas/index.html'            },
    { label: 'devlog',                    href: '/devlog/index.html'           },
];

// ── Active-link detection ─────────────────────────────────────────────
// A link is selected when the current pathname starts with its directory.
// Home is an exact match only so it doesn't highlight on every page.

function isSelected(linkHref) {
    const current = window.location.pathname.replace(/\/$/, '/index.html');
    const linkDir = linkHref.replace(/\/index\.html$/, '');
    if (linkDir === '') return current === '/index.html' || current === '/';
    return current.startsWith(linkDir);
}

// ── Build & inject ────────────────────────────────────────────────────

function buildNav() {
    const container = document.getElementById('sidenav');
    if (!container) return;

    const closeBtn = document.createElement('a');
    closeBtn.href = 'javascript:void(0)';
    closeBtn.className = 'closebtn';
    closeBtn.textContent = '\u00D7';

    const heading = document.createElement('h2');
    heading.className = 'retro-text';
    heading.textContent = 'my digital archive';

    container.appendChild(closeBtn);
    container.appendChild(heading);

    for (const { label, href } of NAV_LINKS) {
        const a = document.createElement('a');
        a.href = href;
        a.className = 'retro-text' + (isSelected(href) ? ' selected-link' : '');
        a.textContent = label;
        container.appendChild(a);
    }
}

buildNav();

// ── Open / close — overlay only, no content shifting ─────────────────

const sidenav    = document.getElementById('sidenav');
const navOverlay = document.getElementById('nav-overlay');
const header     = document.querySelector('header');
const DESKTOP_NAV_WIDTH = 325; // px; on mobile CSS takes it to 100vw

function navWidth() {
    return window.innerWidth <= 768 ? window.innerWidth : DESKTOP_NAV_WIDTH;
}

function openNav() {
    sidenav.style.width = navWidth() + 'px';
    navOverlay.classList.add('active');
    document.body.classList.add('nav-open');
    document.getElementById('open-nav').style.display = 'none';

    // Drop the header below the scrim so its contents aren't reachable.
    // Must be done in JS because the header's z-index is set as an inline style,
    // which stylesheet rules cannot override.
    if (header) header.style.zIndex = '4';

    // Visualizer page: hide lil-gui so it doesn't float above the scrim
    const gui = document.querySelector('.lil-gui');
    if (gui) gui.style.visibility = 'hidden';
}

function closeNav() {
    sidenav.style.width = '0';
    navOverlay.classList.remove('active');
    document.body.classList.remove('nav-open');
    document.getElementById('open-nav').style.display = 'block';

    if (header) header.style.zIndex = '10';

    const gui = document.querySelector('.lil-gui');
    if (gui) gui.style.visibility = 'visible';
}

document.getElementById('open-nav').addEventListener('click', openNav);
sidenav.querySelector('.closebtn').addEventListener('click', closeNav);
navOverlay.addEventListener('click', closeNav);
sidenav.addEventListener('click', e => e.stopPropagation());

// Keep nav correctly sized if the window is resized while open
window.addEventListener('resize', () => {
    if (sidenav.style.width !== '0px' && sidenav.style.width !== '') {
        sidenav.style.width = navWidth() + 'px';
    }
});