// Every game answers a key when the terminal's input does not have focus.
//
// WHY THIS EXISTS. 136 claims held while every game was unplayable. They
// are all unit claims — `slideLine` slides, `scoreGuess` scores — and the
// fault was in none of them: the handlers hung off the terminal's input,
// so a reader who clicked the board to look at it stopped being able to
// move. `site.zd` claimed "the field always has focus here", and nothing
// checked it because nothing here could.
//
// WHY IT READS THE CANVAS FOR SOME GAMES. `Scene` renders to a `<canvas>`,
// not to SVG — the emitted call is `scene(node, …, () => [{op: 'path', …}])`
// — so a redraw changes pixels and leaves the markup identical. Comparing
// `innerHTML` reported `blocks`, `minesweeper` and `critters` as STUCK
// while they worked correctly. Those three are asked for their bitmap
// instead, and the two that draw with text are asked for their markup.
//
// WHY THIS ASKS "DID THE PANEL REDRAW". A game is dealt from the clock, so
// two launches of one game differ and a focused-versus-blurred comparison
// compares two different games. Within one launch, though, a key that
// moves something redraws the panel — so the question is asked once, of a
// blurred field, and the answer is the panel's own markup before and
// after.
//
// SNAKE IS NOT HERE, and the reason is a property of the game rather than
// a gap: its arrows queue a turn that the next tick spends, so the panel
// is identical immediately afterwards. Asking this question of snake
// reports a fault that does not exist — the first version of this file
// did, for four of six games, before their handlers were fixed.

const said = [];
const say = (s) => {
  said.push(s);
  document.getElementById('verdict').textContent = said.join(' | ');
};
const press = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
const panel = () => document.querySelector('.term-game, .term-game-wide');

function launch(name, then) {
  const field = document.querySelector('.term-field');
  field.focus();
  field.value = name;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  setTimeout(() => then(field), 0);
}

// What a game shows, in whichever form it shows it.
function shownBy(node) {
  const canvas = node.querySelector('canvas');
  return canvas ? canvas.toDataURL() : node.innerHTML;
}

// A canvas is painted from a frame callback, so it is blank for a moment
// after it is mounted and stale for a moment after a key. Reading at
// timeout zero raced both edges: a game whose first paint landed between
// the two reads was scored `moves` for painting rather than for moving,
// and a game whose key-redraw had not landed yet was scored STUCK. Two
// runs of this file disagreed about `blocks` and `critters` for exactly
// that reason. So wait for what is shown to stop changing on its own,
// and only then ask the question.
function settled(node, then, tries) {
  const left = tries === undefined ? 30 : tries;
  const seen = shownBy(node);
  requestAnimationFrame(() => setTimeout(() => {
    if (left <= 0 || shownBy(node) === seen) return then(seen);
    settled(node, then, left - 1);
  }, 16));
}

function check(name, keys, done) {
  launch(name, (field) => {
    const open = panel();
    if (!open) {
      say(name + '=NOT-LAUNCHED');
      return done();
    }
    // Where a reader's focus goes when they click the board to look at it.
    field.blur();
    settled(open, (before) => {
      // Several keys, because one may be a legal no-op — a piece against
      // the wall gives back the board it was handed, and never a sequence
      // that returns to where it started — see the list below.
      keys.forEach(press);
      settled(open, (after) => {
        say(name + '=' + (before !== after ? 'moves' : 'STUCK'));
        press('Escape');
        setTimeout(done, 0);
      });
    });
  });
}

setTimeout(() => {
  press('~');
  // NO SEQUENCE MAY RETURN TO WHERE IT STARTED. A game that moves a
  // cursor or a walker around a board undoes left with right and up with
  // down, so the four arrows in a ring leave the panel correctly
  // identical — and this file read that as a fault. It did so for
  // minesweeper three runs running, and for `critters` intermittently:
  // there, walking in a ring only ever looked like movement when a random
  // encounter happened to fire, which is what made the answer flaky
  // rather than simply wrong.
  const games = [
    ['2048', ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']],
    ['blocks', ['ArrowLeft', 'ArrowLeft', 'ArrowDown']],
    ['minesweeper', ['ArrowRight', 'ArrowRight', 'ArrowDown']],
    ['crawl', ['ArrowRight', 'ArrowRight', 'ArrowDown']],
    ['critters', ['ArrowRight', 'ArrowRight', 'ArrowDown']],
  ];
  let i = 0;
  const next = () => {
    if (i >= games.length) return say('done');
    const [n, k] = games[i++];
    check(n, k, next);
  };
  next();
}, 0);
