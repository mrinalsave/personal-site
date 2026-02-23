/* #region card grid and lightbox */

const grid = document.getElementById("grid");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const caption = document.getElementById("lightbox-caption");

// Load card data from JSON and create card elements.
fetch("./assets/data/cards.json")
  .then(res => res.json())
  .then(files => {
    files.forEach(file => {
      const card = document.createElement("div");
      card.className = "card";
      card.classList.add("data-tilt");

      // Use thumbnail for grid and full-size for lightbox.
      const img = document.createElement("img");
      img.src = `assets/images/cards/thumbnail/${file}`;
      img.loading = "lazy";
      card.appendChild(img);

      const shine = document.createElement("div");
      shine.className = "shine";
      card.appendChild(shine);

      const glare = document.createElement("div");
      glare.className = "glare";
      card.appendChild(glare);

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

          // Extract card number from filename for caption and link.
          const url = "https://www.tcgcollector.com/cards/"
          const formattedName = file
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ");
          const cardNumber = formattedName.split(" ").pop();
          caption.textContent = "";

          const captionLink = document.createElement("a");
          captionLink.href = (url + cardNumber);
          captionLink.textContent = ("source: TCG card #" + cardNumber);
          captionLink.target = "_blank";
          captionLink.rel = "noopener noreferrer";
          captionLink.classList.add("retro-text", "caption-text");

          // Don't interfere with other events.
          captionLink.addEventListener("click", (e) => {
            e.stopPropagation();
          });
          caption.appendChild(captionLink);

          lightbox.classList.add("active");
        };
      });
    });
    
    VanillaTilt.init(document.querySelectorAll(".card"), {
      max: 15,
      speed: 500,
      scale: 1.2,
      perspective: 900
    });

    // Reference: https://codepen.io/emilandersson/details/jEbermZ.
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("tiltChange", (e) => {
        const { tiltX, tiltY } = e.detail;

        // Convert tilt to % space.
        const px = 50 + tiltX * 2;
        const py = 50 - tiltY * 2;

        card.style.setProperty("--pointer-x", `${px}%`);
        card.style.setProperty("--pointer-y", `${py}%`);
        card.style.setProperty("--background-x", `${px}%`);
        card.style.setProperty("--background-y", `${py}%`);

        const intensity = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
        const opacity = Math.min(intensity / 15, 1) * 0.25;

        card.style.setProperty("--card-opacity", opacity.toFixed(3));
      });

      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--card-opacity", 0);
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

/* #region general */

// Randomize the GIF shown each time the page is loaded (includes "back to top").
const backToTopGif = document.getElementById("random-gif");
const gifPath = "./assets/images/gifs/";
fetch("./assets/data/gifs.json")
  .then(response => response.json())
  .then(data => {
      gifs = data;
      setRandomGif();
  })
  .catch(error => {
      console.error("Failed to load gifs.json:", error);
  });

function getRandomGif() { 
  const randomIndex = Math.floor(Math.random() * gifs.length); 
  return gifs[randomIndex]; 
} 

function setRandomGif() { 
  const selectedGif = getRandomGif(); 
  backToTopGif.src = gifPath + selectedGif; 
  backToTopGif.alt = selectedGif.replace(".gif", ""); 
} 

window.addEventListener("DOMContentLoaded", setRandomGif); 
backToTopLink.addEventListener("click", function() { setRandomGif(); });

/* #endregion general */