// 2048 answers an arrow when the terminal's input does not have focus.
//
// WHY THIS EXISTS. 136 claims held while every game was unplayable. They
// are all unit claims — `slideLine` slides, `scoreGuess` scores — and the
// fault was in none of them: every game's handlers hung off the terminal's
// input, so a reader who clicked the board to look at it stopped being
// able to move. `site.zd` claimed "the field always has focus here", and
// nothing checked it because nothing here could.
//
// WHY ONLY ONE GAME. Two more general versions of this file were written
// and both asked a question that is not true of every game.
//
//   1. *Did the panel change?* No: a key may legitimately change nothing a
//      reader can see. Snake's arrows queue a turn the next tick spends,
//      and `blocksLeft` against the wall gives back the board it was
//      handed. Four of six games reported broken while working.
//   2. *Do focused and blurred agree?* No: comparing needs the same game
//      twice, and a game is dealt from the clock — `freshBoard of (clock)`
//      is a different board every launch, so three games disagreed with
//      themselves.
//
// 2048 is here because it is the one with a deterministic observable: a
// slide that moves anything spawns a tile, so the panel's text changes.
// Covering the rest wants a seed a test can fix, which is a change to the
// programs rather than to this file.

const said = [];
const say = (s) => {
  said.push(s);
  document.getElementById('verdict').textContent = said.join(' | ');
};
const press = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

setTimeout(() => {
  press('~');
  const field = document.querySelector('.term-field');
  if (!field) return say('NO-TERMINAL');
  field.focus();
  field.value = '2048';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  setTimeout(() => {
    const grid = document.querySelector('.t48-grid');
    if (!grid) return say('NO-GRID');
    // The focus goes where a reader's does when they look at the board.
    field.blur();
    say('blurred=' + (document.activeElement !== field));
    const before = grid.textContent.replace(/\s+/g, '');
    // All four, because one slide on a two-tile board can be a no-op and
    // the question is whether the keys arrive at all.
    press('ArrowLeft');
    press('ArrowUp');
    press('ArrowRight');
    press('ArrowDown');
    setTimeout(() => {
      const after = document.querySelector('.t48-grid').textContent.replace(/\s+/g, '');
      say(before !== after ? 'arrivesWithoutFocus' : 'STUCK');
      say('noError=' + !document.body.innerHTML.includes('zd-error'));
      say('done');
    }, 0);
  }, 0);
}, 0);
