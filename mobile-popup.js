// mobile-popup.js

const mobilePopup = document.getElementById('mobile-popup');
const closePopup  = document.getElementById('close-popup');

closePopup?.addEventListener('click', () => {
    mobilePopup.style.display = 'none';
    localStorage.setItem('popupDismissed', 'true');
});

// Keep popup hidden across navigations if user already dismissed it
if ((window.innerWidth <= 768 || window.innerHeight <= 500)
        && localStorage.getItem('popupDismissed') === 'true') {
    mobilePopup.style.display = 'none';
}