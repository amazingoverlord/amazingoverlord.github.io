// ascii_hero.js
(function() {
const frames = [
  "            \n            \n            \n(ง'̀-'́)ง   \n            \n-HALFTXT-",
  "            \n            \n(ง'̀-'́)ง   \n            \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)ง   \n            \n-HALFTXT-",
  "            \n            \n(ง'̀-'́)ง   \n            \n            \n-HALFTXT-",
  "            \n            \n            \n (ง'̀-'́)ง  \n            \n-HALFTXT-",
  "            \n            \n(ง'̀-'́)ง   \n            \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)ง   \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)-o  \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)ง   \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)-o  \n            \n-HALFTXT-",
  "            \n            \n            \n(ง'̀-'́)ง   \n            \n-HALFTXT-",
  "            \n            \n (ง'̀-'́)ง  \n            \n            \n-HALFTXT-",
  "            \n            \n            \n  (ง'̀-'́)ง \n            \n-HALFTXT-",
  "            \n            \n            \n  (ง'̀-'́)-o\n            \n-HALFTXT-",
  "            \n            \n            \n  (ง'̀-'́)ง \n            \n-HALFTXT-",
  "            \n            \n(ง'̀-'́)ง   \n            \n            \n-HALFTXT-"
];

document.addEventListener('DOMContentLoaded', function() {
    let i = 0;
    const p = document.getElementById('hero');
    if (p) {
        setInterval(() => {
            p.innerText = frames[i];
            i = (i + 1) % frames.length;
        }, 250);
    } else {
        console.error('Element with id "hero" not found');
    }
});
})();