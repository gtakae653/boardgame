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
	console.log("ctx",state.ctx);
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

/*
pat=[ [0,1,2, 3,4,5, 6,7,8 ]   ,
      [6,3,0,
       7,4,1,
       8,5,2,]// 90度右回転
      [....]  // 180度右回転
      [....]  // 270度右回転
      [2,1,0, 5,4,3, 8,7,6]  左右反転
      [             ]     //の90度回転
      [             ]     //の180度回転
      [             ]     //の270度回転
//上下反転は要らないはずです（理由を考えてみよう）
];
*/


describe('MCTSBot', async () => {


  await test('RandomBot vs. MCTSBot', async () => {
    const initialState = InitializeGame({ game: TicTacToe });
    const iterations = 100;//400;

    const objectives = () => ({
	//ctxの方はターンの情報(っぽい)

//最初に角
      'play-on-square-0-1': {//最初に角[0]を取った場合
        checker: (G,ctx) => {
		if(G.cells[0] !== null){
			return true;
		}
	},
        weight: 10
      },

	'play-on-square-2-3':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[0] === "0" && G.cells[2] !== "1" && (G.cells[6] === "1" || G.cells[7] === "1" || G.cells[8] === "1")){
				if(G.cells[2] === "0"){

					return true;
				}
			}
		},
		weight:15
	},

	'play-on-square-2-5':{
		checker:(G,ctx) => {
			if(ctx.turn == 6 && G.cells[0] === "0" && G.cells[2] === "0" && (G.cells[6] === "1" || G.cells[7] === "1" || G.cells[8] === "1")){
				/*if(G.cells[1] !== "1"){
					if(G.cells[1] === "0"){
						return true;
					}
				}else{*/

					if(G.cells[6] === "1"){
						console.log("aaa");
						if( G.cells[8] === "0"){
							return true;
						}
					}/*else if(G.cells[7] === "1" && G.cells[4] === "0"){
						return true;
					}else if(G.cells[8] === "1" && G.cells[6] === "0"){
						return true;
					}else{
					}*/
				//}
			}
		},
		weight:20
	},

	'play-on-square-4-3':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[0] === "0" && G.cells[4] !== "1" && (G.cells[1] === "1" || G.cells[3] === "1")){
				if(G.cells[4] === "0"){
					return true;
				}
			}
		},
		weight:1
	},

	'play-on-square-6-3':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[0] === "0" && G.cells[6] !== "1" && (G.cells[2] === "1" || G.cells[5] === "1" || G.cells[8] === "1")){
				if(G.cells[6] === "0"){
					return true;
				}
			}
		},
		weight:1
	},





//最初に真ん中
/*	'play-on-square-not1':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[4] === "0" && G.cells[7] === "1" ){
				if(G.cells[1] !== "0"){
					return true;
				}
			}
		},
		weight:50
	},
	'play-on-square-not3':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[4] === "0" && G.cells[5] === "1" ){
				if(G.cells[3] !== "0"){
					return true;
				}
			}
		},
		weight:50
	},
	'play-on-square-not5':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[4] === "0" && G.cells[3] === "1" ){
				if(G.cells[5] !== "0"){
					return true;
				}
			}
		},
		weight:50
	},
	'play-on-square-not7':{
		checker:(G,ctx) => {
			if(ctx.turn == 4 && G.cells[4] === "0" && G.cells[1] === "1" ){
				if(G.cells[7] !== "0"){
					return true;
				}
			}
		},
		weight:50
	},


*/














      'play-on-square-1': {
        checker: (G,ctx) => G.cells[6] !== null,
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
          //objectives,
        }),
        '1': new MCTSBot({
          seed: Math.floor(Math.random()*1000),
          game: TicTacToe,
          enumerate,
          iterations,
          //objectives,
        }),
      };
      const state = initialState;
      const { state: endState } = await Simulate({
        game: TicTacToe,
        bots,
        state,
        onEnd: ({action, state})=> {
           console.log("TURN", action, state.G.cells,state.ctx);
        }
      });
      console.log("RESULT", endState);
      //expect(endState.ctx.gameover).toEqual({ draw: true });
    }
  });

});
