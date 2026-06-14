(function () {
  let currentAudio = null;
  let currentButton = null;

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (currentButton) {
      currentButton.classList.remove("playing");
      currentButton.setAttribute("aria-pressed", "false");
    }

    currentAudio = null;
    currentButton = null;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-audio-src]");
    if (!button) {
      return;
    }

    const src = button.dataset.audioSrc;
    if (!src) {
      return;
    }

    if (currentButton === button) {
      stopCurrent();
      return;
    }

    stopCurrent();

    currentAudio = new Audio(src);
    currentButton = button;
    button.classList.add("playing");
    button.setAttribute("aria-pressed", "true");

    currentAudio.addEventListener("ended", stopCurrent, { once: true });
    currentAudio.addEventListener("error", stopCurrent, { once: true });
    currentAudio.play().catch(stopCurrent);
  });
}());
