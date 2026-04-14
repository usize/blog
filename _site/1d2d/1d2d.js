function RandomInt(seed) {
  seed ^= seed >> 12;
  seed ^= seed << 25;
  seed ^= seed >> 27;
  return seed;
}

function CellDrawer(canvas, blockSize) {
    let self = this;
    self.canvas = canvas;
    self.ctx = self.canvas.getContext("2d");
    self.blockSize = blockSize || 3;
    self.width = Math.floor(self.canvas.width / self.blockSize);
    self.height = Math.floor(self.canvas.height / self.blockSize);

    self.ctx.fillStyle = "black";
    self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);

    self.colorInterpolation = function(value) {
      if (value >= 0.9)
        return "#bb0000";
      if (value >= 0.8)
        return "#aa2288";
      if (value >= 0.7)
        return "#991199";
      if (value >= 0.6)
        return "#7700aa";
      if (value >= 0.5)
        return "#4400bb";
      if (value >= 0.4)
        return "#2200bb";
      if (value >= 0.3)
        return "#0000bb";
      if (value >= 0.2)
        return "#000088";
      if (value >= 0.1)
        return "#0000066";
      return "#000000";
    }

    self.draw = function(grid) {
      for (let i = 0; i < grid.length; i++) {
          let y = i * self.blockSize;
          for (let j = 0; j < (grid[0] || []).length; j++) {
              let x = j * self.blockSize;
              let value = (grid[i] || [])[j] || 0;
              self.ctx.fillStyle = value >= 1 ? "#ffffff" : self.colorInterpolation(value);
              self.ctx.fillRect(x, y, self.blockSize, self.blockSize);
          }
      }
    }
}

function Rule30(seed, width, height) {
  let self = this;

  self.history = [];
  self.seed = seed;
  self.width = width;
  self.height = height;

  for (let i = 0; i < self.height - 1; i++) {
    self.history.push(Array(self.width).fill(0));
  }
  let initialCells = [];
  for (let j = 0; j < self.width; j++) {
    self.seed = RandomInt(self.seed);
    initialCells.push(self.seed % 2)
  }
  self.history.push(initialCells);

  self.tick = function() {
    let cells = self.history[self.history.length - 1];
    let newCells = [];
    for (let i = 0; i < cells.length; i++) {
      let left = i <= 0 ? cells[cells.length - 1] : cells[i - 1];
      let middle = cells[i];
      let right = i >= cells.length - 1 ? cells[0] : cells[i + 1];
      let value = (left >= 1 || 0) ^ ((middle >= 1 || 0) || (right >= 1 || 0));
      newCells.push(value >= 1 ? value : cells[i] - 0.1);
    }
    self.history.push(newCells);
    self.history = self.history.slice(self.history.length - height);
  }

  self.read = function() {
    return self.history;
  }

  self.readOldest = function() {
    return self.history[0];
  }
}

function ConwaysGameOfLife(width, height) {
  let self = this;
  self.grid = [];
  self.width = width;
  self.height = height;

  for (let i = 0; i < self.height; i++) {
    self.grid.push(Array(self.width).fill(0));
  }

  self.tick = function() {
    let newGrid = [];
    for (let i = 0; i < self.grid.length; i++) {
      newGrid.push([]);
      for (let j = 0; j < self.grid[0].length; j++) {
        let liveNeighbors = 0;

        let i_minus_1 = i <= 0 ? self.height - 1 : i - 1;
        let i_plus_1 = i >= self.height - 1 ? 0 : i + 1;
        let j_minus_1 = j <= 0 ? self.width - 1 : j - 1;
        let j_plus_1 = j >= self.width - 1 ? 0 : j + 1;

        liveNeighbors = liveNeighbors + (self.grid[i][j_minus_1] >= 1 || 0);
        liveNeighbors = liveNeighbors + (self.grid[i][j_plus_1] >= 1 || 0);

        liveNeighbors = liveNeighbors + (((self.grid[i + 1] || [])[j_plus_1] || 0) >= 1 || 0);
        liveNeighbors = liveNeighbors + (((self.grid[i + 1] || [])[j_minus_1] || 0) >= 1 || 0);

        liveNeighbors = liveNeighbors + (((self.grid[i - 1] || [])[j_plus_1] || 0) >= 1 || 0);
        liveNeighbors = liveNeighbors + (((self.grid[i - 1] || [])[j_minus_1] || 0) >= 1 || 0);

        liveNeighbors = liveNeighbors + (((self.grid[i - 1] || [])[j] || 0) >= 1 || 0);
        liveNeighbors = liveNeighbors + (((self.grid[i + 1] || [])[j] || 0) >= 1 || 0);


        let oldValue = self.grid[i][j];
        if (liveNeighbors == 2) {
          newGrid[i].push(oldValue);
        } else if (liveNeighbors == 3) {
          newGrid[i].push(1);
        } else if (liveNeighbors < 2) {
          newGrid[i].push(oldValue > 0 ? oldValue - 0.01 : 0);
        } else {
          newGrid[i].push(0.9);
        }
      }
    }
    self.grid = newGrid.slice(newGrid.length - self.height);
  }

  self.insertRow = function(row) {
    self.grid[self.grid.length - 1] = row;
  }

  self.read = function() {
    return self.grid;
  }
}
