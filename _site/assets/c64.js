/* C64 background display — driven by the BASIC interpreter */
(function () {
  var DEFAULT_PROGRAM = '10 PRINT CHR$(205.5+RND(1)); : GOTO 10';

  var canvas, ctx;
  var FONT_SIZE = 21;
  var FONT = FONT_SIZE + 'px "Share Tech Mono", monospace';
  var CELL_W, CELL_H;
  var cols, rows;
  var buffer = [];
  var cursorCol = 0, cursorRow = 0;
  var charQueue = [];
  var FG = '#504a46';
  var BG = '#3a3430';
  var currentContext = null;
  var dirty = false;

  function initBuffer() {
    buffer = [];
    cursorCol = 0;
    cursorRow = 0;
    charQueue = [];
    dirty = true;
    for (var r = 0; r < rows; r++) {
      buffer.push(new Array(cols).fill(''));
    }
  }

  function writeChar(ch) {
    if (ch === '\n') {
      cursorCol = 0;
      cursorRow++;
    } else {
      if (cursorRow >= 0 && cursorRow < rows) {
        buffer[cursorRow][cursorCol] = ch;
      }
      cursorCol++;
      if (cursorCol >= cols) {
        cursorCol = 0;
        cursorRow++;
      }
    }
    while (cursorRow >= rows) {
      buffer.shift();
      buffer.push(new Array(cols).fill(''));
      cursorRow--;
    }
  }

  function render() {
    var perFrame = Math.ceil(cols / 3);
    for (var i = 0; i < perFrame && charQueue.length > 0; i++) {
      writeChar(charQueue.shift());
      dirty = true;
    }

    if (!dirty) return;
    dirty = false;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pass 1: draw / and \ as actual diagonal lines
    ctx.beginPath();
    ctx.strokeStyle = FG;
    ctx.lineWidth = 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var ch = buffer[r][c];
        var x = c * CELL_W;
        var y = r * CELL_H;
        if (ch === '/') {
          ctx.moveTo(x, y + CELL_H);
          ctx.lineTo(x + CELL_W, y);
        } else if (ch === '\\') {
          ctx.moveTo(x, y);
          ctx.lineTo(x + CELL_W, y + CELL_H);
        }
      }
    }
    ctx.stroke();

    // Pass 2: draw all other characters as text
    ctx.fillStyle = FG;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    for (var r = 0; r < rows; r++) {
      var hasText = false;
      var line = '';
      for (var c = 0; c < cols; c++) {
        var ch = buffer[r][c];
        if (ch && ch !== '/' && ch !== '\\') {
          line += ch;
          hasText = true;
        } else {
          line += ' ';
        }
      }
      if (hasText) {
        ctx.fillText(line, 0, r * CELL_H);
      }
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    ctx.font = FONT;
    CELL_W = Math.ceil(ctx.measureText('M').width);
    CELL_H = Math.ceil(FONT_SIZE * 1.2);
    cols = Math.floor(canvas.width / CELL_W);
    rows = Math.floor(canvas.height / CELL_H);
    initBuffer();
  }

  function runProgram(text) {
    if (currentContext) currentContext.complete = true;
    charQueue = [];
    initBuffer();
    try {
      var stmts = parse(lexer(text));
      stmts = orderProgram(stmts);
      var compiler = new ByteCompiler(stmts);
      currentContext = new Context(window, compiler, {
        schedule: function (fn) { setTimeout(fn, 200); }
      });
      currentContext.runSlowly();
    } catch (e) {
      console.error('BASIK:', e);
    }
  }

  function init() {
    canvas = document.getElementById('c64-bg');
    if (!canvas) return;

    resize();
    setInterval(render, 200);
    window.addEventListener('resize', resize);

    window.basicPrint = function (value) {
      var str = String(value);
      for (var i = 0; i < str.length; i++) {
        if (charQueue.length < cols * rows) {
          charQueue.push(str[i]);
        }
      }
    };

    window.basicInput = function (message, returnType, callback) {
      callback([0]);
    };

    var input = document.getElementById('c64-input');
    var output = document.getElementById('c64-output');

    if (input) {
      function run() {
        if (output) output.textContent = '';
        runProgram(input.innerText);
      }

      var runBtn = document.getElementById('c64-run');
      if (runBtn) runBtn.addEventListener('click', run);

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          run();
        }
      });

      input.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      });

      setTimeout(function () {
        run();
        input.focus();
        // Place cursor at end of text
        var range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 300);
    } else {
      setTimeout(function () {
        runProgram(DEFAULT_PROGRAM);
      }, 300);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.fonts.ready.then(init);
  });
})();
