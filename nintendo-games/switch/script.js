// nintendo-games/switch/script.js

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

// ─── Home Screen ─────────────────────────────────
const homeScreen   = document.getElementById('home-screen');
const track       = document.getElementById('carousel-track');
const trackOuter  = document.getElementById('carousel-track-outer');
const arrowLeft   = document.getElementById('arrow-left');
const arrowRight  = document.getElementById('arrow-right');
const selectedTitle  = document.getElementById('selected-title');
const titleWrapper   = document.getElementById('selected-title-wrapper');
const okBtn          = document.getElementById('ok-btn');
const backBtn        = document.getElementById('back-btn');

if (track) {
    // Read live from DOM so they respond to viewport resize
    function ICON_SIZE() {
        const icon = track.querySelector('.game-icon');
        return icon ? icon.offsetWidth : 160;
    }
    function GAP() { return 12; }
    function STEP() { return ICON_SIZE() + GAP(); }

    let games = [];
    let scrollOffset = 0;
    let selectedIndex = 0;

    // ── Load & render ──────────────────────────────
    async function loadGames() {
        const res = await fetch('./data/switch.json');
        const all = await res.json();
        games = all.slice(0, 12); // always show exactly 12 on home
        renderTrack();
        // restore index if returning from all-software, else start at 0
        const restore = sessionStorage.getItem('homeSelectedIndex');
        const startIndex = restore !== null ? parseInt(restore, 10) : 0;
        sessionStorage.removeItem('homeSelectedIndex');
        const idx = Math.min(startIndex, games.length);
        selectGame(idx);
        scrollToShowIndex(idx);
        updateArrows();
        alignBottomBar();

    }

    function renderTrack() {
        track.innerHTML = '';
        games.forEach((game, i) => {
            const icon = document.createElement('div');
            icon.className = 'game-icon';

            const img = document.createElement('img');
            img.src = game.cover;
            img.alt = game.title;
            img.draggable = false;

            const border = document.createElement('div');
            border.className = 'game-icon-border';

            icon.appendChild(img);
            icon.appendChild(border);
            icon.addEventListener('click', () => {
                selectGame(i);
                scrollToShowIndex(i);
                
            });
            track.appendChild(icon);
        });

        const allSoftware = document.createElement('div');
        allSoftware.className = 'all-software-icon';

        const gridIcon = document.createElement('div');
        gridIcon.className = 'grid-icon';
        for (let i = 0; i < 4; i++) {
            const cell = document.createElement('span');
            gridIcon.appendChild(cell);
        }

        const label = document.createElement('span');
        label.className = 'grid-label switch-text';

        allSoftware.appendChild(gridIcon);
        allSoftware.appendChild(label);
        allSoftware.addEventListener('click', () => {
            selectGame(games.length);
            scrollToShowIndex(games.length);
        });
        track.appendChild(allSoftware);
    }

    // ── Selection ──────────────────────────────────
    const ALL_SOFTWARE_INDEX = -1; // sentinel for the all-software tile

    function selectGame(i) {
        selectedIndex = i;
        const isAllSoftware = i === games.length;

        document.querySelectorAll('.game-icon').forEach((el, idx) => {
            el.classList.toggle('selected', idx === i);
        });

        const allSoftwareTile = document.querySelector('.all-software-icon');
        if (allSoftwareTile) {
            allSoftwareTile.classList.toggle('selected', isAllSoftware);
        }

        if (selectedTitle) selectedTitle.textContent = isAllSoftware ? 'All Software' : games[i].title;
        positionTitle(i);
        if (okBtn) {
            if (isAllSoftware) okBtn.childNodes[2].nodeValue = " OK";
            else okBtn.childNodes[2].nodeValue = " Start";

            okBtn.classList.remove('inactive');
            okBtn.disabled = false;
        }
    }

    function positionTitle(i) {
        if (!selectedTitle || !titleWrapper) return;
        const isAllSoftware = i === games.length;

        // icon center in track coordinates
        const iconCenterInTrack = isAllSoftware
            ? (() => {
                const el = track.querySelector('.all-software-icon');
                const margin = el ? parseFloat(getComputedStyle(el).marginLeft) : 24;
                return i * STEP() + margin + (el ? el.offsetWidth / 2 : 60);
              })()
            : i * STEP() + ICON_SIZE() / 2;

        // trackOuter left edge relative to titleWrapper left edge
        const trackOuterRect = trackOuter.getBoundingClientRect();
        const wrapperRect = titleWrapper.getBoundingClientRect();
        const trackLeft = trackOuterRect.left - wrapperRect.left + 12; // +12 for trackOuter padding

        // center of icon relative to titleWrapper, accounting for current scroll
        const center = trackLeft + iconCenterInTrack - scrollOffset;

        const titleWidth = selectedTitle.offsetWidth;
        const minLeft = titleWidth / 2;
        const maxLeft = wrapperRect.width - titleWidth / 2;
        selectedTitle.style.left = Math.max(minLeft, Math.min(center, maxLeft)) + 'px';
    }

    function confirmSelection() {
        if (selectedIndex === games.length) {
            fadeTo('./all-software.html');
        } else if (games[selectedIndex]?.url) {
            window.open(games[selectedIndex].url, '_blank');
        }
    }

    if (okBtn) okBtn.addEventListener('click', confirmSelection);
    if (backBtn) backBtn.addEventListener('click', () => { 
        fadeTo('../index.html');
    } );

    // ── Scroll (view only) ─────────────────────────
    function maxScroll() {
        const totalWidth = (games.length + 1) * STEP();
        return Math.max(0, totalWidth - trackOuter.clientWidth);
    }

    function scrollTo(px, animate = false) {
        scrollOffset = Math.max(0, Math.min(px, maxScroll()));
        if (animate) {
            track.classList.add('animating');
            track.addEventListener('transitionend', () => {
                track.classList.remove('animating');
            }, { once: true });
        }
        track.style.transform = `translateX(-${scrollOffset}px)`;
        updateArrows();
        setTimeout(() => positionTitle(selectedIndex), 310);
    }

    function updateArrows() {
        if (arrowLeft)  arrowLeft.disabled  = scrollOffset <= 0;
        if (arrowRight) arrowRight.disabled = scrollOffset >= maxScroll();
    }

    // ── Keyboard: moves selection + scrolls to keep icon + border in view ──
    const BORDER = 8; // matches inset on .game-icon-border
    function scrollToShowIndex(i) {
        const iconLeft  = i * STEP();
        const iconRight = iconLeft + ICON_SIZE();
        const viewLeft  = scrollOffset;
        const viewRight = scrollOffset + trackOuter.clientWidth;

        if (iconLeft - BORDER < viewLeft) {
            scrollTo(iconLeft - BORDER - GAP(), true);
        } else if (iconRight + BORDER > viewRight) {
            scrollTo(iconRight + BORDER - trackOuter.clientWidth + GAP(), true);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        if (e.key === 'ArrowLeft') {
            const n = Math.max(0, selectedIndex - 1);
            selectGame(n);
            scrollToShowIndex(n);
        }
        if (e.key === 'ArrowRight') {
            const n = Math.min(games.length, selectedIndex + 1); // games.length = all-software
            selectGame(n);
            scrollToShowIndex(n);
        }
        if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
            confirmSelection();
        }
        if (e.key === 'b' || e.key === 'B') {
            fadeTo('../index.html');
        }
    });

    // ── Arrow buttons ──────────────────────────────
    arrowLeft?.addEventListener('click',  () => scrollTo(scrollOffset - STEP(), true));
    arrowRight?.addEventListener('click', () => scrollTo(scrollOffset + STEP(), true));

    // ── Mouse drag (scoped to trackOuter only) ─────
    let dragStartX = 0;
    let dragStartOffset = 0;
    let isDragging = false;

    trackOuter.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartOffset = scrollOffset;
        trackOuter.classList.add('dragging');
        e.preventDefault();
    });

    trackOuter.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        scrollTo(dragStartOffset + (dragStartX - e.clientX));
    });

    trackOuter.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        trackOuter.classList.remove('dragging');
    });

    trackOuter.addEventListener('mouseleave', () => {
        if (!isDragging) return;
        isDragging = false;
        trackOuter.classList.remove('dragging');
    });

    // ── Touch drag (mobile) ────────────────────────
    let touchStartX = 0;
    let touchStartOffset = 0;

    trackOuter.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartOffset = scrollOffset;
    }, { passive: true });

    trackOuter.addEventListener('touchmove', (e) => {
        const delta = touchStartX - e.touches[0].clientX;
        if (Math.abs(delta) > 5) e.preventDefault();
        scrollTo(touchStartOffset + delta);
    }, { passive: false });

    function alignBottomBar() {
        const bar = document.getElementById('home-bottom-bar');
        if (!bar || !trackOuter) return;
        const trackRect = trackOuter.getBoundingClientRect();
        const barParentRect = bar.parentElement.getBoundingClientRect();
        const rightOffset = barParentRect.right - trackRect.right;
        bar.style.paddingRight = Math.max(0, rightOffset) + 'px';
    }

    loadGames().then(() => alignBottomBar());

    window.addEventListener('resize', () => {
        updateArrows();
        scrollTo(selectedIndex * STEP(), false);
        positionTitle(selectedIndex);
        alignBottomBar();
    });
}
// ─── All Software Screen ──────────────────────────
const softwareScreen = document.getElementById('software-screen');
const softwareGrid = document.getElementById('software-grid');

if (softwareGrid) {
    let games = [];
    let selectedIndex = 0;
    const COLS = 6;
    let backSelected = false;
    const backBtn = document.getElementById('back-btn');

    function setBackSelected(val) {
        backSelected = val;
        if (backBtn) backBtn.classList.toggle('selected', val);
        const softwareOkBtn = document.getElementById('software-ok-btn');
        if (softwareOkBtn) softwareOkBtn.classList.toggle('inactive', val);
        if (val) {
            document.querySelectorAll('#software-grid .game-icon').forEach(el => el.classList.remove('selected'));
        }
    }

    function selectTile(i) {
        // clamp and check if we're going past the end
        if (i >= games.length) {
            setBackSelected(true);
            return;
        }
        setBackSelected(false);
        selectedIndex = Math.max(0, Math.min(i, games.length - 1));
        document.querySelectorAll('#software-grid .game-icon').forEach((el, idx) => {
            el.classList.toggle('selected', idx === selectedIndex);
        });
        // smooth scroll selected tile into view within the wrapper
        const wrapper = document.getElementById('software-grid-wrapper');
        const tile = softwareGrid.children[selectedIndex];
        if (wrapper && tile) {
            const wRect = wrapper.getBoundingClientRect();
            const tRect = tile.getBoundingClientRect();
            if (tRect.bottom > wRect.bottom) {
                wrapper.scrollBy({ top: tRect.bottom - wRect.bottom + 12, behavior: 'smooth' });
            } else if (tRect.top < wRect.top) {
                wrapper.scrollBy({ top: -(wRect.top - tRect.top + 12), behavior: 'smooth' });
            }
        }
    }

    function navigateBackToHome() {
        sessionStorage.setItem('homeSelectedIndex', String(games.length));
        fadeTo('./home.html');
    }
    window.navigateBackToHome = navigateBackToHome;

    async function loadSoftwareGrid() {
        const res = await fetch('./data/switch.json');
        games = await res.json();

        games.forEach((game, i) => {
            const icon = document.createElement('div');
            icon.className = 'game-icon';

            const img = document.createElement('img');
            img.src = game.cover;
            img.alt = game.title;
            img.draggable = false;

            const border = document.createElement('div');
            border.className = 'game-icon-border';

            icon.appendChild(img);
            icon.appendChild(border);
            icon.addEventListener('click', () => selectTile(i));
            softwareGrid.appendChild(icon);
        });

        selectTile(0);
        window._gamesLength = games.length;

        const softwareOkBtn = document.getElementById('software-ok-btn');
        if (softwareOkBtn) {
            softwareOkBtn.addEventListener('click', () => {
                if (!backSelected && games[selectedIndex]?.url) {
                    window.open(games[selectedIndex].url, '_blank');
                }
            });
        }
        // expose for inline onclick fallback
        window._softwareConfirm = () => {
            if (!backSelected && games[selectedIndex]?.url) {
                window.open(games[selectedIndex].url, '_blank');
            }
        };
    }

    document.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        if (backSelected) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setBackSelected(false);
                selectTile(games.length - 1);
            }
            if (e.key === 'Enter' || e.key === 'b' || e.key === 'B') {
                navigateBackToHome();
            }
            return;
        }
        if (e.key === 'ArrowRight') selectTile(selectedIndex + 1);
        if (e.key === 'ArrowLeft')  selectTile(Math.max(0, selectedIndex - 1));
        if (e.key === 'ArrowDown') {
            const nextRow = selectedIndex + COLS;
            const gamesInLastRow = games.length % COLS || COLS;
            const isGameBelow = (((selectedIndex + 1) % COLS) <= gamesInLastRow) && (nextRow < games.length);
            const isGameInLastRow = selectedIndex >= games.length - gamesInLastRow;

            if (isGameBelow) {
                // there's a game directly below in the next row, go to it
                selectTile(nextRow);
            } else if (selectedIndex === games.length - 1) {
                // last game in the last row
                setBackSelected(true);
            } else if (isGameInLastRow) {
                // last row, go to next game 
                selectTile(selectedIndex + 1);
            } else {
                // no game below, not the last row, and not the last game in the last row
                // go to last game in the last row
                selectTile(games.length - 1);
            }
        }
        if (e.key === 'ArrowUp')    selectTile(selectedIndex - COLS < 0 ? selectedIndex : selectedIndex - COLS);
        if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') {
            if (games[selectedIndex]?.url) window.open(games[selectedIndex].url, '_blank');
        }
        if (e.key === 'b' || e.key === 'B') {
            navigateBackToHome();
        }
    });

    loadSoftwareGrid();
}