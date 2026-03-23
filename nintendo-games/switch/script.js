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

        const shuffled = all.sort(() => Math.random() - 0.5);
        games = shuffled.slice(0, 12); // always show exactly 12 on home
        
        renderTrack();
        // restore index if returning from all-software, else start at 0
        const restore = sessionStorage.getItem('homeSelectedIndex');
        const startIndex = restore !== null ? parseInt(restore, 10) : 0;
        sessionStorage.removeItem('homeSelectedIndex');
        const idx = Math.min(startIndex, games.length);
        selectGame(idx);
        scrollToShowIndex(idx);
        updateArrows();
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
        label.className = 'grid-label retro-text';

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
        // clamp to trackOuter's right edge (not full wrapperRect) so title stays within carousel bounds
        const trackOuterRight = trackOuterRect.right - wrapperRect.left;
        const maxLeft = trackOuterRight - titleWidth / 2;
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
        // measure actual rendered track width instead of estimating
        const totalWidth = track.scrollWidth;
        return Math.max(0, totalWidth - trackOuter.clientWidth + 24); // +24 for trackOuter padding
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
        if (i >= games.length) {
            scrollToShowAllSoftware();
            return;
        }
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

    // Scroll the all-software tile into view by measuring its actual DOM position,
    // since it has a different size and extra margin that i*STEP() can't account for.
    function scrollToShowAllSoftware() {
        const tile = track.querySelector('.all-software-icon');
        if (!tile) return;
        const tileRect  = tile.getBoundingClientRect();
        const outerRect = trackOuter.getBoundingClientRect();
        // convert to track-local coordinates by adding current scroll offset
        const tileLeft  = tileRect.left  - outerRect.left + scrollOffset;
        const tileRight = tileRect.right - outerRect.left + scrollOffset;
        const viewRight = trackOuter.clientWidth;
        if (tileRight + BORDER > viewRight + scrollOffset) {
            scrollTo(tileRight + BORDER - trackOuter.clientWidth + GAP(), true);
        } else if (tileLeft - BORDER < scrollOffset) {
            scrollTo(tileLeft - BORDER - GAP(), true);
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
        const leftOffset  = trackRect.left  - barParentRect.left;
        const rightOffset = barParentRect.right - trackRect.right;
        console.log('[alignBottomBar] trackRect:', JSON.stringify(trackRect.toJSON()), 'barParentRect:', JSON.stringify(barParentRect.toJSON()), 'leftOffset:', leftOffset, 'rightOffset:', rightOffset);
        bar.style.paddingLeft  = Math.max(0, leftOffset)  + 'px';
        bar.style.paddingRight = Math.max(0, rightOffset) + 'px';
    }

    function alignTopBar() {
        const bar = document.getElementById('home-top-bar');
        if (!bar || !trackOuter) return;
        const trackRect = trackOuter.getBoundingClientRect();
        const barParentRect = bar.parentElement.getBoundingClientRect();
        const leftOffset  = trackRect.left  - barParentRect.left;
        const rightOffset = barParentRect.right - trackRect.right;
        console.log('[alignTopBar] trackRect:', JSON.stringify(trackRect.toJSON()), 'barParentRect:', JSON.stringify(barParentRect.toJSON()), 'leftOffset:', leftOffset, 'rightOffset:', rightOffset);
        bar.style.paddingLeft  = Math.max(0, leftOffset)  + 'px';
        bar.style.paddingRight = Math.max(0, rightOffset) + 'px';
    }

    loadGames().then(() => {
        requestAnimationFrame(() => {
            alignBottomBar();
            alignTopBar();
            // diagnostic: log heights of all #home-screen children
            const hs = document.getElementById('home-screen');
            console.log('[layout] #home-screen height:', hs.offsetHeight, 'scrollHeight:', hs.scrollHeight);
            Array.from(hs.children).forEach(el => {
                console.log('[layout]', el.id || el.className, 'offsetHeight:', el.offsetHeight, 'paddingLeft:', el.style.paddingLeft, 'paddingRight:', el.style.paddingRight);
            });
        });
    });

    window.addEventListener('resize', () => {
        updateArrows();
        scrollTo(selectedIndex * STEP(), false);
        positionTitle(selectedIndex);
        alignBottomBar();
        alignTopBar();
    });
}

let time = document.getElementById('current-time');
let battery = document.getElementById('current-battery');

setInterval(() => {
    let date = new Date();
    time.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            const level = Math.round(bat.level * 100) + '%';
            battery.textContent = level;
        });
    } else {
        battery.textContent = '100%';
    }
}, 1000);

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
            tooltip.classList.remove('visible');
            return;
        }
        setBackSelected(false);
        selectedIndex = Math.max(0, Math.min(i, games.length - 1));
        document.querySelectorAll('#software-grid .game-icon').forEach((el, idx) => {
            el.classList.toggle('selected', idx === selectedIndex);
        });
        tooltip.classList.remove('visible'); // hide stale tooltip during scroll
        // smooth scroll selected tile into view, then position tooltip once settled
        const wrapper = document.getElementById('software-grid-wrapper');
        const tile = softwareGrid.children[selectedIndex];
        let needsScroll = false;
        if (wrapper && tile) {
            const tRect = tile.getBoundingClientRect();
            const wrapperScrollable = wrapper.scrollHeight > wrapper.clientHeight;
            if (wrapperScrollable) {
                const wRect = wrapper.getBoundingClientRect();
                if (tRect.bottom > wRect.bottom) {
                    wrapper.scrollBy({ top: tRect.bottom - wRect.bottom + 12, behavior: 'smooth' });
                    needsScroll = true;
                } else if (tRect.top < wRect.top) {
                    wrapper.scrollBy({ top: -(wRect.top - tRect.top + 12), behavior: 'smooth' });
                    needsScroll = true;
                }
            } else {
                const viewBottom = window.innerHeight;
                const viewTop = 0;
                if (tRect.bottom > viewBottom) {
                    window.scrollBy({ top: tRect.bottom - viewBottom + 12, behavior: 'smooth' });
                    needsScroll = true;
                } else if (tRect.top < viewTop) {
                    window.scrollBy({ top: tRect.top - viewTop - 12, behavior: 'smooth' });
                    needsScroll = true;
                }
            }
        }

        if (needsScroll) {
            // Wait for scroll to finish before positioning — getBCR is only correct
            // once the smooth scroll has settled. Track which element is scrolling.
            const snapIndex = selectedIndex;
            const snapTitle = games[selectedIndex].title;
            const scrollTarget = (wrapper && wrapper.scrollHeight > wrapper.clientHeight)
                ? wrapper : window;
            let scrollEndTimer;
            const onScroll = () => {
                clearTimeout(scrollEndTimer);
                scrollEndTimer = setTimeout(() => {
                    scrollTarget.removeEventListener('scroll', onScroll);
                    // Only show if selection hasn't changed while scrolling
                    if (selectedIndex === snapIndex) positionTooltip(snapIndex, snapTitle);
                }, 80);
            };
            scrollTarget.addEventListener('scroll', onScroll, { passive: true });
        } else {
            positionTooltip(selectedIndex, games[selectedIndex].title);
        }
    }

    function navigateBackToHome() {
        sessionStorage.setItem('homeSelectedIndex', String(games.length));
        fadeTo('./home.html');
    }
    window.navigateBackToHome = navigateBackToHome;

    // ── Tooltip (appended to software-screen, positioned via viewport coords) ──
    const gridWrapper = document.getElementById('software-grid-wrapper');
    const softwareScreenEl = document.getElementById('software-screen');
    const tooltip = document.createElement('div');
    tooltip.className = 'game-title-tooltip';
    const tooltipDot = document.createElement('div');
    tooltipDot.className = 'game-title-tooltip-icon';
    const tooltipText = document.createElement('span');
    tooltipText.className = 'game-title-tooltip-text switch-text';
    tooltip.appendChild(tooltipDot);
    tooltip.appendChild(tooltipText);
    // Append to software-screen so it doesn't interfere with grid-wrapper layout
    if (softwareScreenEl) softwareScreenEl.appendChild(tooltip);

    // Pre-measure tooltip size off-screen so positionTooltip never reads
    // layout while the element is visible/mid-position (avoids choppy jumps).
    let ttW = 0, ttH = 0;
    function measureTooltip(title) {
        tooltipText.textContent = title;
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'flex';
        ttW = tooltip.offsetWidth;
        ttH = tooltip.offsetHeight;
        tooltip.style.display = '';
        tooltip.style.visibility = '';
    }

    function positionTooltip(tileIndex, title) {
        if (!softwareScreenEl || !gridWrapper || !softwareGrid) return;

        measureTooltip(title);

        // getBoundingClientRect is correct here — this is always called after
        // any scroll has fully settled, so coordinates are final.
        const tileEl = softwareGrid.children[tileIndex];
        const sRect  = softwareScreenEl.getBoundingClientRect();
        const tRect  = tileEl.getBoundingClientRect();
        const wRect  = gridWrapper.getBoundingClientRect();

        const tileCenter = tRect.left - sRect.left + tRect.width  / 2;
        const tileTopRel = tRect.top  - sRect.top;
        const tileBotRel = tRect.bottom - sRect.top;

        const gridLeft  = wRect.left  - sRect.left;
        const gridRight = wRect.right - sRect.left;
        const minLeft = gridLeft  + ttW / 2;
        const maxLeft = gridRight - ttW / 2;
        const left = Math.max(minLeft, Math.min(tileCenter, maxLeft));

        // Flip below for first row: not enough room above wrapper top
        const roomAbove = tRect.top - wRect.top;
        const showBelow = roomAbove < ttH + 8;

        tooltip.style.left = left + "px";
        if (showBelow) {
            tooltip.style.top       = tileBotRel + 6 + "px";
            tooltip.style.transform = "translateX(-50%)";
        } else {
            tooltip.style.top       = tileTopRel + "px";
            tooltip.style.transform = "translateX(-50%) translateY(calc(-100% - 6px))";
        }
        tooltip.classList.add("visible");
    }

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