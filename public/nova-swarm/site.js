const header = document.querySelector('[data-header]');
const mainShot = document.querySelector('[data-screen-main]');
const thumbs = Array.from(document.querySelectorAll('.screen-thumb'));

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 18);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

for (const thumb of thumbs) {
  thumb.addEventListener('click', () => {
    const shot = thumb.dataset.shot;
    if (!shot || !mainShot) return;
    for (const item of thumbs) item.classList.toggle('is-active', item === thumb);
    mainShot.src = shot;
  });
}
