"use strict"

function Program(statements) {
  this.statements = statements;
  this.stmtNumberToIndex = {};
  this.indexToStmtNumber = {};
}

function Statement(lineNumber, stmtNumber, commands) {
  this.type = "Statement";
  this.lineNumber = lineNumber;
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
  this.commands = commands;
}

function Goto(stmtNumber) {
  this.type = "Goto";
  this.stmtNumber = stmtNumber;
  this.targetIndex = undefined;
}

function GoSub(stmtNumber, returnNumber) {
  this.type = "GoSub";
  this.stmtNumber = stmtNumber;
  this.returnNumber = returnNumber;
  this.targetIndex = undefined;
}

function Def(name, arg, body) {
  this.type = "Def";
  this.name = name;
  this.arg = arg;
  this.body = body;
}

function Return() {
  this.type = "Return";
}

function Next(stepVar) {
  this.type = "Next";
  this.stepVar = stepVar;
}

function End() {
  this.type = "End";
}

function Data(args) {
  this.type = "Data";
  this.args = args;
}

function Read(args) {
  this.type = "Read";
  this.args = args;
}

function Restore() {
  this.type = "Restore";
}

function Let(variable, expr) {
  this.type = "Let";
  this.variable = variable;
  this.expr = expr;
}

function Print(exprs, println) {
  this.type = "Print";
  this.exprs = exprs;
  this.println = println;
}

function Input(variables, message) {
  this.type = "Input";
  this.message = message || "";
  this.variables = variables;
}

function If(expr, stmtNumber) {
  this.type = "If";
  this.expr = expr;
  this.stmtNumber = stmtNumber;
  this.targetIndex = undefined;
}

function IfStmt(expr, stmt) {
  this.type = "IfStmt";
  this.expr = expr;
  this.stmt = stmt;
}

/**
 * args: {
 *  initExpr: {},
 *  toExpr: {},
 *  stepExpr: {},
 *  trueTarget: int,
 *  falseTarget: int,
 *  nextVar: Variable
 * }
 **/
function For(args) {
  this.type = "For";
  this.initExpr = args.initExpr;
  this.toExpr = args.toExpr;
  this.stepExpr = args.stepExpr;
  this.trueTarget = args.trueTarget;
  this.falseTarget = args.falseTarget;
  this.nextVar = args.nextVar;
  this.stepValue = 1; // The default
}

function Variable(variable) {
  this.type = "Variable";
  this.variable = variable;

  this.fullName = variable.value;

  if (this.fullName.endsWith("$")) {
    this.suffix = "$";
    this.dataType = "string";
    this.name = this.fullName.slice(0, -1);
  } else if (this.fullName.endsWith("%")) {
    this.suffix = "%";
    this.dataType = "int";
    this.name = this.fullName.slice(0, -1);
  } else {
    this.suffix = "";
    this.dataType = "real";
    this.name = this.fullName;
  }

  this.key = this.name.slice(0, 2).toUpperCase();
  this.fullKey = this.key + this.suffix;
}


function Dim(name, args) {
  this.type = "Dim";
  // arrays have the same data types as variables
  // so we can just reuse the parsing logic
  var variable = (new Variable(name));
  this.name = variable.name;
  this.dataType = "array" + variable.dataType;
  this.args = args;
};

function ArrayAssign(name, args, exprR) {
  this.type = "ArrayAssign";
  this.name = name.name;
  this.dataType = "array";
  this.args = args;
  this.exprR = exprR;
}
function ArrayAccess(name, args) {
  this.type = "ArrayAccess";
  var variable = (new Variable(name));
  this.name = variable.name;
  this.dataType = "array";
  this.args = args;
}

function UnaryOp(exprR, op) {
  this.type = "UnaryOp";
  this.exprR = exprR;
  this.op = op;
}

function BinOp(exprL, exprR, op) {
  this.type = "BinOp";
  this.exprL = exprL;
  this.exprR = exprR;
  this.op = op.value;
}

function Call(fn, arg) {
  this.type = "Call";
  this.fn = fn;
  this.arg = arg;
}
"use strict";

var KEYWORDS = [
  'GOTO',
  'GOSUB',
  'IF',
  'THEN',
  'LET',
  'END',
  'STOP',
  'PRINT',
  'DEF',
  'REM',
  'INPUT',
  'RETURN',
  'FOR',
  'NEXT',
  'TO',
  'STEP',
  'DIM',
  'AND',
  'OR',
  'NOT',
  'DATA',
  'READ',
  'RESTORE',
];

var KEYWORD_EXP = RegExp('(' + KEYWORDS.join('|') + ')', 'y');

// Token types that are valid on the LHS of a binary op.
var BINOP_LHS = [
  'VARIABLE',
  'STRING',
  'INT',
  'FLOAT',
  'R_PAR',
];

var OPERATORS = {
  'AND': 'AND',
  'OR': 'OR',
  '<>': 'NOTEQ',
  '><': 'NOTEQ',
  '<=': 'LTE',
  '=<': 'LTE',
  '>=': 'GTE',
  '=>': 'GTE',
  '<':  'LT',
  '>':  'GT',
  '=':  'EQ',
  '+':  'ADD',
  '-':  'SUB',
  '*':  'MUL',
  '/':  'DIV',
  '^':  'POW'
};

var UNARY_OPS = {
  '-': 'NEG',
  '+': 'POS',
  'NOT': 'NOT',
};

var MISC = {
  '(': 'L_PAR',
  ')': 'R_PAR',
  '[': 'L_BRACKET',
  ']': 'R_BRACKET',
  '{': 'L_BRACE',
  '}': 'R_BRACE',
  ':': 'COLON',
  ';': 'SEMICOLON',
  ',': 'COMMA',
};

function Token(name, value, lineNumber) {
  this.name = name;
  this.value = value;
  this.lineNumber = lineNumber;
}

function match(exp, chr, startIndex = null) {
  if (chr === undefined) {
    return false;
  }
  if (startIndex !== null) {
    if (!exp.sticky) {
      throw new ValueError('startIndex may only be used with sticky expressions');
    }
    exp.lastIndex = startIndex;
  }
  return exp.test(chr);
}

function lexer(text) {
  var tokens = [];
  var lineno = 1;

  for (var line of text.split('\n')) {
    var cursor = 0;

    while(cursor < line.length) {
      var substr = "";
      /* Skip Whitespace */
      while (/\s/.test(line[cursor])) {
        cursor++;
      }

      /* Comments */
      if (line[cursor] == "'") {
        cursor = line.length;
        continue;
      }

      /* KEYWORDS & IDENTIFIERS */
      if (match(/[a-zA-Z]/, line[cursor])) {
        KEYWORD_EXP.lastIndex = cursor;
        var kw = KEYWORD_EXP.exec(line);
        if (kw) {
          substr = kw[0];
          if (substr == 'REM') {
            tokens.push(new Token('REM', substr + line.slice(cursor), lineno));
            cursor = line.length;
            continue;
          } else if (substr in UNARY_OPS) {
            tokens.push(new Token('UNOP', UNARY_OPS[substr], lineno));
          } else if (substr in OPERATORS) {
            tokens.push(new Token('BINOP', OPERATORS[substr], lineno));
          } else if (KEYWORDS.includes(substr)) {
            tokens.push(new Token(substr, '', lineno));
          }
          cursor += substr.length
          continue;
        }

        do {
          substr += line[cursor];
          cursor++;
        } while (match(/[a-zA-Z0-9]/, line[cursor]) && !match(KEYWORD_EXP, line, cursor));

        if (/[%$]/.test(line[cursor])) {
          substr += line[cursor];
          cursor++;
        }

        tokens.push(new Token('VARIABLE', substr, lineno));
        continue;
      }

      /* STRINGS */
      if (/\"/.test(line[cursor])) {
        cursor++;
        while(match(/[^\"]/, line[cursor])) {
          substr += line[cursor];
          cursor++;
        }
        cursor++;
        tokens.push(new Token('STRING', substr, lineno));
        continue;
      }

      /* Binary Ops and Misc */
      var lastTok = tokens[tokens.length - 1];

      var op = line.slice(cursor, cursor + 2);
      if (!(op in OPERATORS)) {
        op = line[cursor];
      }
      if (op in OPERATORS && lastTok && BINOP_LHS.includes(lastTok.name)) {
        tokens.push(new Token('BINOP', OPERATORS[op], lineno));
        cursor += op.length;
        continue;
      }

      if (op in MISC) {
        tokens.push(new Token(MISC[op], op, lineno));
        cursor += op.length;
        continue;
      }

      if (op in UNARY_OPS) {
        tokens.push(new Token('UNOP', UNARY_OPS[op], lineno));
        cursor += op.length;
        continue;
      }

      /* INTEGERS AND FLOATS*/
      if (match(/[+-\.]?[0-9]/y, line, cursor)) {
        var intType = (cursor == 0) ? 'STMTNO' : 'INT';
        do {
          substr += line[cursor];
          cursor++;
        } while (/[0-9]/.test(line[cursor]));
        // float with no beginning zero
        if (substr[0] == '.') {
          tokens.push(new Token('FLOAT', substr, lineno));
          continue;
        }

        if (line[cursor] == '.' && match(/[0-9]/, line[cursor + 1])) {
          do {
            substr += line[cursor];
            cursor++;
          } while (/[0-9]/.test(line[cursor]));
          tokens.push(new Token('FLOAT', substr, lineno));
          continue;
        }

        tokens.push(new Token(intType, substr, lineno));
        continue;
      }

      tokens.push(new Token('SYNTAX_ERROR', line[cursor], lineno));
      cursor++;
    }
    lineno++;
  }

  return tokens;
}
"use strict";

var BINOPS_PRIORITY = {
  'EQ': 3,

  'OR': 4,
  'AND': 5,

  'LT': 6,
  'LTE': 6,
  'GT': 6,
  'GTE': 6,
  'NOTEQ': 6,

  'SUB': 8,
  'ADD': 8,

  'DIV': 9,
  'MUL': 9,
  'MOD': 9,

  'POW': 10
};

function parseTerm(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "INT":
      var value = parseInt(token.value, 10);
      if (value != value & 0xffff)
        throw "bad number range";
      return value;

    case "FLOAT":
      var value = parseFloat(token.value, 10);
      if (value != value & 0xffff)
        throw "bad number range";
      return value;

    case "VARIABLE":
      if (ctx.peek() && ctx.peek().name == "L_PAR" ) {
        ctx.next();
        var args = [parseExpression(ctx)];
        while (ctx.peek().name == "COMMA") {
          ctx.next();
          args.push(parseExpression(ctx));
        }
        ctx.matchName("R_PAR");
        if (ctx.arrayNames.indexOf(token.value) < 0)
          return new Call(token, args[0]);
        // This must be an array access
        return new ArrayAccess(token, args);
      }
      return new Variable(token);

    case "STRING":
      return token.value;

    case "UNOP":
      var expr = parseTerm(ctx);
      return new UnaryOp(expr, token.value);

    case "L_PAR":
      var expr = parseExpression(ctx);
      ctx.matchName("R_PAR");
      return expr;

    default:
      throw new SyntaxError("Error at line " + token.lineNumber +
                            ": unexpected token " + JSON.stringify(token));
  }
}

function parseExpression(ctx) {
  var exprList = [];
  var binOps = [];
  for (;;) {
    exprList.push(parseTerm(ctx));

    var tokenNext = ctx.peek();
    if (tokenNext && tokenNext.name == 'BINOP') {
      while (binOps.length >= 1 &&
             BINOPS_PRIORITY[binOps[binOps.length-1].value] >=
             BINOPS_PRIORITY[tokenNext.value]) {
        var b = exprList.pop();
        var a = exprList.pop();
        exprList.push(new BinOp(a, b, binOps.pop()));
      }
      binOps.push(tokenNext);
      ctx.next();
    } else {
      while (binOps.length) {
        var b = exprList.pop();
        var a = exprList.pop();
        exprList.push(new BinOp(a, b, binOps.pop()));
      }
      return exprList[0];
    }
  }
}

function parseVariable(ctx, dataType = null) {
  var variable = new Variable(ctx.matchName("VARIABLE"));

  if (dataType != null && variable.dataType != dataType) {
    throw new SyntaxError(`Unexpected variable type for ${variable.fullName}. Expected ${dataType}`);
  }

  return variable;
}

function parseCommand(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "GOTO":
      var tok = ctx.matchName("INT");
      return new Goto(parseInt(tok.value, 10));

    case "GOSUB":
      var stmt = ctx.matchName("INT");
      return new GoSub(parseInt(stmt.value, 10), stmt.lineNumber);

    case "DEF":
      var name = parseVariable(ctx);
      ctx.matchName("L_PAR");
      var arg = parseVariable(ctx);
      ctx.matchName("R_PAR");
      ctx.matchBinOp("EQ");
      var body = parseExpression(ctx);
      return new Def(name.fullName, arg, body);

    case "RETURN":
      return new Return();

    case "NEXT":
      // will specify a value to be incremented
      var stepVar = parseVariable(ctx, "real");
      return new Next(stepVar.name);

    case "END":
      return new End();

    case "STOP":
      return new End();

    case "DIM":
      var args = [];
      var name = ctx.matchName("VARIABLE");
      ctx.matchName("L_PAR");
      args.push(parseExpression(ctx));
      while (ctx.peek().name == "COMMA") {
        ctx.next();
        args.push(parseExpression(ctx));
      }
      ctx.matchName("R_PAR");
      ctx.arrayNames.push(name.value);
      return new Dim(name, args);

    case "DATA":
      var args = [];
      args.push(parseExpression(ctx));
      while (ctx.peek().name == "COMMA") {
        ctx.next();
        args.push(parseExpression(ctx));
      }
      return new Data(args);

    case "READ":
      var args = [];
      args.push(parseVariable(ctx));
      while (ctx.peek().name == "COMMA") {
        ctx.next();
        args.push(parseVariable(ctx));
      }
      return new Read(args);

    case "RESTORE":
      return new Restore();

    case "LET":
      var variable = parseVariable(ctx);
      ctx.matchBinOp("EQ");
      var expr = parseExpression(ctx);
      return new Let(variable, expr);

    case "VARIABLE":
      var variable = new Variable(token);
      if (ctx.peek() && ctx.peek().name == "L_PAR") {
        ctx.next();
        var args = [parseExpression(ctx)];
        while (ctx.peek().name == "COMMA") {
          ctx.next();
          args.push(parseExpression(ctx));
        }
        ctx.matchName("R_PAR");
        // Check for an assignment
        if (ctx.peek() && ctx.peek().value == "EQ") {
          ctx.next();
          var exprR = parseExpression(ctx);
          return new ArrayAssign(variable, args, exprR);
        }

        if (ctx.arrayNames.indexOf(token.value) < 0)
          return new Call(variable, args[0]);
        return new ArrayAccess(variable, args);
      }
      ctx.matchBinOp("EQ");
      var expr = parseExpression(ctx);
      return new Let(variable, expr);

    case "PRINT":
      var exprs = [];
      var println = true;

      // Only try to parse an expression if there's anything else on this line.
      while (ctx.peek() && ctx.peek().lineNumber == token.lineNumber && ctx.peek().name != "COLON") {
        exprs.push(parseExpression(ctx));
        if (ctx.peek() && ctx.peek().lineNumber == token.lineNumber && ctx.peek().name == "SEMICOLON") {
          ctx.next();
          println = false;
        } else {
          println = true;
          break;
        }
      }
      return new Print(exprs, println);

    case "INPUT":
      var message = "";
      if (ctx.peek().name == "STRING")
        message = ctx.matchName("STRING").value;
      if (ctx.peek().name == "SEMICOLON")
        ctx.next();

      var variables = [parseVariable(ctx)];
      while (ctx.peek().name == "COMMA") {
        ctx.next();
        variables.push(parseVariable(ctx));
      }
      return new Input(variables, message);

    case "IF":
      var expr = parseExpression(ctx);
      ctx.matchName("THEN");
      if (ctx.peek().name == "INT") {
          var int = ctx.matchName("INT").value;
          return new If(expr, parseInt(int, 10));
      }
      var stmt = new Statement(
        token.lineNumber,
        ctx.lastStmtNumber,
        [parseCommand(ctx)]);
      return new IfStmt(expr, stmt);

    case "FOR":
      ctx.forStack++;
      // we need to store this in case the user has decided to
      // use NEXT with no argument
      var initVar  = ctx.peek();
      var initExpr = parseCommand(ctx);

      var trueTarget = token.lineNumber;
      ctx.matchName("TO");
      var toExpr = parseExpression(ctx);
      var stepExpr;
      if (ctx.peek().name == "STEP") {
        ctx.next();
        stepExpr = parseExpression(ctx);
      }
      // find the end of for's the code block
      var rewind = 0;
      while (ctx.forStack > 0) {
        if (ctx.peek().name == "FOR") ctx.forStack++;
        if (ctx.peek().name == "NEXT") ctx.forStack--;
        ctx.next();
        rewind++;
      }
      // if the user didn't enter a variable, we'll insert
      // one on their behalf, no harm no foul
      if (!ctx.peek() || ctx.peek().name != "VARIABLE")
        ctx.tokens.splice(ctx.index, 0, initVar);
      var nextVar = parseVariable(ctx);
      rewind++;
      // we'll want to backup the lexer
      ctx.index -= rewind;
      var falseTarget = nextVar.variable.lineNumber;
      return new For({
        initExpr,
        toExpr,
        stepExpr,
        trueTarget,
        falseTarget,
        nextVar
      });

    default:
      throw new Error("Error at line " +
                      token.lineNumber +
                      ": unexpected token " +
                      JSON.stringify(token));
  }
}

function parseLine(ctx) {
  var tok = ctx.matchName("STMTNO");
  var stmtNumber = parseInt(tok.value, 10);
  // useful for error reporting
  ctx.lastStmtNumber = stmtNumber;
  var commands = [];
  if (!ctx.peek() || ctx.peek().lineNumber != tok.lineNumber)
    throw new Error(`Error at line ${tok.lineNumber}: nothing on line`);
  if (ctx.peek().name != "REM") {
    for (;;) {
      var cmd = parseCommand(ctx);
      commands.push(cmd);
      var nextToken = ctx.peek();
      if (!nextToken || nextToken.lineNumber != tok.lineNumber ||
          (nextToken.name != "COLON" && nextToken.name != "COMMA"))
        break;
      if (ctx.peek().name != "COLON")
          ctx.matchName("COMMA");
      else if (ctx.peek().name != "COMMA")
          ctx.matchName("COLON");
    }
  }
  if (ctx.peek() && ctx.peek().name == "REM") {
    ctx.next();
  }
  if (ctx.peek() && ctx.peek().lineNumber == tok.lineNumber) {
    throw new Error("Error at line " +
                    token.lineNumber +
                    ", statement "   +
                    ctx.lastStmtNumber +
                    ": expected a "  +
                    name             +
                    " token, found " +
                    JSON.stringify(token));
  }
  return new Statement(tok.lineNumber, stmtNumber, commands);
}

function parseProgram(ctx, statements) {
  while (ctx.peek()) {
    statements.push(parseLine(ctx));
  }

  return new Program(statements);
}

function ParserContext(tokens) {
  this.tokens = tokens;
  this.forStack = 0; // nested for loop tracking
  this.index = 0;
  // so that we can tell the difference between array accesses
  // and function calls.
  this.arrayNames = [];
}

ParserContext.prototype.peek = function () {
  return this.tokens[this.index];
};

ParserContext.prototype.matchName = function (name) {
  var token = this.tokens[this.index];
  if (!token) {
    throw new Error("Unexpected EOF!");
  }

  this.index++;
  if (token.name !== name) {
    throw new Error("Error at line " +
                    token.lineNumber +
                    ", statement "   +
                    this.lastStmtNumber +
                    ": expected a "  +
                    name             +
                    " token, found " +
                    JSON.stringify(token));
  }

  return token;
};

ParserContext.prototype.matchBinOp = function (op) {
  var tok = this.matchName("BINOP");
  if (tok.value !== op) {
    throw new Error("Error at line " +
                    tok.line +
                    ": expected " +
                    op + ", found " +
                    JSON.stringify(tok));
  }

  return tok;
};

ParserContext.prototype.next = function () {
  var tok = this.tokens[this.index];
  this.index++;
  return tok;
};

function parse(tokens) {
  var ctx = new ParserContext(tokens);
  return parseProgram(ctx, []);
}
/* Given an AST, run it through a set of transforms. */

var transforms = [];

// compress to a gap-free list of statements, with goto's rewritten
// appropriately
var orderProgram = (program) => {
  program.statements.sort((a, b) => (a.stmtNumber - b.stmtNumber));

  var lineToIndex = {};
  program.statements.forEach((stmt, i) => {
    program.stmtNumberToIndex[stmt.stmtNumber] = i;
    program.indexToStmtNumber[i] = stmt.stmtNumber;
  });

  program.statements.forEach((stmt, i) => {
    for (var command of stmt.commands) {
      if (command.type == "Goto" || command.type == "GoSub") {
        command.targetIndex = program.stmtNumberToIndex[command.stmtNumber];
        if (command.targetIndex === undefined) {
          throw new Error("Invalid GOTO target");
        }
      } else if (command.type == "If") {
        command.targetIndex = program.stmtNumberToIndex[command.stmtNumber];
        if (command.targetIndex === undefined) {
          throw new Error("Invalid IF/THEN target");
        }
      }
    }
  });

  return program;
};
"use strict";

var builtinFunctions = {
  TAB: n => Array(Math.floor(n + 1)).join(" "),
  INT: n => Math.floor(n),
  ABS: n => Math.abs(n),
  LEN: n => n.length,
  SIN: n => Math.sin(n),
  _lastRandom: 0.001,
  _xorShiftRand: n => {
    n ^= n >> 12; // a
    n ^= n << 25; // b
    n ^= n >> 27; // c
    return (n%1000/1000);
  },
  RND: n => {
    /*from the Apple ][ BASIC manual:
      if x>0, random number between 0 and 1
      if x=0, repeats last random number
      if x<0, begins new repeatable sequence*/
    if (n >= 1)
       builtinFunctions._lastRandom = builtinFunctions._xorShiftRand(builtinFunctions._lastRandom * 1000);
    if (n < 0)
      builtinFunctions._lastRandom = builtinFunctions._xorShiftRand(builtinFunctions._lastRandom * 1000);
    return builtinFunctions._lastRandom;
  },
};
"use strict";

const OPS = {
  sourceline(ctx, lineNumber) {
    var pc = ctx.pause();
    ctx.debug(() => { ctx.resume(pc); },
              pc, ctx.variables, lineNumber);
  },

  // Immediates

  int16(ctx, val) {
    ctx.stack.push(val);
  },

  string(ctx, val) {
    ctx.stack.push(val);
  },

  // Variables

  loaddata(ctx) {
    var nargs = ctx.stack.pop();
    for (var i = 0; i < nargs; i++)
      ctx.stack.push(ctx.data[(ctx.data.length - 1) - ctx.dataIndex++]);
  },

  storedata(ctx) {
    var nargs = ctx.stack.pop();
    for (var i = 0; i < nargs; i++)
      ctx.data.push(ctx.stack.pop());
  },

  restoredata(ctx) {
    ctx.dataIndex = 0;
  },

  loadstr(ctx, addr) {
    ctx.stack.push(ctx.strings[addr]);
  },

  storestr(ctx, addr) {
    ctx.strings[addr] = ctx.stack.pop();
  },

  loadint(ctx, addr) {
    ctx.stack.push(ctx.ints[addr]);
  },

  storeint(ctx, addr) {
    ctx.ints[addr] = ctx.stack.pop();
  },

  loadreal(ctx, addr) {
    ctx.stack.push(ctx.reals[addr]);
  },

  storereal(ctx, addr) {
    ctx.reals[addr] = ctx.stack.pop();
  },

  loadarray(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var result = ctx.arrays[addr][ctx.stack.pop()];
    for (var i = 1; i < arrayDepth; i++)
        result = result[ctx.stack.pop()];
    ctx.stack.push(result);
  },

  storearray(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var reference = ctx.arrays[addr];
    for (var i = 0; i < arrayDepth - 1; i++)
        reference = reference[ctx.stack.pop()];
    reference[ctx.stack.pop()] = ctx.stack.pop();
  },

  createarraystr(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    // nest the arrays like russian dolls
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  createarrayint(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth - 1; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    // only the last array can be typed
    // (non numeric entries are converted to NaNs)
    arrays[arrayDepth - 1] = new Int16Array(ctx.stack.pop() + 1);
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  createarrayreal(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth - 1; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    arrays[arrayDepth - 1] = new Float64Array(ctx.stack.pop() + 1);
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  swap(ctx) {
    const { stack } = ctx;
    const [a, b] = stack.splice(-2);
    stack.push(b, a);
  },

  // Flow control

  jump(ctx) {
    ctx.pc = ctx.stack.pop();
  },

  jumpif(ctx) {
    const newPC = ctx.stack.pop();
    const pred = ctx.stack.pop();

    if (pred)
      ctx.pc = newPC;
  },

  stmtif(ctx) {
    const pred = ctx.stack.pop();
    const stmtCodes = ctx.stack.pop();
    if (!pred)
      ctx.pc += stmtCodes;
  },

  call(ctx) {
    ctx.callStack.push(ctx.pc);
    ctx.pc = ctx.stack.pop();
  },

  return(ctx) {
    ctx.pc = ctx.callStack.pop();
  },

  callbuiltin(ctx, name) {
    const arg = ctx.stack.pop();

    ctx.stack.push(builtinFunctions[name](arg));
  },

  for(ctx, addr) {
    const step = ctx.stack.pop();
    const target = ctx.stack.pop();
    const value = ctx.stack.pop();

    ctx.forStack.push({
      addr,
      step,
      target,
      pc: ctx.pc,
      oldValue: ctx.reals[addr],
    });

    ctx.reals[addr] = value;
  },

  next(ctx, addr) {
    var { forStack } = ctx;

    function pop() {
      var frame = forStack.pop();
      ctx.reals[frame.addr] = frame.oldValue;
    }

    var frame;
    do {
      if (frame)
        pop();

      frame = forStack[forStack.length - 1];
    } while (frame && frame.addr != addr);

    if (!frame)
      throw Error(`Invalid NEXT argument: ${ctx.program.reals.getName(addr)}: No matching FOR loop.`);

    if (ctx.reals[addr] == frame.target)
      pop();
    else {
      ctx.reals[addr] += frame.step;
      ctx.pc = frame.pc;
    }
  },

  end(ctx) {
    ctx.complete = true;
    ctx.repl.basicPrint('\n\nfin.');
  },

  // I/O

  print(ctx) {
    ctx.repl.basicPrint(ctx.stack.pop());
  },

  println(ctx) {
    ctx.repl.basicPrint('\n');
  },

  input(ctx, dataType) {
    var pc = ctx.pause();

    ctx.repl.basicInput(ctx.stack.pop(), dataType, vals => {
      for (var i = 0; i < vals.length; i++)
          ctx.stack.push(vals[i]);
      ctx.resume(pc);
    });
  },

  // Binary ops

  // TODO: Applesoft BASIC automatically converts ints to reals
  // sometimes. Should we truncate, or convert to double, on overflow?

  add(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a + b);
  },

  sub(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a - b);
  },

  mul(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a * b);
  },

  div(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a / b);
  },

  mod(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a % b);
  },

  pow(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(Math.pow(a, b));
  },

  and(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL && exprR);
  },

  or(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL || exprR);
  },

  lte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL <= exprR);
  },

  gte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL >= exprR);
  },

  lt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL < exprR);
  },

  gt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL > exprR);
  },

  noteq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL != exprR);
  },

  eq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL == exprR);
  },

  // Unary ops

  neg(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(-a);
  },

  pos(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(+a);
  },

  not(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(!a);
  },
};

"use strict"

function ByteCompiler(program, options = {}) {
  this.pc = null;
  this.program = program;

  this.reals = new Namespace();
  this.ints = new Namespace();
  this.strings = new Namespace();
  this.arrays = new Namespace();

  this.pcLine = [];
  this.pcStatement = [];
  this.text = [];
  this.statementAddr = Object.create(null);
  this.userFunctions = Object.create(null);

  this.instrument = options.instrument;

  this.linkOps = [];
  this.compile(program.statements);
  this.link();
}

ByteCompiler.prototype = {
  emit(opcode, argument) {
    this.pc = this.text.length;
    if (DEBUG) {
      this.pcLine[this.pc] = this.lineNumber;
      this.pcStatement[this.pc] = this.stmtNumber;
    }

    this.text.push({ opcode, argument });
  },

  linkOp() {
    this.linkOps.push(this.text[this.text.length - 1]);
  },

  link() {
    for (var op of this.linkOps)
      op.argument = this.statementAddr[op.argument];

    this.linkOps = null;
  },

  compile(statements) {
    for (var stmt of statements)
      this.compileStatement(stmt);

    this.emit("end");
  },

  compileStatement(stmt) {
    this.pc = this.text.length;
    this.lineNumber = stmt.lineNumber;
    this.stmtNumber = stmt.stmtNumber;
    this.statementAddr[stmt.stmtNumber] = this.pc;

    if (this.instrument)
      this.emit("sourceline", stmt.lineNumber);

    for (var cmd of stmt.commands) {
      switch (cmd.type) {
      case "Goto":
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("jump");
        break;

      case "GoSub":
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("call");
        break;

      case "Def":
        this.userFunctions[cmd.name] = cmd;
        break;

      case "Return":
        this.emit("return");
        break;

      case "End":
        this.emit("end");
        break;

      case "Let":
        this.compileExpr(cmd.expr);
        this.store(cmd.variable);
        break;

      case "ArrayAssign":
        this.compileExpr(cmd.exprR)
        var arrayDepth = cmd.args.length;
        for (var i = arrayDepth - 1; i >= 0; i--)
          this.compileExpr(cmd.args[i]);
        this.emit("int16", arrayDepth);
        this.emit("storearray", this.arrays.get(cmd.name));
        break;

      case "Print":
        for (var expr of cmd.exprs) {
          this.compileExpr(expr);
          this.emit("print");
        }
        if (cmd.println)
          this.emit("println");
        break;

      case "Input":
        // we may take in more than one input at a time
        this.emit("int16", cmd.variables.length);
        this.emit("string", cmd.message);
        this.emit("input", cmd.variables[0].dataType);
        for (var i = cmd.variables.length - 1; i >= 0; i--)
            this.store(cmd.variables[i]);
        break;

      case "If":
        this.compileExpr(cmd.expr);
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("jumpif");
        break;

      case "IfStmt":
        var textSizeOrig = this.text.length;
        var bytecodes = []
        // compile our statement then immediately move it
        // out of the program so that we can re-order it
        // this allows us to skip over the bytecodes
        // even though they come from the same line
        // as the predicate expression.
        this.compileStatement(cmd.stmt);
        while (this.text.length > textSizeOrig) {
          bytecodes.push(this.text[textSizeOrig]);
          this.text.splice(textSizeOrig, 1);
        }
        this.emit("int16", bytecodes.length);
        this.compileExpr(cmd.expr);
        this.emit("stmtif");
        // Add our statement back into the program
        this.text = this.text.concat(bytecodes);
        break;

      case "Data":
        for (var i in cmd.args)
          this.compileExpr(cmd.args[i]);
        this.emit("int16", cmd.args.length)
        this.emit("storedata");
        break;

      case "Read":
        this.emit("int16", cmd.args.length);
        this.emit("loaddata")
        var args = cmd.args.reverse();
        for (var a in args)
          this.store(args[a]);
        break;

      case "Restore":
        this.emit("restoredata");
        break;

      case "For":
        var init = cmd.initExpr;

        this.compileExpr(init.expr);
        this.compileExpr(cmd.toExpr);
        if (cmd.stepExpr)
          this.compileExpr(cmd.stepExpr);
        else
          this.emit("int16", 1);

        this.emit("for", this.reals.get(init.variable.name));
        break;

      case "Next":
        this.emit("next", this.reals.get(cmd.stepVar));
        break;

      case "Dim":
        var arrayDepth = cmd.args.length;
        for (var i = arrayDepth - 1; i >= 0; i--)
            this.compileExpr(cmd.args[i]);
        this.emit("int16", arrayDepth);
        this.store(cmd);
        break;

      default:
        throw new SyntaxError(`Invalid statement: ${cmd.type}`);
      }
    }
  },

  compileExpr(expr) {
    if (typeof expr == "string") {
      this.emit("string", expr);
      return;
    }
    if (typeof expr == "number") {
      this.emit("int16", expr);
      return;
    }

    switch (expr.type) {
    case "Variable":
      this.load(expr);
      break;

    case "ArrayAccess":
      var arrayDepth = expr.args.length;
      for (var i = arrayDepth - 1; i >= 0; i--)
        this.compileExpr(expr.args[i]);
      this.emit("int16", arrayDepth);
      this.load(expr);
      break;

    case "UnaryOp":
      this.compileExpr(expr.exprR);
      this.emit(expr.op.toLowerCase());
      break;

    case "BinOp":
      this.compileExpr(expr.exprL);
      this.compileExpr(expr.exprR);
      this.emit(expr.op.toLowerCase());
      break;

    case "Call":
      this.compileExpr(expr.arg);

      var fnname = expr.fn.value;
      if (fnname in builtinFunctions)
        this.emit("callbuiltin", fnname);
      else {
        // TODO: This should probably be dynamic.
        if (!(fnname in this.userFunctions)) {
          throw new SyntaxError("Undefined function: " + fnname);
        }

        var fn = this.userFunctions[fnname];

        this.load(fn.arg);
        this.emit("swap");

        this.store(fn.arg);

        if (this.instrument)
          this.emit("sourceline", fn.lineNumber);

        this.compileExpr(fn.body);

        this.emit("swap");
        this.store(fn.arg);
      }
      break;

    default:
      throw new InternalError(`Unexpected expr type: ${expr.type}`);
    }
  },

  load(variable) {
    if (variable.dataType == "string")
      this.emit("loadstr", this.strings.get(variable.name));
     else if (variable.dataType == "int")
      this.emit("loadint", this.ints.get(variable.name));
     else if (variable.dataType == "array")
      this.emit("loadarray", this.arrays.get(variable.name));
     else
      this.emit("loadreal", this.reals.get(variable.name));
  },

  store(variable) {
    if (variable.dataType == "string")
      this.emit("storestr", this.strings.get(variable.name));
    else if (variable.dataType == "int")
      this.emit("storeint", this.ints.get(variable.name));
    else if (variable.dataType == "real")
      this.emit("storereal", this.reals.get(variable.name));
    else if (variable.dataType == "arraystring")
      this.emit("createarraystr", this.arrays.get(variable.name));
    else if (variable.dataType == "arrayint")
      this.emit("createarrayint", this.arrays.get(variable.name));
    else if (variable.dataType == "arrayreal")
      this.emit("createarrayreal", this.arrays.get(variable.name));
  },
};
"use strict";

const DEFAULT_TIME_SLICE = 1024;
const DEBUG = false;

function Context(repl, program, options = {}) {
  this.pc = 0;

  this.repl = repl;
  this.text = program.text;
  this.program = program;

  this.strings = [];
  this.ints = new Int16Array(program.ints.size);
  this.reals = new Float64Array(program.reals.size);
  this.arrays = [];
  this.data = []; // a.k.a DATA
  this.dataIndex = 0;

  this.callStack = [];
  this.forStack = [];
  this.stack = [];

  if (options.debug) {
    this.variables = Object.create(null);

    var forward = (prop, target, idx) => {
      Object.defineProperty(variables, prop, {
        enumerable: true,
        get() { return target[idx] },
        set(val) { target[idx] = val; },
      });
    }

    for (var data of program.strings.values())
      forward(data.name + "$", this.strings, data.index);

    for (var data of program.ints.values())
      forward(data.name + "%", this.ints, data.index);

    for (var data of program.reals.values())
      forward(data.name, this.reals, data.index);

    for (var data of program.arrays.values())
      forward(data.name, this.arrays, data.index);
  }

  this.paused = false;
  this.complete = false;

  this.schedule = options.schedule || (step => step());
  this.debug = options.debug;

  this.completed = new Promise((resolve, reject) => {
    this._completed = { resolve, reject };
  });

  this.runSlowly = this.runSlowly.bind(this);
}

Context.prototype = {
  runSlowly() {
    if (this.run())
      this.schedule(this.runSlowly);
    else if (this.complete)
      this._completed.resolve();
  },

  run(steps = DEFAULT_TIME_SLICE) {
    while (steps-- > 0) {
      if (this.paused || this.complete)
        return false;

      // Increment the PC *before* executing the instruction, since some
      // ops will change it.
      const pc = this.pc++;
      const instr = this.text[pc];

      if (DEBUG)
        console.log('Line ' + this.program.pcLine[pc],
                    'Statement ' + this.program.pcStatement[pc],
                    `PC=0x${pc.toString(16)}`,
                    instr);
      OPS[instr.opcode](this, instr.argument);
    }

    return true;
  },

  // Pauses execution and returns the PC for the instruction which would
  // have been executed next had we not paused.
  pause() {
    this.paused = true;
    return this.pc;
  },

  resume(pc = null) {
    if (pc !== null)
      this.pc = pc;

    this.paused = false;
    this.schedule(this.runSlowly);
  },
};

function Namespace() {
  this.map = new Map();
}

Namespace.prototype = {
  get size() { return this.map.size; },

  get(varName) {
    var key = varName.slice(0, 2).toUpperCase();

    var data = this.map.get(key);
    if (data) {
      if (data.name != varName) {
        basicPrint(`You are attempting to use the variable '${varName}',\n` +
                   `which is an alias for the existing variable '${data.name}'.\n` +
                   `This will go very badly for you.\nYou have been warned.\n\n`);
      }
    } else {
      data = { index: this.size, name: varName };
      this.map.set(key, data);
    }

    return data.index;
  },

  getName(index) {
    for (var data of this.map.values()) {
      if (data.index == index)
        return data.name;
    }
  },
};

