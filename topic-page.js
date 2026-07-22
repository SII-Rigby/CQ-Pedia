(function () {
  const backToTop = document.querySelector("[data-back-to-top]");
  if (!backToTop) return;

  function updateBackToTop() {
    backToTop.classList.toggle("visible", window.scrollY > 240);
  }

  window.addEventListener("scroll", updateBackToTop, { passive: true });
  window.addEventListener("resize", updateBackToTop);
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateBackToTop();
}());
