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

window.addEventListener('load', () => {
  const grid = document.querySelector('.grid');

  imageList.forEach(file => {
    const item = document.createElement('div');
    item.className = 'grid-item';
 
    const img = document.createElement('img');
    img.src = `./assets/images/${file}`;
 
    item.appendChild(img);
    grid.appendChild(item);
  });

  imagesLoaded(grid, () => {
    new Masonry(grid, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-item',
      percentPosition: true
    });
  });
});
 