/**
 * ZenShikaku: Tatami Room Logic Engine
 * Pure logic engine for Shikaku (四角に切れ / Divide by Rectangles)
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.ShikakuEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Create a new game state from a level definition.
   */
  function createGameState(level) {
    return {
      levelId: level.id,
      width: level.width,
      height: level.height,
      clues: level.clues.map(c => ({ r: c.r, c: c.c, val: c.val })),
      rooms: [], // array of { id, r1, c1, r2, c2, colorIndex }
      history: [],
      nextRoomId: 1
    };
  }

  /**
   * Find clue at coordinates (r, c).
   */
  function getClueAt(level, r, c) {
    return level.clues.find(clue => clue.r === r && clue.c === c) || null;
  }

  /**
   * Normalize rectangle bounds so r1 <= r2 and c1 <= c2, clamped to board.
   */
  function normalizeRect(width, height, r1, c1, r2, c2) {
    const minR = Math.max(0, Math.min(r1, r2));
    const maxR = Math.min(height - 1, Math.max(r1, r2));
    const minC = Math.max(0, Math.min(c1, c2));
    const maxC = Math.min(width - 1, Math.max(c1, c2));
    return {
      r1: minR,
      c1: minC,
      r2: maxR,
      c2: maxC,
      width: maxC - minC + 1,
      height: maxR - minR + 1,
      area: (maxR - minR + 1) * (maxC - minC + 1)
    };
  }

  /**
   * Check if two rectangles overlap.
   */
  function rectsOverlap(a, b) {
    return !(a.r2 < b.r1 || a.r1 > b.r2 || a.c2 < b.c1 || a.c1 > b.c2);
  }

  /**
   * Find room covering coordinate (r, c).
   */
  function getRoomAt(rooms, r, c) {
    return rooms.find(room => r >= room.r1 && r <= room.r2 && c >= room.c1 && c <= room.c2) || null;
  }

  /**
   * Get all clues enclosed by a room.
   */
  function getRoomClues(level, room) {
    return level.clues.filter(
      clue => clue.r >= room.r1 && clue.r <= room.r2 && clue.c >= room.c1 && clue.c <= room.c2
    );
  }

  /**
   * Evaluate the validity of a room.
   */
  function getRoomStatus(level, room) {
    const area = (room.r2 - room.r1 + 1) * (room.c2 - room.c1 + 1);
    const clues = getRoomClues(level, room);

    if (clues.length === 0) {
      return {
        valid: false,
        reason: 'NO_CLUE',
        message: 'No number enclosed in this room.',
        area,
        targetArea: null,
        clues
      };
    }

    if (clues.length > 1) {
      return {
        valid: false,
        reason: 'MULTIPLE_CLUES',
        message: `Multiple numbers (${clues.map(c => c.val).join(', ')}) enclosed in one room.`,
        area,
        targetArea: null,
        clues
      };
    }

    const clue = clues[0];
    if (area !== clue.val) {
      return {
        valid: false,
        reason: 'WRONG_AREA',
        message: `Room area is ${area}, but number requires ${clue.val}.`,
        area,
        targetArea: clue.val,
        clue,
        clues
      };
    }

    return {
      valid: true,
      reason: 'VALID',
      message: 'Room perfectly matches its number!',
      area,
      targetArea: clue.val,
      clue,
      clues
    };
  }

  /**
   * Add a new room, removing any conflicting/overlapping rooms.
   */
  function addRoom(state, level, r1, c1, r2, c2) {
    const norm = normalizeRect(level.width, level.height, r1, c1, r2, c2);

    // Save previous rooms for undo
    state.history.push(JSON.parse(JSON.stringify(state.rooms)));

    // Remove any rooms that overlap with the new room
    const remainingRooms = state.rooms.filter(room => !rectsOverlap(room, norm));

    // Choose color index not used by adjacent rooms if possible
    const usedColors = new Set(remainingRooms.map(r => r.colorIndex));
    let colorIndex = 0;
    while (usedColors.has(colorIndex) && colorIndex < 12) {
      colorIndex++;
    }

    const newRoom = {
      id: state.nextRoomId++,
      r1: norm.r1,
      c1: norm.c1,
      r2: norm.r2,
      c2: norm.c2,
      colorIndex: colorIndex % 12
    };

    state.rooms = [...remainingRooms, newRoom];
    return newRoom;
  }

  /**
   * Remove room at coordinate (r, c).
   */
  function removeRoomAt(state, r, c) {
    const targetRoom = getRoomAt(state.rooms, r, c);
    if (!targetRoom) return false;

    state.history.push(JSON.parse(JSON.stringify(state.rooms)));
    state.rooms = state.rooms.filter(room => room.id !== targetRoom.id);
    return true;
  }

  /**
   * Undo last move.
   */
  function undo(state) {
    if (!state.history || state.history.length === 0) return false;
    state.rooms = state.history.pop();
    return true;
  }

  /**
   * Reset all rooms.
   */
  function resetRooms(state) {
    if (state.rooms.length === 0) return false;
    state.history.push(JSON.parse(JSON.stringify(state.rooms)));
    state.rooms = [];
    return true;
  }

  /**
   * Evaluate full board state: coverage, validity, and win status.
   */
  function checkBoardState(level, rooms) {
    const totalCells = level.width * level.height;
    const grid = Array.from({ length: level.height }, () => Array(level.width).fill(null));
    let overlaps = 0;
    let validRooms = 0;
    const roomEvaluations = [];

    rooms.forEach(room => {
      const status = getRoomStatus(level, room);
      roomEvaluations.push({ room, status });
      if (status.valid) validRooms++;

      for (let r = room.r1; r <= room.r2; r++) {
        for (let c = room.c1; c <= room.c2; c++) {
          if (grid[r][c] !== null) {
            overlaps++;
          } else {
            grid[r][c] = room.id;
          }
        }
      }
    });

    let coveredCells = 0;
    for (let r = 0; r < level.height; r++) {
      for (let c = 0; c < level.width; c++) {
        if (grid[r][c] !== null) coveredCells++;
      }
    }

    const allCellsCovered = coveredCells === totalCells;
    const noOverlaps = overlaps === 0;
    const allRoomsValid = validRooms === rooms.length && rooms.length === level.clues.length;
    const isSolved = allCellsCovered && noOverlaps && allRoomsValid;

    return {
      isSolved,
      coveredCells,
      totalCells,
      coveragePercent: Math.round((coveredCells / totalCells) * 100),
      overlaps,
      validRooms,
      totalRooms: rooms.length,
      roomEvaluations
    };
  }

  /**
   * Find all factors (w, h) of an integer n.
   */
  function getFactors(n) {
    const factors = [];
    for (let w = 1; w <= n; w++) {
      if (n % w === 0) {
        factors.push({ w, h: n / w });
      }
    }
    return factors;
  }

  /**
   * Find all valid rectangle placements for a specific clue in a level.
   * A placement is valid if it lies within the grid and contains NO other clues.
   */
  function getPossiblePlacementsForClue(level, clue) {
    const placements = [];
    const factors = getFactors(clue.val);

    factors.forEach(({ w, h }) => {
      if (w > level.width || h > level.height) return;

      // Find all top-left corners (r1, c1) such that the rectangle covers (clue.r, clue.c)
      const minR1 = Math.max(0, clue.r - h + 1);
      const maxR1 = Math.min(level.height - h, clue.r);
      const minC1 = Math.max(0, clue.c - w + 1);
      const maxC1 = Math.min(level.width - w, clue.c);

      for (let r1 = minR1; r1 <= maxR1; r1++) {
        const r2 = r1 + h - 1;
        for (let c1 = minC1; c1 <= maxC1; c1++) {
          const c2 = c1 + w - 1;

          // Check if any other clue is inside this rectangle
          const hasOtherClue = level.clues.some(
            other => other !== clue && other.r >= r1 && other.r <= r2 && other.c >= c1 && other.c <= c2
          );

          if (!hasOtherClue) {
            placements.push({ r1, c1, r2, c2, width: w, height: h, clue });
          }
        }
      }
    });

    return placements;
  }

  /**
   * Smart deductive hint engine.
   * Returns a step-by-step hint object { type, text, highlight: { r1, c1, r2, c2 }, clue }
   */
  function getDeductiveHint(level, rooms) {
    // 1. Check existing rooms for critical errors
    for (const room of rooms) {
      const status = getRoomStatus(level, room);
      if (!status.valid) {
        if (status.reason === 'MULTIPLE_CLUES') {
          return {
            type: 'error',
            title: 'Divided Attention',
            text: `A room contains multiple numbers. Each room must enclose exactly one number clue.`,
            highlight: { r1: room.r1, c1: room.c1, r2: room.r2, c2: room.c2 },
            clue: status.clues[0]
          };
        }
        if (status.reason === 'NO_CLUE') {
          return {
            type: 'error',
            title: 'Empty Room',
            text: `This room does not enclose any number clue. Tap it to clear or resize it.`,
            highlight: { r1: room.r1, c1: room.c1, r2: room.r2, c2: room.c2 }
          };
        }
        if (status.reason === 'WRONG_AREA') {
          return {
            type: 'error',
            title: 'Mismatched Size',
            text: `Room has area ${status.area}, but the clue requires ${status.targetArea}.`,
            highlight: { r1: room.r1, c1: room.c1, r2: room.r2, c2: room.c2 },
            clue: status.clue
          };
        }
      }
    }

    // 2. Look for 1x1 clues that aren't yet placed
    for (const clue of level.clues) {
      if (clue.val === 1) {
        const room = getRoomAt(rooms, clue.r, clue.c);
        if (!room || room.r1 !== clue.r || room.r2 !== clue.r || room.c1 !== clue.c || room.c2 !== clue.c) {
          return {
            type: 'deduction',
            title: 'Single Cell Room',
            text: `The number 1 at row ${clue.r + 1}, col ${clue.c + 1} must always be a 1×1 room occupying just its own cell.`,
            highlight: { r1: clue.r, c1: clue.c, r2: clue.r, c2: clue.c },
            clue
          };
        }
      }
    }

    // 3. For each unassigned clue, check possible placements (considering current board rooms)
    const unplacedClues = level.clues.filter(clue => {
      const room = getRoomAt(rooms, clue.r, clue.c);
      if (!room) return true;
      const status = getRoomStatus(level, room);
      return !status.valid;
    });

    for (const clue of unplacedClues) {
      const allPlacements = getPossiblePlacementsForClue(level, clue);
      if (allPlacements.length === 1) {
        const p = allPlacements[0];
        return {
          type: 'deduction',
          title: 'Forced Dimensions',
          text: `The number ${clue.val} at row ${clue.r + 1}, col ${clue.c + 1} has only one valid placement on the board: a ${p.width}×${p.height} room.`,
          highlight: { r1: p.r1, c1: p.c1, r2: p.r2, c2: p.c2 },
          clue
        };
      }
    }

    // 4. Check for orphaned cells (empty cell reachable by only one clue)
    for (let r = 0; r < level.height; r++) {
      for (let c = 0; c < level.width; c++) {
        if (!getRoomAt(rooms, r, c)) {
          const reachingClues = [];
          for (const clue of level.clues) {
            const placements = getPossiblePlacementsForClue(level, clue);
            if (placements.some(p => r >= p.r1 && r <= p.r2 && c >= p.c1 && c <= p.c2)) {
              reachingClues.push(clue);
            }
          }

          if (reachingClues.length === 1) {
            const onlyClue = reachingClues[0];
            return {
              type: 'reachability',
              title: 'Orphaned Cell',
              text: `The cell at row ${r + 1}, col ${c + 1} can only ever be reached by the number ${onlyClue.val} at row ${onlyClue.r + 1}, col ${onlyClue.c + 1}.`,
              highlight: { r1: r, c1: c, r2: r, c2: c },
              clue: onlyClue
            };
          }
        }
      }
    }

    // 5. General guidance
    if (unplacedClues.length > 0) {
      const candidate = unplacedClues[0];
      return {
        type: 'guide',
        title: 'Tatami Expansion',
        text: `Consider number ${candidate.val} at row ${candidate.r + 1}, col ${candidate.c + 1}. Try factoring it into possible dimensions.`,
        highlight: { r1: candidate.r, c1: candidate.c, r2: candidate.r, c2: candidate.c },
        clue: candidate
      };
    }

    return {
      type: 'complete',
      title: 'Floorplan Complete',
      text: 'Every tatami room is placed and aligned!',
      highlight: null
    };
  }

  /**
   * Backtracking solver to verify unique solvability of a Shikaku puzzle.
   * Returns { solvable: boolean, unique: boolean, solution: array of rooms, count: number }
   */
  function solveLevel(level, maxSolutions = 2) {
    const totalCells = level.width * level.height;
    const cluePlacements = level.clues.map(clue => ({
      clue,
      placements: getPossiblePlacementsForClue(level, clue)
    }));

    // If any clue has zero placements, unsolvable
    if (cluePlacements.some(cp => cp.placements.length === 0)) {
      return { solvable: false, unique: false, solution: null, count: 0 };
    }

    // Sort clues by fewest placements first (MRV heuristic)
    cluePlacements.sort((a, b) => a.placements.length - b.placements.length);

    const solutions = [];
    const board = Array.from({ length: level.height }, () => Array(level.width).fill(false));

    function canPlace(p) {
      for (let r = p.r1; r <= p.r2; r++) {
        for (let c = p.c1; c <= p.c2; c++) {
          if (board[r][c]) return false;
        }
      }
      return true;
    }

    function place(p, val) {
      for (let r = p.r1; r <= p.r2; r++) {
        for (let c = p.c1; c <= p.c2; c++) {
          board[r][c] = val;
        }
      }
    }

    function search(clueIndex, currentRooms) {
      if (solutions.length >= maxSolutions) return;

      if (clueIndex === cluePlacements.length) {
        // Check if all cells covered
        let covered = 0;
        for (let r = 0; r < level.height; r++) {
          for (let c = 0; c < level.width; c++) {
            if (board[r][c]) covered++;
          }
        }
        if (covered === totalCells) {
          solutions.push(currentRooms.slice());
        }
        return;
      }

      const { clue, placements } = cluePlacements[clueIndex];
      for (const p of placements) {
        if (canPlace(p)) {
          place(p, true);
          currentRooms.push({
            r1: p.r1,
            c1: p.c1,
            r2: p.r2,
            c2: p.c2,
            clueVal: clue.val,
            clueR: clue.r,
            clueC: clue.c
          });

          search(clueIndex + 1, currentRooms);

          currentRooms.pop();
          place(p, false);

          if (solutions.length >= maxSolutions) return;
        }
      }
    }

    search(0, []);

    return {
      solvable: solutions.length > 0,
      unique: solutions.length === 1,
      count: solutions.length,
      solution: solutions[0] || null
    };
  }

  return {
    createGameState,
    getClueAt,
    getRoomAt,
    getRoomClues,
    getRoomStatus,
    normalizeRect,
    rectsOverlap,
    addRoom,
    removeRoomAt,
    undo,
    resetRooms,
    checkBoardState,
    getFactors,
    getPossiblePlacementsForClue,
    getDeductiveHint,
    solveLevel
  };
});
