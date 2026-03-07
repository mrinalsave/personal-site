const sidenav = document.getElementById('sidenav');
const navOverlay = document.getElementById('nav-overlay');
const main = document.getElementById('main');

const NAV_WIDTH = 325;
const isVisualizerPage = !!document.getElementById('visualizer');

function getFixedShiftTargets() {
  return [
    { el: document.getElementById('visualizer'), defaultLeft: 0 },
    { el: document.querySelector('header'), defaultLeft: 20 },
    { el: document.querySelector('footer'), defaultLeft: 0 },
  ].filter(({ el }) => el);
}

function getGui() {
  return document.querySelector('.lil-gui');
}

function openNav() {
  sidenav.style.width = NAV_WIDTH + "px";
  sidenav.style.zIndex = "11";

  if (isVisualizerPage) {
    getFixedShiftTargets().forEach(({ el, defaultLeft }) => {
      el.style.left = (NAV_WIDTH + defaultLeft) + "px";
    });
    const gui = getGui();
    if (gui) gui.style.visibility = 'hidden';
  } else {
    main.style.marginLeft = NAV_WIDTH + "px";
    main.style.pointerEvents = 'none';
  }

  document.getElementById('open-nav').style.display = 'none';
  navOverlay.classList.add("active");
}

function closeNav() {
  sidenav.style.width = "0";

  if (isVisualizerPage) {
    getFixedShiftTargets().forEach(({ el, defaultLeft }) => {
      el.style.left = defaultLeft + "px";
    });
    const gui = getGui();
    if (gui) gui.style.visibility = 'visible';
  } else {
    main.style.marginLeft = "0";
    main.style.pointerEvents = 'auto';
  }

  document.getElementById('open-nav').style.display = 'block';
  navOverlay.classList.remove("active");
}

navOverlay.addEventListener('click', closeNav);
sidenav.addEventListener('click', (e) => e.stopPropagation());