// hardcoded list for first version, will automate later
const imageList = [
  "0410.webp",
  "0510.webp",
  "0729.webp",
  "0823.webp",
  "0424.webp",
  "0810.webp",
  "0620.webp",
  "0325.webp",
  "0507.webp",
  "051024.webp",
  "0420.webp",
  "0514-0516.webp",
  "0214.webp",
  "0401.webp",
  "0726.webp",
  "0110.webp",
  "0124.webp",
  "0707.webp",
  "0503.webp",
  "0428-0429.webp",
  "0702.webp",
  "0108.webp"
];

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) lightbox.classList.remove('active');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') lightbox.classList.remove('active');
});

window.addEventListener('load', () => {
  const grid = document.querySelector('.grid');

  imageList.forEach(file => {
    const item = document.createElement('div');
    item.className = 'grid-item';

    const img = document.createElement('img');
    img.src = `./assets/images/${file}`;

    item.appendChild(img);
    grid.appendChild(item);

    item.addEventListener('click', () => {
      const src = `./assets/images/${file}`;

      lightboxImg.style.opacity = '0';

      const tempImg = new Image();
      tempImg.src = src;
      tempImg.onload = () => {
        lightboxImg.src = src;
        void lightboxImg.offsetWidth;
        lightboxImg.style.opacity = '1';
        lightbox.classList.add('active');
      };
    });
  });

  imagesLoaded(grid, () => {
    new Masonry(grid, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-item',
      percentPosition: true
    });
  });
});