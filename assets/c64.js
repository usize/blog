/* Rule 30 cellular automata background */
(function () {
  var canvas, ctx, width, height, cells;
  var BLOCK = 8;
  var ALIVE = '#504a46';
  var DEAD = '#3a3430';

  function xorshift(s) {
    s ^= s >> 12;
    s ^= s << 25;
    s ^= s >> 27;
    return s;
  }

  function seedCells() {
    cells = [];
    var s = (Date.now() * 9301 + 49297) & 0xFFFF;
    for (var i = 0; i < width; i++) {
      s = xorshift(s);
      cells.push(s & 1);
    }
  }

  function step() {
    // Scroll canvas up by one block row
    ctx.drawImage(canvas, 0, BLOCK, canvas.width, canvas.height - BLOCK,
                          0, 0, canvas.width, canvas.height - BLOCK);
    // Rule 30: left XOR (middle OR right)
    var next = [];
    for (var i = 0; i < width; i++) {
      var l = i > 0 ? cells[i - 1] : cells[width - 1];
      var m = cells[i];
      var r = i < width - 1 ? cells[i + 1] : cells[0];
      next.push(l ^ (m | r));
    }
    cells = next;

    // Draw new bottom row
    var y = canvas.height - BLOCK;
    for (var i = 0; i < width; i++) {
      ctx.fillStyle = cells[i] ? ALIVE : DEAD;
      ctx.fillRect(i * BLOCK, y, BLOCK, BLOCK);
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    width = Math.floor(canvas.width / BLOCK);
    height = Math.floor(canvas.height / BLOCK);
    seedCells();
    ctx.fillStyle = DEAD;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Pre-fill so the canvas isn't empty on load
    for (var i = 0; i < height; i++) step();
  }

  function init() {
    canvas = document.getElementById('c64-bg');
    if (!canvas) return;
    resize();
    setInterval(step, 200);
    window.addEventListener('resize', function () {
      resize();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/* BASIC terminal — home page only */
(function () {
  function init() {
    var input = document.getElementById('c64-input');
    var output = document.getElementById('c64-output');
    var runBtn = document.getElementById('c64-run');
    if (!input || !output || !runBtn) return;

    window.basicPrint = function (value) {
      output.appendChild(document.createTextNode(String(value)));
      output.scrollTop = output.scrollHeight;
    };

    window.basicInput = function (message, returnType, callback) {
      window.basicPrint(message || '');
      var val = window.prompt(message || 'INPUT', '');
      if (val === null) val = '0';
      window.basicPrint(val + '\n');
      var vals = val.split(',').map(function (v) {
        return returnType === 'string' ? v : (Number(v) || 0);
      });
      callback(vals);
    };

    function run() {
      output.textContent = '';
      try {
        var stmts = parse(lexer(input.value));
        stmts = orderProgram(stmts);
        var compiler = new ByteCompiler(stmts);
        var context = new Context(window, compiler, {
          schedule: function (fn) { setTimeout(fn, 0); }
        });
        context.runSlowly();
      } catch (e) {
        window.basicPrint('?SYNTAX ERROR\n' + e.toString() + '\n');
      }
    }

    runBtn.addEventListener('click', run);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        run();
      }
    });

    // Auto-run the default program
    setTimeout(run, 300);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
