// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll('a[href*="ibb.co"] img');

  // Create lightbox
  const lightbox = document.createElement("div");
  lightbox.id = "lightbox";

  const lightboxImg = document.createElement("img");
  lightbox.appendChild(lightboxImg);

  document.body.appendChild(lightbox);

  // Enhance images
  links.forEach((img, index) => {
    const parent = img.closest("a");

    // Lazy load
    img.loading = "lazy";

    // Add title from alt
    parent.title = img.alt || "image";

    // Click event → open lightbox
    parent.addEventListener("click", (e) => {
      e.preventDefault();
      lightboxImg.src = img.src;
      lightbox.classList.add("active");
      currentIndex = index;
    });
  });

  // Close lightbox
  lightbox.addEventListener("click", () => {
    lightbox.classList.remove("active");
  });

  // Keyboard navigation
  let currentIndex = 0;

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;

    if (e.key === "Escape") {
      lightbox.classList.remove("active");
    }

    if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % links.length;
      lightboxImg.src = links[currentIndex].src;
    }

    if (e.key === "ArrowLeft") {
      currentIndex =
        (currentIndex - 1 + links.length) % links.length;
      lightboxImg.src = links[currentIndex].src;
    }
  });
});
