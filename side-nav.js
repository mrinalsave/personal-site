// side-nav.js
//
// Injects the shared sidenav into any page that has <div id="sidenav">.
// The correct link is highlighted automatically by matching window.location.pathname.
//
// Each entry: { label, href }
// `href` must be an absolute path from the site root (leading slash).

const NAV_LINKS = [
    { label: 'home',                      href: '/index.html'                  },
    { label: 'favorite pokemon cards',    href: '/pokemon-cards/index.html'    },
    { label: 'audio visualizer',          href: '/audio-visualizer/index.html' },
    { label: 'nintendo games',            href: '/nintendo-games/index.html'   },
    { label: 'coming soon',               href: '/ideas/index.html'            },
    { label: 'devlog',                    href: '/devlog/index.html'           },
];

// ── Resolve which nav entry is "current" ─────────────────────────────
//
// A link is "selected" when the current pathname starts with the link's
// directory. This means every page inside /nintendo-games/* highlights
// the "nintendo games" entry, and so on.
//
// Special case: home (/index.html) only matches exactly so it isn't
// highlighted on every other page too.

function isSelected(linkHref) {
    const current = window.location.pathname
        .replace(/\/$/, '/index.html'); // treat bare "/" as "/index.html"

    const linkDir = linkHref.replace(/\/index\.html$/, '');

    if (linkDir === '') {
        // home — exact match only
        return current === '/index.html' || current === '/';
    }

    return current.startsWith(linkDir);
}

// ── Build & inject ────────────────────────────────────────────────────

function buildNav() {
    const container = document.getElementById('sidenav');
    if (!container) return;

    const closeBtn = document.createElement('a');
    closeBtn.href = 'javascript:void(0)';
    closeBtn.className = 'closebtn';
    closeBtn.textContent = '\u00D7'; // ×

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

// ── Open / close behaviour ────────────────────────────────────────────

const sidenav    = document.getElementById('sidenav');
const navOverlay = document.getElementById('nav-overlay');
const main       = document.getElementById('main');

const NAV_WIDTH        = 325;
const isVisualizerPage = !!document.getElementById('visualizer');

function getFixedShiftTargets() {
    return [
        { el: document.getElementById('visualizer'), defaultLeft: 0  },
        { el: document.querySelector('header'),      defaultLeft: 20 },
        { el: document.querySelector('footer'),      defaultLeft: 0  },
    ].filter(({ el }) => el);
}

function openNav() {
    sidenav.style.width  = NAV_WIDTH + 'px';
    sidenav.style.zIndex = '11';

    if (isVisualizerPage) {
        getFixedShiftTargets().forEach(({ el, defaultLeft }) => {
            el.style.left = (NAV_WIDTH + defaultLeft) + 'px';
        });
        const gui = document.querySelector('.lil-gui');
        if (gui) gui.style.visibility = 'hidden';
    } else {
        main.style.marginLeft    = NAV_WIDTH + 'px';
        main.style.pointerEvents = 'none';
    }

    document.getElementById('open-nav').style.display = 'none';
    navOverlay.classList.add('active');
}

function closeNav() {
    sidenav.style.width = '0';

    if (isVisualizerPage) {
        getFixedShiftTargets().forEach(({ el, defaultLeft }) => {
            el.style.left = defaultLeft + 'px';
        });
        const gui = document.querySelector('.lil-gui');
        if (gui) gui.style.visibility = 'visible';
    } else {
        main.style.marginLeft    = '0';
        main.style.pointerEvents = 'auto';
    }

    document.getElementById('open-nav').style.display = 'block';
    navOverlay.classList.remove('active');
}

document.getElementById('open-nav').addEventListener('click', openNav);
// .closebtn is injected above, so query it after buildNav()
sidenav.querySelector('.closebtn').addEventListener('click', closeNav);
navOverlay.addEventListener('click', closeNav);
sidenav.addEventListener('click', e => e.stopPropagation());