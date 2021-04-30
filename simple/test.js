// node test.js

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
MAKE_MOVE, GAME_EVENT, makeMove, ProcessGameConfig, Stage, Bot} from "./boardgameio.js";

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
	console.log(state.ctx);
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


describe('MCTSBot', async () => {


  await test('MCTSBot vs. MCTSBot', async () => {
    const initialState = InitializeGame({ game: TicTacToe });
    const iterations = 100;//400;
    
    const objectives = () => ({
	//ctxの方はターンの情報(っぽい)
      'play-on-square-0': {
        checker: (G,ctx) => {
		/*if(G.cells[0] !== null){
			return true;
		}*/
		if (ctx.turn==3 && G.cells[0] ===0 && G.cells[1] ===1){
			if(G.cells[4] !== null){
				return true;
			}
		} 
	},
        weight: 50
      },
      'play-on-square-1': {
        checker: (G,ctx) => G.cells[1] !== null,
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

});
