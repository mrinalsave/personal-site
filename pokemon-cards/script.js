// pokemon-cards/script.js

/* #region Card grid and lightbox */

const grid        = document.getElementById('grid');
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const caption     = document.getElementById('lightbox-caption');

// Load card data from JSON and create card elements.
fetch('./assets/data/cards.json')
    .then(res => res.json())
    .then(files => {
        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'card data-tilt';

            // Use thumbnail for the grid; full-size opens in the lightbox.
            const img = document.createElement('img');
            img.src     = `assets/images/cards/thumbnail/${file}`;
            img.loading = 'lazy';
            card.appendChild(img);

            const shine = document.createElement('div');
            shine.className = 'shine';
            card.appendChild(shine);

            const glare = document.createElement('div');
            glare.className = 'glare';
            card.appendChild(glare);

            grid.appendChild(card);

            card.addEventListener('click', () => {
                const fullsizeSrc = `assets/images/cards/fullsize/${file}`;

                // Preload full-size image, then fade it in.
                const tempImg = new Image();
                tempImg.src = fullsizeSrc;
                lightboxImg.style.opacity = '0';

                tempImg.onload = () => {
                    lightboxImg.src = fullsizeSrc;
                    void lightboxImg.offsetWidth; // force reflow for smooth fade
                    lightboxImg.style.opacity = '1';

                    // Extract card number from filename for the TCG Collector link.
                    const cardNumber = file
                        .replace(/\.[^/.]+$/, '')  // strip extension
                        .replace(/[-_]/g, ' ')      // normalise separators
                        .split(' ')
                        .pop();

                    caption.textContent = '';

                    const captionLink = document.createElement('a');
                    captionLink.href      = `https://www.tcgcollector.com/cards/${cardNumber}`;
                    captionLink.textContent = `source: TCG card #${cardNumber}`;
                    captionLink.target    = '_blank';
                    captionLink.rel       = 'noopener noreferrer';
                    captionLink.classList.add('retro-text', 'caption-text');
                    captionLink.addEventListener('click', e => e.stopPropagation());

                    caption.appendChild(captionLink);
                    lightbox.classList.add('active');
                };
            });
        });

        VanillaTilt.init(document.querySelectorAll('.card'), {
            max:         15,
            speed:       500,
            scale:       1.2,
            perspective: 900,
        });

        // Reference: https://codepen.io/emilandersson/details/jEbermZ
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('tiltChange', e => {
                const { tiltX, tiltY } = e.detail;

                // Convert tilt angles to percentage-space pointer coordinates.
                const px = 50 + tiltX * 2;
                const py = 50 - tiltY * 2;

                card.style.setProperty('--pointer-x',    `${px}%`);
                card.style.setProperty('--pointer-y',    `${py}%`);
                card.style.setProperty('--background-x', `${px}%`);
                card.style.setProperty('--background-y', `${py}%`);

                const intensity = Math.sqrt(tiltX ** 2 + tiltY ** 2);
                const opacity   = Math.min(intensity / 15, 1) * 0.25;
                card.style.setProperty('--card-opacity', opacity.toFixed(3));
            });

            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--card-opacity', 0);
            });
        });
    })
    .catch(err => console.error(err));

// Close lightbox by clicking outside the image or pressing Escape.
lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.classList.remove('active');
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') lightbox.classList.remove('active');
});

/* #endregion Card grid and lightbox */


/* #region Random GIF */

const randomGif = document.getElementById('random-gif');
const gifPath   = './assets/images/gifs/';
let gifs        = [];

fetch('./assets/data/gifs.json')
    .then(res => res.json())
    .then(data => {
        gifs = data;
        setRandomGif();
    })
    .catch(err => console.error('Failed to load gifs.json:', err));

function getRandomGif() {
    return gifs[Math.floor(Math.random() * gifs.length)];
}

function setRandomGif() {
    const selected  = getRandomGif();
    randomGif.src   = gifPath + selected;
    randomGif.alt   = selected.replace('.gif', '');
}

const backToTopLinkCustom = document.getElementById('back-to-top');
if (backToTopLinkCustom) {
    backToTopLinkCustom.addEventListener('click', e => {
        setRandomGif();
    });
}

/* #endregion Random GIF */