/* #region card grid and lightbox */
const grid = document.getElementById("grid");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const caption = document.getElementById("lightbox-caption");

// Load card data from JSON and create card elements.
fetch("cards.json")
  .then(res => res.json())
  .then(files => {
    files.forEach(file => {
      const card = document.createElement("div");
      card.className = "card";

      // Use thumbnail for grid and full-size for lightbox.
      const img = document.createElement("img");
      img.src = `assets/images/cards/thumbnail/${file}`;
      img.loading = "lazy";
      card.appendChild(img);
      grid.appendChild(card);

      // Click event to open lightbox with full-size image and caption.
      card.addEventListener("click", () => {
        const fullsizeSrc = `assets/images/cards/fullsize/${file}`;

        // Create a temporary image to preload.
        const tempImg = new Image();
        tempImg.src = fullsizeSrc;

        // Small fade-out before switching.
        lightboxImg.style.opacity = "0";

        tempImg.onload = () => {
          lightboxImg.src = fullsizeSrc;

          // Force reflow for smooth fade.
          void lightboxImg.offsetWidth;

          lightboxImg.style.opacity = "1";

          const formattedName = file
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ");
          caption.textContent = formattedName;

          lightbox.classList.add("active");
        };
      });
    });

  })
  .catch(err => console.error(err));

// Click outside the image or press 'Escape' to close the lightbox.
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove("active");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    lightbox.classList.remove("active");
  }
});
/* #endregion card grid and lightbox */

/* #region back to top link functionality */
/*
  Source - https://stackoverflow.com/a/69643526
  Posted by D-Money, modified by community. See post 'Timeline' for change history
*/
const backToTopLink = document.getElementById("back-to-top");
backToTopLink.addEventListener('click', (event) => {
  event.preventDefault();
  window.scrollTo(0, 0);
});
/* #endregion back to top link functionality */

/* #region sidenav push content with overlay */
// Set the width of the side navigation to 300px and the left margin of 
// the page content to the same, and add a black background color to body.

const main = document.getElementById('main');
const sidenav = document.getElementById('sidenav');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
  sidenav.style.width = "300px";
  main.style.marginLeft = "300px";
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