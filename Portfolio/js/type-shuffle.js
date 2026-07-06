/**
 * TypeShuffle.js — Faithful port of Codrops TypeShuffleAnimation (MIT)
 * https://github.com/codrops/TypeShuffleAnimation
 * 
 * Ported to vanilla JS (no bundler, no Splitting.js import).
 * Effects kept: fx1, fx3, fx6 only.
 */

/* -------------------------------------------------------
   Inline text splitter (replaces Splitting.js)
   Splits an element's text into <span class="word"> and <span class="char"> elements,
   grouped by visual lines.
   ------------------------------------------------------- */
function splitTextIntoChars(element) {
  const text = element.textContent;
  element.innerHTML = '';
  
  // Split into words, create spans
  const words = text.split(/(\s+)/);
  const wordElements = [];
  
  words.forEach(word => {
    if (/^\s+$/.test(word)) {
      // Whitespace — insert as-is
      element.appendChild(document.createTextNode(word));
    } else {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';
      
      // Split word into chars
      Array.from(word).forEach(ch => {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = ch;
        wordSpan.appendChild(charSpan);
      });
      
      element.appendChild(wordSpan);
      wordElements.push(wordSpan);
    }
  });
  
  return wordElements;
}

/**
 * Groups char spans into visual lines based on their offsetTop.
 */
function groupByLines(element) {
  const charEls = Array.from(element.querySelectorAll('.char'));
  const lines = [];
  let currentLine = [];
  let currentTop = null;
  
  charEls.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (currentTop === null || Math.abs(top - currentTop) < 3) {
      currentLine.push(el);
      if (currentTop === null) currentTop = top;
    } else {
      lines.push(currentLine);
      currentLine = [el];
      currentTop = top;
    }
  });
  if (currentLine.length > 0) lines.push(currentLine);
  
  return lines;
}

/* -------------------------------------------------------
   Helper: random number in range
   ------------------------------------------------------- */
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* -------------------------------------------------------
   Class: Line
   ------------------------------------------------------- */
class Line {
  position = -1;
  cells = [];
  
  constructor(linePosition) {
    this.position = linePosition;
  }
}

/* -------------------------------------------------------
   Class: Cell (one character)
   ------------------------------------------------------- */
class Cell {
  DOM = { el: null };
  position = -1;
  previousCellPosition = -1;
  original;
  state;
  color;
  originalColor;
  cache;
  
  constructor(domEl, { position, previousCellPosition } = {}) {
    this.DOM.el = domEl;
    this.original = this.DOM.el.innerHTML;
    this.state = this.original;
    this.color = this.originalColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text') || '#ffffff';
    this.position = position;
    this.previousCellPosition = previousCellPosition;
  }
  
  set(value) {
    this.state = value;
    this.DOM.el.innerHTML = this.state;
  }
}

/* -------------------------------------------------------
   Class: TypeShuffle
   ------------------------------------------------------- */
class TypeShuffle {
  DOM = { el: null };
  lines = [];
  lettersAndSymbols = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '!','@','#','$','&','*','(',')','-','_','+','=','/',
    '[',']','{','}',';',':','<','>',',',
    '0','1','2','3','4','5','6','7','8','9'
  ];
  effects = {
    'fx1': () => this.fx1(),
    'fx3': () => this.fx3(),
    'fx6': () => this.fx6(),
  };
  totalChars = 0;
  isAnimating = false;
  
  constructor(domEl) {
    this.DOM.el = domEl;
    
    // Split text into char spans (replaces Splitting.js)
    splitTextIntoChars(this.DOM.el);
    
    // Group chars by visual line
    const visualLines = groupByLines(this.DOM.el);
    
    for (const [linePosition, charElements] of visualLines.entries()) {
      const line = new Line(linePosition);
      let cells = [];
      let charCount = 0;
      
      for (const charEl of charElements) {
        cells.push(
          new Cell(charEl, {
            position: charCount,
            previousCellPosition: charCount === 0 ? -1 : charCount - 1
          })
        );
        ++charCount;
      }
      
      line.cells = cells;
      this.lines.push(line);
      this.totalChars += charCount;
    }
  }
  
  /** Clear all cells to &nbsp; */
  clearCells() {
    for (const line of this.lines) {
      for (const cell of line.cells) {
        cell.set('&nbsp;');
      }
    }
  }
  
  /** Get a random character from the pool */
  getRandomChar() {
    return this.lettersAndSymbols[Math.floor(Math.random() * this.lettersAndSymbols.length)];
  }
  
  /**
   * Effect 1 — Clear cells, animate each line with a sliding left-to-right illusion.
   * Characters are cached and passed from cell to cell, creating a "ticker tape" effect.
   * Delay per line creates a staggered cascade.
   */
  fx1() {
    const MAX_CELL_ITERATIONS = 45;
    let finished = 0;
    
    this.clearCells();
    
    const loop = (line, cell, iteration = 0) => {
      cell.cache = cell.state;
      
      if (iteration === MAX_CELL_ITERATIONS - 1) {
        cell.set(cell.original);
        ++finished;
        if (finished === this.totalChars) {
          this.isAnimating = false;
        }
      } else if (cell.position === 0) {
        // First cell in line: generate random char (special chars for first 9 iterations)
        cell.set(iteration < 9
          ? ['*', '-', "'", '"'][Math.floor(Math.random() * 4)]
          : this.getRandomChar());
      } else {
        // Take the cached value of the previous cell → sliding illusion
        cell.set(line.cells[cell.previousCellPosition].cache);
      }
      
      // Don't count empty space iterations
      if (cell.cache !== '&nbsp;') {
        ++iteration;
      }
      
      if (iteration < MAX_CELL_ITERATIONS) {
        setTimeout(() => loop(line, cell, iteration), 15);
      }
    };
    
    for (const line of this.lines) {
      for (const cell of line.cells) {
        setTimeout(() => loop(line, cell), (line.position + 1) * 200);
      }
    }
  }
  
  /**
   * Effect 3 — Clear cells, each cell scrambles independently with random delay.
   * All cells start at random times creating a "stardust" materialization.
   */
  fx3() {
    const MAX_CELL_ITERATIONS = 10;
    let finished = 0;
    this.clearCells();
    
    const loop = (line, cell, iteration = 0) => {
      if (iteration === MAX_CELL_ITERATIONS - 1) {
        cell.set(cell.original);
        ++finished;
        if (finished === this.totalChars) {
          this.isAnimating = false;
        }
      } else {
        cell.set(this.getRandomChar());
      }
      
      ++iteration;
      if (iteration < MAX_CELL_ITERATIONS) {
        setTimeout(() => loop(line, cell, iteration), 80);
      }
    };
    
    for (const line of this.lines) {
      for (const cell of line.cells) {
        setTimeout(() => loop(line, cell), randomNumber(0, 2000));
      }
    }
  }
  
  /**
   * Effect 6 — Each cell scrambles with random colors, then resolves.
   * Color palette cycles through dark/light green/cyan for a terminal glow effect.
   * Random interval per iteration creates organic timing.
   */
  fx6() {
    const MAX_CELL_ITERATIONS = 15;
    let finished = 0;
    
    const loop = (line, cell, iteration = 0) => {
      cell.cache = { state: cell.state, color: cell.color };
      
      if (iteration === MAX_CELL_ITERATIONS - 1) {
        cell.set(cell.original);
        cell.color = cell.originalColor;
        cell.DOM.el.style.color = cell.color;
        
        ++finished;
        if (finished === this.totalChars) {
          this.isAnimating = false;
        }
      } else {
        cell.set(this.getRandomChar());
        cell.color = ['#333333', '#ffffff', '#00ccaa'][Math.floor(Math.random() * 3)];
        cell.DOM.el.style.color = cell.color;
      }
      
      ++iteration;
      if (iteration < MAX_CELL_ITERATIONS) {
        setTimeout(() => loop(line, cell, iteration), randomNumber(30, 110));
      }
    };
    
    for (const line of this.lines) {
      for (const cell of line.cells) {
        setTimeout(() => loop(line, cell), (line.position + 1) * 80);
      }
    }
  }
  
  /**
   * Trigger an effect by name.
   * @param {string} effect — 'fx1', 'fx3', or 'fx6'
   */
  trigger(effect = 'fx1') {
    if (!(effect in this.effects) || this.isAnimating) return;
    this.isAnimating = true;
    this.effects[effect]();
  }
}

/* -------------------------------------------------------
   Expose globally
   ------------------------------------------------------- */
window.TypeShuffle = TypeShuffle;
