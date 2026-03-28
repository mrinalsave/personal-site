const hamburger    = document.getElementById('hamburger');
const mobileDrawer = document.getElementById('mobileDrawer');
const drawerScrim  = document.getElementById('drawerScrim');

function openDrawer() {
    mobileDrawer.classList.add('open');
    drawerScrim.classList.add('active');
}
function closeDrawer() {
    mobileDrawer.classList.remove('open');
    drawerScrim.classList.remove('active');
}

hamburger.addEventListener('click', openDrawer);
drawerScrim.addEventListener('click', closeDrawer);