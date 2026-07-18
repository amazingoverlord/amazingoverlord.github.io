// namegrid.js
// Empty-state animation for the portfolio show area.
// Renders a 4x4 grid spelling BIENVENIDO CRUZ (with two + marks filling the
// empty cells), then rotates ONE random cell 90 degrees at a time, on a random
// interval. Cumulative rotation (90 -> 180 -> 270 -> ...), smooth CSS transition.
//
// Exposes window.NameGrid = { init, start, stop }.
//  - init(container): builds the grid inside `container` (once).
//  - start(): begins/resumes the rotation loop.
//  - stop():  pauses the loop (state is preserved, so start() resumes).

(function () {
  // ---- Tunable timing (milliseconds between flips) -------------------------
  // To slow the animation down later, raise these two numbers.
  const MIN_DELAY = 400;
  const MAX_DELAY = 1200;
  // --------------------------------------------------------------------------

  // 4x4 layout. Each entry is one cell, row-major.
  const GRID = [
    "+", "B", "I", "E",
    "N", "V", "E", "N",
    "I", "D", "O", "+",
    "C", "R", "U", "Z"
  ];

  let cells = [];          // the <span> elements, in grid order
  let rotations = [];      // cumulative degrees per cell
  let timerId = null;      // active setTimeout id, or null when stopped
  let running = false;
  let built = false;

  function randomDelay() {
    return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  }

  function tick() {
    if (!running || cells.length === 0) return;

    // Pick one random cell and rotate it another 90 degrees.
    const i = Math.floor(Math.random() * cells.length);
    rotations[i] += 90;
    cells[i].style.transform = "rotate(" + rotations[i] + "deg)";

    timerId = setTimeout(tick, randomDelay());
  }

  function init(container) {
    if (!container || built) return;

    const grid = document.createElement("div");
    grid.className = "namegrid";

    cells = [];
    rotations = [];

    GRID.forEach(function (ch) {
      const span = document.createElement("span");
      span.className = "namegrid-cell";
      span.textContent = ch;
      grid.appendChild(span);
      cells.push(span);
      rotations.push(0);
    });

    container.appendChild(grid);
    built = true;
  }

  function start() {
    if (running || cells.length === 0) return;
    running = true;
    timerId = setTimeout(tick, randomDelay());
  }

  function stop() {
    running = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  window.NameGrid = { init: init, start: start, stop: stop };
})();
