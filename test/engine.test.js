const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ShikakuEngine = require('../src/shikaku-engine.js');
const ShikakuLevels = require('../src/levels.js');

describe('ZenShikaku Engine & Level Suite', () => {

  test('ShikakuLevels has 50 valid levels across 5 packs', () => {
    const packs = ShikakuLevels.getPacks();
    assert.equal(packs.length, 5);

    const levels = ShikakuLevels.getAllLevels();
    assert.equal(levels.length, 50);

    levels.forEach(lvl => {
      assert.ok(lvl.id >= 1 && lvl.id <= 50);
      assert.ok(lvl.width >= 5 && lvl.width <= 9);
      assert.ok(lvl.height >= 5 && lvl.height <= 9);
      assert.ok(Array.isArray(lvl.clues));
      assert.ok(lvl.clues.length > 0);

      // Check that total clue area equals grid area
      const totalClueArea = lvl.clues.reduce((sum, c) => sum + c.val, 0);
      assert.equal(totalClueArea, lvl.width * lvl.height, `Level ${lvl.id} clue sum matches grid cells`);

      // Clues must be within bounds
      lvl.clues.forEach(clue => {
        assert.ok(clue.r >= 0 && clue.r < lvl.height);
        assert.ok(clue.c >= 0 && clue.c < lvl.width);
        assert.ok(clue.val >= 1);
      });
    });
  });

  test('normalizeRect accurately handles reversed coordinates and bounds', () => {
    const r = ShikakuEngine.normalizeRect(5, 5, 3, 4, 1, 2);
    assert.equal(r.r1, 1);
    assert.equal(r.c1, 2);
    assert.equal(r.r2, 3);
    assert.equal(r.c2, 4);
    assert.equal(r.width, 3);
    assert.equal(r.height, 3);
    assert.equal(r.area, 9);
  });

  test('rectsOverlap accurately detects spatial intersections', () => {
    const r1 = { r1: 0, c1: 0, r2: 2, c2: 2 };
    const r2 = { r1: 2, c1: 2, r2: 4, c2: 4 }; // touches at (2,2)
    const r3 = { r1: 3, c1: 3, r2: 4, c2: 4 }; // no overlap with r1

    assert.equal(ShikakuEngine.rectsOverlap(r1, r2), true);
    assert.equal(ShikakuEngine.rectsOverlap(r1, r3), false);
  });

  test('Room validity evaluations: NO_CLUE, MULTIPLE_CLUES, WRONG_AREA, VALID', () => {
    const level = {
      id: 99,
      width: 5,
      height: 5,
      clues: [
        { r: 0, c: 0, val: 4 },
        { r: 0, c: 1, val: 2 }
      ]
    };

    // 1. Room with no clue
    const emptyRoom = { r1: 3, c1: 3, r2: 4, c2: 4 };
    const resEmpty = ShikakuEngine.getRoomStatus(level, emptyRoom);
    assert.equal(resEmpty.valid, false);
    assert.equal(resEmpty.reason, 'NO_CLUE');

    // 2. Room with multiple clues
    const multiRoom = { r1: 0, c1: 0, r2: 1, c2: 1 }; // covers (0,0) and (0,1)
    const resMulti = ShikakuEngine.getRoomStatus(level, multiRoom);
    assert.equal(resMulti.valid, false);
    assert.equal(resMulti.reason, 'MULTIPLE_CLUES');

    // 3. Room with wrong area
    const wrongAreaRoom = { r1: 0, c1: 0, r2: 0, c2: 0 }; // area 1, clue requires 4
    const resWrong = ShikakuEngine.getRoomStatus(level, wrongAreaRoom);
    assert.equal(resWrong.valid, false);
    assert.equal(resWrong.reason, 'WRONG_AREA');

    // 4. Valid room
    const validRoom = { r1: 0, c1: 0, r2: 1, c2: 1 }; // Wait, covers (0,1) too! Let's do 1x4:
    const validLevel = {
      id: 100,
      width: 5,
      height: 5,
      clues: [{ r: 0, c: 0, val: 4 }]
    };
    const perfectRoom = { r1: 0, c1: 0, r2: 1, c2: 1 };
    const resValid = ShikakuEngine.getRoomStatus(validLevel, perfectRoom);
    assert.equal(resValid.valid, true);
    assert.equal(resValid.reason, 'VALID');
    assert.equal(resValid.area, 4);
  });

  test('Room placement, replacement of overlaps, and undo history', () => {
    const level = ShikakuLevels.getLevel(1);
    const state = ShikakuEngine.createGameState(level);

    assert.equal(state.rooms.length, 0);

    // Place first room
    ShikakuEngine.addRoom(state, level, 0, 0, 1, 1);
    assert.equal(state.rooms.length, 1);

    // Place overlapping room (should replace the first)
    ShikakuEngine.addRoom(state, level, 0, 0, 2, 2);
    assert.equal(state.rooms.length, 1);
    assert.equal(state.rooms[0].r2, 2);

    // Undo should restore the first room
    const undone = ShikakuEngine.undo(state);
    assert.equal(undone, true);
    assert.equal(state.rooms.length, 1);
    assert.equal(state.rooms[0].r2, 1);

    // Remove room
    ShikakuEngine.removeRoomAt(state, 0, 0);
    assert.equal(state.rooms.length, 0);
  });

  test('checkBoardState accurately tracks coverage and win conditions', () => {
    const level = {
      id: 101,
      width: 2,
      height: 2,
      clues: [
        { r: 0, c: 0, val: 2 },
        { r: 1, c: 0, val: 2 }
      ]
    };

    const state = ShikakuEngine.createGameState(level);

    // Incomplete
    ShikakuEngine.addRoom(state, level, 0, 0, 0, 1); // 1x2 room
    let board = ShikakuEngine.checkBoardState(level, state.rooms);
    assert.equal(board.isSolved, false);
    assert.equal(board.coveredCells, 2);
    assert.equal(board.totalCells, 4);

    // Completed perfectly
    ShikakuEngine.addRoom(state, level, 1, 0, 1, 1); // 1x2 room
    board = ShikakuEngine.checkBoardState(level, state.rooms);
    assert.equal(board.isSolved, true);
    assert.equal(board.coveredCells, 4);
    assert.equal(board.overlaps, 0);
  });

  test('Deductive hint engine produces helpful logical guidance', () => {
    const level = {
      id: 102,
      width: 4,
      height: 4,
      clues: [
        { r: 0, c: 0, val: 1 },
        { r: 0, c: 1, val: 3 },
        { r: 1, c: 0, val: 4 },
        { r: 2, c: 0, val: 8 }
      ]
    };

    const hint = ShikakuEngine.getDeductiveHint(level, []);
    assert.ok(hint);
    assert.equal(hint.type, 'deduction');
    assert.ok(hint.text.includes('1'));
  });

  test('solveLevel confirms unique solutions for sample levels across packs', () => {
    // Check first level of each pack
    const sampleIds = [1, 11, 21, 31, 41];
    sampleIds.forEach(id => {
      const lvl = ShikakuLevels.getLevel(id);
      const res = ShikakuEngine.solveLevel(lvl, 2);
      assert.equal(res.solvable, true, `Level ${id} is solvable`);
      assert.equal(res.unique, true, `Level ${id} has a unique solution`);
      assert.equal(res.count, 1, `Level ${id} has exactly 1 solution`);
    });
  });

});
