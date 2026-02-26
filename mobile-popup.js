/* #region mobile popup */

const mobilePopup = document.getElementById("mobile-popup");
const closePopup = document.getElementById("close-popup");

closePopup?.addEventListener("click", () => {
  mobilePopup.style.display = "none";
  localStorage.setItem("popupDismissed", "true");
});

if (window.innerWidth <= 768) {
  if (localStorage.getItem("popupDismissed") === "true") {
    mobilePopup.style.display = "none";
  }
}

/* #endregion mobile popup */