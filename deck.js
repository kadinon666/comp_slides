const slides = Array.from(document.querySelectorAll('.slide'));
let current = 0;
const counter = document.getElementById('counter');
function showSlide(index) {
  current = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
  counter.textContent = `${current + 1} / ${slides.length}`;
}
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') showSlide(current + 1);
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') showSlide(current - 1);
  if (e.key.toLowerCase() === 'p') window.print();
});
showSlide(0);
