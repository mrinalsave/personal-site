const mobilePopup = document.getElementById('mobile-popup');
const closePopup  = document.getElementById('close-popup');

function hidePopup() {
    if (mobilePopup.style.display === 'none') return;
    mobilePopup.classList.add('hiding');
    mobilePopup.addEventListener('animationend', () => {
        mobilePopup.style.display = 'none';
        mobilePopup.classList.remove('hiding');
    }, { once: true });
}

function showPopup() {
    if (mobilePopup.style.display === 'block') return;
    mobilePopup.classList.remove('hiding');
    mobilePopup.style.display = 'block';
}

closePopup?.addEventListener('click', () => {
    hidePopup();
    localStorage.setItem('popupDismissed', 'true');
});

function checkPopup() {
    if ((window.innerWidth <= 768 || window.innerHeight <= 500)
            && localStorage.getItem('popupDismissed') !== 'true') {
        showPopup();
    } else {
        hidePopup();
    }
}

checkPopup();
window.addEventListener('resize', checkPopup);