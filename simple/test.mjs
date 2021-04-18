// node --experimental-modules test.js

/*
 * Copyright 2018 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
/*
import { InitializeGame } from '../core/initialize';
import { Client } from '../client/client';
import { MAKE_MOVE, GAME_EVENT } from '../core/action-types';
import { makeMove } from '../core/action-creators';
import { Step, Simulate } from './ai';
import { RandomBot } from './random-bot';
import { MCTSBot } from './mcts-bot';
//import type { Node } from './mcts-bot';
import { ProcessGameConfig } from '../core/game';
import { Stage } from '../core/turn-order';
//import type { AnyFn, Game, Ctx } from '../types';
*/
import { Client, Local, MCTSBot, RandomBot, ReactClient, ReactNativeClient, /*Simulate,*/ CreateGameReducer, SocketIO, Step, TurnOrder , InitializeGame,
MAKE_MOVE, GAME_EVENT, makeMove, ProcessGameConfig, Stage, Bot} from "./boardgameio";

const describe=async (name, action)=> {console.log("TestSuite",name); await action(); };
const test=async (name, action)=> {console.log("Testcase",name); await action(); };


async function Simulate({ game, bots, state, depth, onEnd=()=>false}) {
    if (depth === undefined)
        depth = 10000;
    const reducer = CreateGameReducer({ game });
    let metadata = null;
    let iter = 0;
    while (state.ctx.gameover === undefined && iter < depth) {
        let playerID = state.ctx.currentPlayer;
        if (state.ctx.activePlayers) {
            playerID = Object.keys(state.ctx.activePlayers)[0];
        }
        const bot = bots instanceof Bot ? bots : bots[playerID];
        const t = await bot.play(state, playerID);
        if (!t.action) {
            break;
        }
        metadata = t.metadata;
        state = reducer(state, t.action);
        onEnd({state, action:t.action});
        iter++;
    }
    return { state, metadata };
}

function IsVictory(cells) {
  const positions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const isRowComplete = (row) => {
    const symbols = row.map((i) => cells[i]);
    return symbols.every((i) => i !== null && i === symbols[0]);
  };

  return positions.map(isRowComplete).some((i) => i === true);
}

const TicTacToe = ProcessGameConfig({
  setup: () => ({
    cells: new Array(9).fill(null),
  }),

  moves: {
    clickCell(G, ctx, id) {
      const cells = [...G.cells];
      if (cells[id] === null) {
        cells[id] = ctx.currentPlayer;
      }
      return { ...G, cells };
    },
  },

  turn: { moveLimit: 1,
     /*onEnd: (G, ctx) => {
       console.log("END!",G,ctx);  
       return G;
     }*/
   },

  endIf: (G, ctx) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }

    if (G.cells.filter((t) => t == null).length == 0) {
      return { draw: true };
    }
  },
});

const enumerate = (G, ctx, playerID) => {
  const r = [];
  for (let i = 0; i < 9; i++) {
    if (G.cells[i] === null) {
      r.push(makeMove('clickCell', [i], playerID));
    }
  }
  return r;
};

/*
describe('Step', () => {
  test('advances game state', async () => {
    const client = Client({
      game: {
        setup: () => ({ moved: false }),

        moves: {
          clickCell(G) {
            return { moved: !G.moved };
          },
        },

        endIf(G) {
          if (G.moved) return true;
        },

        ai: {
          enumerate: () => [{ move: 'clickCell' }],
        },
      },
    });

    const bot = new RandomBot({ enumerate: client.game.ai.enumerate });
    expect(client.getState().G).toEqual({ moved: false });
    await Step(client, bot);
    expect(client.getState().G).toEqual({ moved: true });
  });

  test('does not crash on empty action', async () => {
    const client = Client({
      game: {
        ai: {
          enumerate: () => [],
        },
      },
    });
    const bot = new RandomBot({ enumerate: client.game.ai.enumerate });
    await Step(client, bot);
  });

  test('works with stages', async () => {
    const client = Client({
      game: {
        moves: {
          A: (G) => {
            G.moved = true;
          },
        },

        turn: {
          activePlayers: { currentPlayer: 'stage' },
        },

        ai: {
          enumerate: () => [{ move: 'A' }],
        },
      },
    });

    const bot = new RandomBot({ enumerate: client.game.ai.enumerate });
    expect(client.getState().G).not.toEqual({ moved: true });
    await Step(client, bot);
    expect(client.getState().G).toEqual({ moved: true });
  });
});

describe('Simulate', () => {
  const bots = {
    '0': new RandomBot({ seed: 'test', enumerate }),
    '1': new RandomBot({ seed: 'test', enumerate }),
  };

  test('multiple bots', async () => {
    const state = InitializeGame({ game: TicTacToe });
    const { state: endState } = await Simulate({
      game: TicTacToe,
      bots,
      state,
    });
    expect(endState.ctx.gameover).not.toBe(undefined);
  });

  test('single bot', async () => {
    const bot = new RandomBot({ seed: 'test', enumerate });
    const state = InitializeGame({ game: TicTacToe });
    const { state: endState } = await Simulate({
      game: TicTacToe,
      bots: bot,
      state,
      depth: 10,
    });
    expect(endState.ctx.gameover).not.toBe(undefined);
  });

  test('with activePlayers', async () => {
    const game = ProcessGameConfig({
      moves: {
        A: (G) => {
          G.moved = true;
        },
      },
      turn: {
        activePlayers: { currentPlayer: Stage.NULL },
      },
      endIf: (G) => G.moved,
    });

    const bot = new RandomBot({
      seed: 'test',
      enumerate: () => [makeMove('A')],
    });

    const state = InitializeGame({ game });
    const { state: endState } = await Simulate({
      game,
      bots: bot,
      state,
      depth: 1,
    });
    expect(endState.ctx.gameover).not.toBe(undefined);
  });
});
describe('Bot', () => {
  test('random', () => {
    const b = new RandomBot({ enumerate: () => [] });
    expect(b.random()).toBeGreaterThanOrEqual(0);
    expect(b.random()).toBeLessThan(1);
  });

  test('enumerate - makeMove', () => {
    const enumerate = () => [makeMove('move')];
    const b = new RandomBot({ enumerate });
    expect(b.enumerate(undefined, undefined, undefined)[0].type).toBe(
      MAKE_MOVE
    );
  });

  test('enumerate - translate to makeMove', () => {
    const enumerate = () => [{ move: 'move' }];
    const b = new RandomBot({ enumerate });
    expect(b.enumerate(undefined, undefined, undefined)[0].type).toBe(
      MAKE_MOVE
    );
  });

  test('enumerate - translate to gameEvent', () => {
    const enumerate = () => [{ event: 'endTurn' }];
    const b = new RandomBot({ enumerate });
    expect(b.enumerate(undefined, undefined, undefined)[0].type).toBe(
      GAME_EVENT
    );
  });

  test('enumerate - unrecognized', () => {
    const enumerate = (() =>
      [{ unknown: true }] as unknown) as Game['ai']['enumerate'];
    const b = new RandomBot({ enumerate });
    expect(b.enumerate(undefined, undefined, undefined)).toEqual([undefined]);
  });
});*/

describe('MCTSBot', async () => {
/*  test('game that never ends', async () => {
    const game = {};
    const state = InitializeGame({ game });
    const bot = new MCTSBot({ seed: 'test', game, enumerate: () => [] });
    const { state: endState } = await Simulate({ game, bots: bot, state });
    expect(endState.ctx.turn).toBe(1);
  });

  test('RandomBot vs. MCTSBot', async () => {
    const bots = {
      '0': new RandomBot({ seed: 'test', enumerate }),
      '1': new MCTSBot({
        iterations: 200,
        seed: 'test',
        game: TicTacToe,
        enumerate,
      }),
    };

    const initialState = InitializeGame({ game: TicTacToe });

    for (let i = 0; i < 5; i++) {
      const state = initialState;
      const { state: endState } = await Simulate({
        game: TicTacToe,
        bots,
        state,
      });
      expect(endState.ctx.gameover).not.toEqual({ winner: '0' });
    }
  });*/

  await test('MCTSBot vs. MCTSBot', async () => {
    const initialState = InitializeGame({ game: TicTacToe });
    const iterations = 100;//400;
    
    const objectives = () => ({
      'play-on-square-0': {
        checker: (G) => G.cells[0] !== null,
        weight: 50,
      },
      'play-on-square-1': {
        checker: (G) => G.cells[1] !== null,
        weight: 10,
      },
    });


    for (let i = 0; i < 1; i++) {
      const bots = {
        '0': new MCTSBot({
          seed: Math.floor(Math.random()*1000),
          game: TicTacToe,
          enumerate,
          iterations,
          playoutDepth: 50,
          objectives,
        }),
        '1': new MCTSBot({
          seed: Math.floor(Math.random()*1000),
          game: TicTacToe,
          enumerate,
          iterations,
          objectives,
        }),
      };
      const state = initialState;
      const { state: endState } = await Simulate({
        game: TicTacToe,
        bots,
        state,
        onEnd: ({action, state})=> {
           console.log("TURN", action, state.G.cells);
        }
      });
      console.log("RESULT", endState);
      //expect(endState.ctx.gameover).toEqual({ draw: true });
    }
  });
/*
  test('with activePlayers', async () => {
    const game = ProcessGameConfig({
      setup: () => ({ moves: 0 }),
      moves: {
        A: (G) => {
          G.moves++;
        },
      },
      turn: {
        activePlayers: { currentPlayer: Stage.NULL },
      },
      endIf: (G) => G.moves > 5,
    });

    const bot = new MCTSBot({
      seed: 'test',
      game,
      enumerate: () => [makeMove('A')],
    });

    const state = InitializeGame({ game });
    const { state: endState } = await Simulate({
      game,
      bots: bot,
      state,
      depth: 10,
    });
    expect(endState.ctx.gameover).not.toBe(undefined);
  });*/

/*
  await test('objectives', async () => {
    const objectives = () => ({
      'play-on-square-0': {
        checker: (G) => G.cells[0] !== null,
        weight: 10,
      },
    });

    const state = InitializeGame({ game: TicTacToe });

    for (let i = 0; i < 1; i++) {
      const bot = new MCTSBot({
        iterations: 200,
        seed: i,
        game: TicTacToe,
        enumerate,
        objectives,
      });

      const { action } = await bot.play(state, '0');
      console.log(state);
      console.log(action);
      console.log(action.payload.args);
      //expect(action.payload.args).toEqual([0]);
    }
  });
*/


/*
  test('async mode', async () => {
    const initialState = InitializeGame({ game: TicTacToe });
    const bot = new MCTSBot({
      seed: '0',
      game: TicTacToe,
      enumerate,
      iterations: 10,
      playoutDepth: 10,
    });
    bot.setOpt('async', true);
    const action = await bot.play(initialState, '0');
    expect(action).not.toBeUndefined();
  });

  describe('iterations & playout depth', () => {
    test('set opts', () => {
      const bot = new MCTSBot({ game: TicTacToe, enumerate: jest.fn() });
      bot.setOpt('iterations', 1);
      expect(bot.opts()['iterations'].value).toBe(1);
    });

    test('setOpt works on invalid key', () => {
      const bot = new RandomBot({ enumerate: jest.fn() });
      bot.setOpt('unknown', 1);
    });

    test('functions', () => {
      const state = InitializeGame({ game: TicTacToe });

      // jump ahead in the game because the example iterations
      // and playoutDepth functions are based on the turn
      state.ctx.turn = 8;

      const { turn, currentPlayer } = state.ctx;

      const enumerateSpy = jest.fn(enumerate);

      const bot = new MCTSBot({
        game: TicTacToe,
        enumerate: enumerateSpy,
        iterations: (G, ctx) => ctx.turn * 100,
        playoutDepth: (G, ctx) => ctx.turn * 10,
      });

      expect(
        (bot.iterations as AnyFn)(null, { turn } as Ctx, currentPlayer)
      ).toBe(turn * 100);
      expect(
        (bot.playoutDepth as AnyFn)(null, { turn } as Ctx, currentPlayer)
      ).toBe(turn * 10);

      // try the playout() function which requests the playoutDepth value
      bot.playout({ state } as Node);

      expect(enumerateSpy).toHaveBeenCalledWith(
        state.G,
        state.ctx,
        currentPlayer
      );

      // then try the play() function which requests the iterations value
      enumerateSpy.mockClear();

      bot.play(state, currentPlayer);

      expect(enumerateSpy).toHaveBeenCalledWith(
        state.G,
        state.ctx,
        currentPlayer
      );
    });
  });
  */
});
