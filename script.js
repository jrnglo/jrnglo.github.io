(() => {
  const button = document.querySelector('.profile-panel-banner');
  if (!button) return;

  const svg = button.querySelector('svg');
  const wallsPath = svg.querySelector('.profile-maze-walls');
  const trailsLayer = svg.querySelector('.profile-maze-trails');
  const exitsLayer = svg.querySelector('.profile-maze-exits');
  const dotsLayer = svg.querySelector('.profile-maze-dots');
  const profileImage = document.querySelector('.profile-panel-image');
  const columns = 20;
  const rows = 12;
  const cellWidth = 600 / columns;
  const cellHeight = 240 / rows;
  const fadeDuration = 1800;
  const trailDuration = 500;
  const moveDuration = 200;
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const activeWalkers = new Set();
  let focusedWalker = null;
  let spawnTimer;
  let spawnScheduled = false;

  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomIndex(length, random = Math.random) {
    return Math.floor(random() * length);
  }

  function shuffle(items, random = Math.random) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = randomIndex(index + 1, random);
      [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
  }

  function center(cell) {
    return {
      x: (cell.x + 0.5) * cellWidth,
      y: (cell.y + 0.5) * cellHeight
    };
  }

  function profileImageEllipse() {
    if (!profileImage) return null;
    const transform = svg.getScreenCTM();
    if (!transform) return null;

    const bounds = profileImage.getBoundingClientRect();
    const inverse = transform.inverse();
    function toSvg(x, y) {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      return point.matrixTransform(inverse);
    }

    const middle = toSvg(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    const right = toSvg(bounds.right, bounds.top + bounds.height / 2);
    const bottom = toSvg(bounds.left + bounds.width / 2, bounds.bottom);
    const dotRadius = 6;
    return {
      x: middle.x,
      y: middle.y,
      radiusX: Math.abs(right.x - middle.x) + dotRadius,
      radiusY: Math.abs(bottom.y - middle.y) + dotRadius
    };
  }

  function isInsideProfileImage(point, ellipse = profileImageEllipse()) {
    if (!ellipse) return false;
    const x = (point.x - ellipse.x) / ellipse.radiusX;
    const y = (point.y - ellipse.y) / ellipse.radiusY;
    return x * x + y * y <= 1;
  }

  function profileImageContact(start, end) {
    const ellipse = profileImageEllipse();
    if (!ellipse) return null;

    const startX = (start.x - ellipse.x) / ellipse.radiusX;
    const startY = (start.y - ellipse.y) / ellipse.radiusY;
    const deltaX = (end.x - start.x) / ellipse.radiusX;
    const deltaY = (end.y - start.y) / ellipse.radiusY;
    const a = deltaX * deltaX + deltaY * deltaY;
    const b = 2 * (startX * deltaX + startY * deltaY);
    const c = startX * startX + startY * startY - 1;
    const discriminant = b * b - 4 * a * c;

    if (c <= 0 || a === 0 || discriminant < 0) return null;
    const progress = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (progress < 0 || progress > 1) return null;

    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress
    };
  }

  function straightPathLength(cells, current, directionIndex) {
    const direction = directions[directionIndex];
    const oppositeIndex = (directionIndex + 2) % directions.length;
    const opposite = directions[oppositeIndex];
    let length = 1;
    let cell = current;

    while (!cell.walls[oppositeIndex]) {
      const previous = cells[cell.y + opposite.y]?.[cell.x + opposite.x];
      if (!previous) break;
      cell = previous;
      length += 1;
    }

    cell = cells[current.y + direction.y]?.[current.x + direction.x];
    if (!cell) return Infinity;
    length += 1;
    while (!cell.walls[directionIndex]) {
      const next = cells[cell.y + direction.y]?.[cell.x + direction.x];
      if (!next) break;
      cell = next;
      length += 1;
    }

    return length;
  }

  function straightPathLength(cells, current, directionIndex) {
    const direction = directions[directionIndex];
    const oppositeIndex = (directionIndex + 2) % directions.length;
    const opposite = directions[oppositeIndex];
    let length = 1;
    let cell = current;

    while (!cell.walls[oppositeIndex]) {
      const previous = cells[cell.y + opposite.y]?.[cell.x + opposite.x];
      if (!previous) break;
      cell = previous;
      length += 1;
    }

    cell = cells[current.y + direction.y]?.[current.x + direction.x];
    if (!cell) return Infinity;
    length += 1;
    while (!cell.walls[directionIndex]) {
      const next = cells[cell.y + direction.y]?.[cell.x + direction.x];
      if (!next) break;
      cell = next;
      length += 1;
    }

    return length;
  }

  function createMaze() {
    const mazeRandom = createRandom(0x4d415a45);
    const exits = [
      { side: 'top', sideIndex: 0 },
      { side: 'right', sideIndex: 1 },
      { side: 'bottom', sideIndex: 2 },
      { side: 'left', sideIndex: 3 }
    ];
    let cells;
    let perimeter;
    let start;
    let startSide;

    while (true) {
      cells = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: columns }, (_, x) => ({
          x,
          y,
          walls: [true, true, true, true],
          visited: false
        }))
      );
      exits[0].cell = cells[0][Math.floor(columns / 2)];
      exits[1].cell = cells[Math.floor(rows / 2)][columns - 1];
      exits[2].cell = cells[rows - 1][Math.floor(columns / 2)];
      exits[3].cell = cells[Math.floor(rows / 2)][0];
      const exitCells = new Set(exits.map(exit => exit.cell));
      const boundaryCells = {
        top: cells[0],
        right: cells.map(row => row[columns - 1]),
        bottom: cells[rows - 1],
        left: cells.map(row => row[0])
      };
      perimeter = [...new Set(Object.values(boundaryCells).flat())]
        .filter(cell => !isInsideProfileImage(center(cell)) && !exitCells.has(cell));
      start = cells[0][0];
      startSide = 3;
      const stack = [start];
      start.visited = true;

      while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = shuffle(directions.map((direction, index) => ({
          index,
          cell: cells[current.y + direction.y]?.[current.x + direction.x]
        })).filter(neighbor =>
          neighbor.cell &&
          !neighbor.cell.visited &&
          straightPathLength(cells, current, neighbor.index) <= 3
        ), mazeRandom);

        if (neighbors.length === 0) {
          stack.pop();
          continue;
        }

        const next = neighbors[0];
        current.walls[next.index] = false;
        next.cell.walls[(next.index + 2) % directions.length] = false;
        next.cell.visited = true;
        stack.push(next.cell);
      }

      if (cells.every(row => row.every(cell => cell.visited))) break;
    }

    const openPassage = (cell, directionIndex) => {
      const direction = directions[directionIndex];
      const neighbor = cells[cell.y + direction.y]?.[cell.x + direction.x];
      if (!neighbor || !cell.walls[directionIndex]) return false;
      cell.walls[directionIndex] = false;
      neighbor.walls[(directionIndex + 2) % directions.length] = false;
      return true;
    };
    const shortcuts = shuffle(cells.flatMap(row => row.flatMap(cell =>
      [1, 2]
        .filter(directionIndex =>
          cell.walls[directionIndex] &&
          cells[cell.y + directions[directionIndex].y]?.[cell.x + directions[directionIndex].x]
        )
        .map(directionIndex => ({ cell, directionIndex }))
    )), mazeRandom);
    let shortcutCount = 0;
    for (const { cell, directionIndex } of shortcuts) {
      if (straightPathLength(cells, cell, directionIndex) > 3) continue;
      openPassage(cell, directionIndex);
      shortcutCount += 1;
      if (shortcutCount === 24) break;
    }

    start.walls[startSide] = false;
    for (const exit of exits) {
      exit.cell.walls[exit.sideIndex] = false;
      const point = center(exit.cell);
      exit.point = {
        x: exit.side === 'left' ? 1.5 : exit.side === 'right' ? 598.5 : point.x,
        y: exit.side === 'top' ? 1.5 : exit.side === 'bottom' ? 238.5 : point.y
      };
    }

    const wallInset = 3;

    const wallSegments = [];
    for (const row of cells) {
      for (const cell of row) {
        const x = cell.x * cellWidth;
        const y = cell.y * cellHeight;

        if (cell.y === 0 && cell.walls[0]) {
          wallSegments.push(`M${x + wallInset} ${y}h${cellWidth - wallInset * 2}`);
        }
        if (cell.walls[1]) {
          wallSegments.push(`M${x + cellWidth} ${y + wallInset}v${cellHeight - wallInset * 2}`);
        }
        if (cell.walls[2]) {
          wallSegments.push(`M${x + wallInset} ${y + cellHeight}h${cellWidth - wallInset * 2}`);
        }
        if (cell.x === 0 && cell.walls[3]) {
          wallSegments.push(`M${x} ${y + wallInset}v${cellHeight - wallInset * 2}`);
        }
      }
    }

    wallsPath.setAttribute('d', wallSegments.join(''));
    for (const { point } of exits) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', 'profile-maze-exit');
      marker.setAttribute('r', '2.1');
      marker.setAttribute('cx', point.x);
      marker.setAttribute('cy', point.y);
      exitsLayer.append(marker);
    }

    return { cells, exits, perimeter };
  }

  function findExit(cells, start, goal) {
    const cellCount = rows * columns;
    const directionCount = directions.length + 1;
    const startState = (start.y * columns + start.x) * directionCount + directions.length;
    const distances = new Float64Array(cellCount * directionCount).fill(Infinity);
    const previousStates = new Int32Array(cellCount * directionCount).fill(-1);
    const visited = new Uint8Array(cellCount * directionCount);
    const frontier = [startState];
    distances[startState] = 0;

    while (frontier.length > 0) {
      let bestIndex = 0;
      for (let index = 1; index < frontier.length; index += 1) {
        if (distances[frontier[index]] < distances[frontier[bestIndex]]) bestIndex = index;
      }
      const state = frontier.splice(bestIndex, 1)[0];
      if (visited[state]) continue;
      visited[state] = 1;

      const cellIndex = Math.floor(state / directionCount);
      const directionBefore = state % directionCount;
      const current = cells[Math.floor(cellIndex / columns)][cellIndex % columns];
      if (current === goal) {
        const path = [];
        for (let pathState = state; pathState !== startState; pathState = previousStates[pathState]) {
          const pathCellIndex = Math.floor(pathState / directionCount);
          path.push(cells[Math.floor(pathCellIndex / columns)][pathCellIndex % columns]);
        }
        return path.reverse();
      }

      for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
        if (current.walls[directionIndex]) continue;
        const direction = directions[directionIndex];
        const neighbor = cells[current.y + direction.y]?.[current.x + direction.x];
        if (!neighbor) continue;
        const neighborIndex = neighbor.y * columns + neighbor.x;
        const nextState = neighborIndex * directionCount + directionIndex;
        const turnCost = directionBefore === directions.length || directionBefore === directionIndex ? 0 : 2;
        const nextDistance = distances[state] + 1 + turnCost;
        if (nextDistance >= distances[nextState]) continue;
        distances[nextState] = nextDistance;
        previousStates[nextState] = state;
        frontier.push(nextState);
      }
    }

    throw new Error('Maze generator created an unsolvable layout.');
  }

  const maze = createMaze();

  function exitRouteScore(start, exit) {
    const route = [start, ...findExit(maze.cells, start, exit.cell)];
    let turns = 0;
    for (let index = 1; index < route.length - 1; index += 1) {
      const previous = route[index - 1];
      const current = route[index];
      const next = route[index + 1];
      if (
        current.x - previous.x !== next.x - current.x ||
        current.y - previous.y !== next.y - current.y
      ) {
        turns += 1;
      }
    }
    return route.length - 1 + turns * 2;
  }

  function findNearestExit(start) {
    return maze.exits
      .map(exit => ({ exit, score: exitRouteScore(start, exit) }))
      .sort((first, second) => first.score - second.score)[0].exit;
  }

  function nextExit(start) {
    const candidates = maze.exits
      .filter(exit => exit.cell !== start)
      .map(exit => ({ exit, score: exitRouteScore(start, exit) }));
    const bestScore = Math.min(...candidates.map(candidate => candidate.score));
    const shortRoutes = candidates.filter(candidate => candidate.score <= bestScore + 6);
    return shortRoutes[randomIndex(shortRoutes.length)].exit;
  }

  function randomSpawn() {
    const candidates = maze.perimeter;
    return candidates[randomIndex(candidates.length)];
  }

  function createTrailSegment(start) {
    const segment = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    segment.setAttribute('class', 'profile-maze-trail');
    segment.setAttribute('x1', start.x);
    segment.setAttribute('y1', start.y);
    segment.setAttribute('x2', start.x);
    segment.setAttribute('y2', start.y);
    trailsLayer.append(segment);
    return segment;
  }

  function fadeTrailSegment(segment) {
    if (!segment) return;
    window.requestAnimationFrame(() => segment.classList.add('is-fading'));
    window.setTimeout(() => segment.remove(), trailDuration);
  }

  function removeWalker(walker) {
    window.cancelAnimationFrame(walker.frame);
    window.clearTimeout(walker.cleanupTimer);
    activeWalkers.delete(walker);
    walker.dot.remove();
    if (focusedWalker === walker) focusedWalker = activeWalkers.values().next().value || null;
  }

  function scheduleNextWalker() {
    if (reducedMotion.matches || spawnScheduled) return;
    spawnScheduled = true;
    spawnTimer = window.setTimeout(() => {
      spawnScheduled = false;
      const start = randomSpawn();
      createWalker(start, center(start), nextExit(start));
    }, 250);
  }

  function finishWalker(walker) {
    activeWalkers.delete(walker);
    walker.dot.classList.add('is-fading');
    if (focusedWalker === walker) focusedWalker = activeWalkers.values().next().value || null;
    walker.cleanupTimer = window.setTimeout(() => removeWalker(walker), fadeDuration);
    scheduleNextWalker();
  }

  function createWalker(start, point = center(start), exit = nextExit(start)) {
    const ellipse = profileImageEllipse();
    if (isInsideProfileImage(point, ellipse) || isInsideProfileImage(center(start), ellipse)) {
      const safeCells = maze.cells.flat().filter(cell => !isInsideProfileImage(center(cell), ellipse));
      safeCells.sort((first, second) => {
        const firstPoint = center(first);
        const secondPoint = center(second);
        const firstDistance = (firstPoint.x - point.x) ** 2 + (firstPoint.y - point.y) ** 2;
        const secondDistance = (secondPoint.x - point.x) ** 2 + (secondPoint.y - point.y) ** 2;
        return firstDistance - secondDistance;
      });
      if (safeCells.length === 0) throw new Error('The profile image covers every maze cell.');
      start = safeCells[0];
      point = center(start);
    }

    const startPoint = center(start);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'profile-maze-dot');
    dot.setAttribute('r', '2.7');
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    dotsLayer.append(dot);

    const walker = {
      cell: start,
      exit,
      exitPoint: exit.point,
      dot,
      moves: [start, ...findExit(maze.cells, start, exit.cell)],
      moveIndex: point.x === startPoint.x && point.y === startPoint.y ? 1 : 0,
      frame: 0,
      segmentStart: point,
      segmentStartedAt: null,
      segment: null,
      segmentTarget: null,
      bouncePhase: null,
      bounceOrigin: null,
      walkDirection: 1,
      cleanupTimer: 0
    };
    activeWalkers.add(walker);
    focusedWalker = walker;

    if (reducedMotion.matches) {
      const destination = exit.point;
      dot.setAttribute('cx', destination.x);
      dot.setAttribute('cy', destination.y);
      button.dataset.state = 'route-shown';
      finishWalker(walker);
      return walker;
    }

    button.dataset.state = 'searching';
    function advance(timestamp) {
      if (!activeWalkers.has(walker)) return;
      if (
        (walker.walkDirection === 1 && walker.moveIndex > walker.moves.length) ||
        (walker.walkDirection === -1 && walker.moveIndex < 0)
      ) {
        finishWalker(walker);
        return;
      }

      const nextPoint = walker.segmentTarget || (
        walker.bouncePhase === 'returning'
          ? walker.bounceOrigin
          : walker.moveIndex < walker.moves.length
            ? center(walker.moves[walker.moveIndex])
            : walker.exitPoint
      );
      if (walker.segmentStartedAt === null) {
        walker.segmentStartedAt = timestamp;
        walker.segmentTarget = nextPoint;
        if (walker.walkDirection === 1 && walker.bouncePhase === null) {
          const contact = profileImageContact(walker.segmentStart, nextPoint);
          if (contact) {
            walker.segmentTarget = contact;
            walker.bounceOrigin = walker.segmentStart;
            walker.bouncePhase = 'approaching';
          }
        }
        walker.segment = createTrailSegment(walker.segmentStart);
      }
      const destination = walker.segmentTarget;
      const progress = Math.min((timestamp - walker.segmentStartedAt) / moveDuration, 1);
      const point = {
        x: walker.segmentStart.x + (destination.x - walker.segmentStart.x) * progress,
        y: walker.segmentStart.y + (destination.y - walker.segmentStart.y) * progress
      };
      walker.segment.setAttribute('x2', point.x);
      walker.segment.setAttribute('y2', point.y);
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);

      if (progress === 1) {
        fadeTrailSegment(walker.segment);
        walker.segment = null;
        walker.segmentTarget = null;
        walker.segmentStartedAt = null;

        if (walker.bouncePhase === 'approaching') {
          walker.segmentStart = point;
          walker.bouncePhase = 'returning';
        } else if (walker.bouncePhase === 'returning') {
          walker.cell = walker.moves[Math.max(0, walker.moveIndex - 1)];
          walker.segmentStart = walker.bounceOrigin;
          walker.bounceOrigin = null;
          walker.bouncePhase = null;
          walker.walkDirection = -1;
          if (walker.moveIndex === 0) {
            walker.moveIndex = -1;
            finishWalker(walker);
            return;
          }
          walker.moveIndex -= 2;
        } else if (walker.moveIndex === walker.moves.length) {
          walker.segmentStart = destination;
          finishWalker(walker);
          return;
        } else {
          walker.cell = walker.moves[walker.moveIndex];
          walker.segmentStart = destination;
          walker.moveIndex += walker.walkDirection;
        }

        walker.frame = window.requestAnimationFrame(advance);
        return;
      }

      walker.frame = window.requestAnimationFrame(advance);
    }

    walker.frame = window.requestAnimationFrame(advance);
    return walker;
  }

  function fadeWalker(walker) {
    if (!walker || !activeWalkers.has(walker)) return;
    activeWalkers.delete(walker);
    window.cancelAnimationFrame(walker.frame);
    fadeTrailSegment(walker.segment);
    walker.segment = null;
    walker.dot.classList.add('is-fading');
    walker.cleanupTimer = window.setTimeout(() => removeWalker(walker), fadeDuration);
  }

  function cellAtPointer(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const location = point.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.max(0, Math.min(columns - 1, Math.floor(location.x / cellWidth)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor(location.y / cellHeight)));
    return { cell: maze.cells[y][x], point: location };
  }

  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const target = cellAtPointer(event);
    window.clearTimeout(spawnTimer);
    spawnScheduled = false;
    for (const walker of activeWalkers) fadeWalker(walker);
    createWalker(target.cell, target.point, findNearestExit(target.cell));
  });

  button.addEventListener('click', event => {
    if (event.detail === 0 && focusedWalker) {
      const walker = createWalker(focusedWalker.cell, center(focusedWalker.cell), findNearestExit(focusedWalker.cell));
      focusedWalker = walker;
    }
  });

  button.addEventListener('keydown', event => {
    const directionIndex = {
      ArrowUp: 0,
      ArrowRight: 1,
      ArrowDown: 2,
      ArrowLeft: 3
    }[event.key];
    if (directionIndex === undefined) return;

    event.preventDefault();
    const walker = focusedWalker;
    if (!walker || !activeWalkers.has(walker)) return;

    const direction = directions[directionIndex];
    if (walker.cell.walls[directionIndex]) return;
    const nextCell = maze.cells[walker.cell.y + direction.y][walker.cell.x + direction.x];
    fadeWalker(walker);
    focusedWalker = createWalker(nextCell, center(nextCell), findNearestExit(nextCell));
  });

  const initialStart = randomSpawn();
  createWalker(initialStart, center(initialStart), nextExit(initialStart));
})();