/* #region sidenav push content with overlay */
// Set the width of the side navigation to 300px and the left margin of 
// the page content to the same, and add a black background color to body.

const main = document.getElementById('main');
const sidenav = document.getElementById('sidenav');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
  sidenav.style.width = "325px";
  main.style.marginLeft = "325px";
  main.style.pointerEvents = 'none';
  navOverlay.classList.add("active");
}

// Set the width of the side navigation to 0 and the left margin of 
// the page content to 0, and the background color of body to white.
function closeNav() {
  sidenav.style.width = "0";
  main.style.marginLeft = "0";
  main.style.pointerEvents = 'auto';
  navOverlay.classList.remove("active");
}

// Close the sidebar if the user clicks outside of it.
navOverlay.addEventListener('click', closeNav);

// Prevent click events on the sidebar itself from propagating to the 
// document (so it doesn't close when clicking inside the sidebar).
sidenav.addEventListener('click', (e) => {
  e.stopPropagation();
});

/* #endregion sidenav push content with overlay */