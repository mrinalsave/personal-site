const grid = document.getElementById("grid");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const caption = document.getElementById("lightbox-caption");

fetch("cards.json")
  .then(res => res.json())
  .then(files => {

    files.forEach(file => {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.src = `assets/cards/thumbnail/${file}`;
      img.loading = "lazy";

      card.appendChild(img);
      grid.appendChild(card);

      card.addEventListener("click", () => {
        lightboxImg.src = `assets/cards/fullsize/${file}`;

        const formattedName = file
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");

        caption.textContent = formattedName;

        lightbox.classList.add("active");
      });
    });

  })
  .catch(err => console.error(err));

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