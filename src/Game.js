import { INVALID_MOVE } from 'boardgame.io/core';

export const TicTacToe = {
  setup: () => ({ cells: Array(81).fill(null) }),


  turn: {
    moveLimit: 1,
  },

  moves: {
    clickCell: (G, ctx, id) => {
	if (G.cells[id] !== null) {
    		return INVALID_MOVE;
  	}
      G.cells[id] = ctx.currentPlayer;
    },
  },

  endIf: (G, ctx) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  },

	ai: {
    enumerate: (G, ctx) => {
      let moves = [];
      for (let i = 0; i < 81; i++) {
        if (G.cells[i] === null) {
          moves.push({ move: 'clickCell', args: [i] });
        }
      }
      return moves;
    },
  },

};






// Return true if `cells` is in a winning configuration.
function IsVictory(cells) {
  const positions = [
//１マス目
[[0, 1, 2], [9, 10, 11], [18, 19, 20],
[0, 9, 18],[1, 10, 19], [2, 11, 20],
[0, 10, 20], [2, 10, 18]],

//２マス目
[[3,4,5],[12,13,14],[21,22,23],
[3,12,21],[4,13,22],[5,14,23],
[3,13,23],[5,13,21]],

//３マス目
[[6,7,8],[15,16,17],[24,25,26],
[6,15,24],[7,16,25],[8,17,26],
[6,16,26],[8,16,24]],

//４マス目
[[27,28,29],[36,37,38],[45,46,47],
[27,36,45],[28,37,46],[29,38,47],
[27,37,47],[29,37,45]],


//５マス目
[[30,31,32],[39,40,41],[48,49,50],
[30,39,48],[31,40,49],[32,41,50],
[30,40,50],[32,40,48]],


//６マス目
[[33,34,35],[42,43,44],[51,52,53],
[33,42,51],[34,43,52],[35,44,53],
[33,43,53],[35,43,51]],


//７マス目
[[54,55,56],[63,64,65],[72,73,74],
[54,63,72],[55,64,73],[56,65,74],
[54,64,74],[56,64,72]],


//８マス目
[[57,58,59],[66,67,68],[75,76,77],
[57,66,75],[58,67,76],[59,68,77],
[57,67,77],[59,67,75]],


//９マス目
[[60,61,62],[69,70,71],[78,79,80],
[60,69,78],[61,70,79],[62,71,80],
[60,70,80],[62,70,78]]
  ];

const p = [positions[0],positions[1],positions[2],positions[3],positions[4],positions[5],positions[6],positions[7],positions[8]];
const q = [
p[0[0]],p[0[1]],p[0[2]],p[0[3]],p[0[4]],p[0[5]],p[0[6]],p[0[7]],
p[1[0]],p[1[1]],p[1[2]],p[1[3]],p[1[4]],p[1[5]],p[1[6]],p[1[7]],
p[2[0]],p[2[1]],p[2[2]],p[2[3]],p[2[4]],p[2[5]],p[2[6]],p[2[7]],
p[3[0]],p[3[1]],p[3[2]],p[3[3]],p[3[4]],p[3[5]],p[3[6]],p[3[7]],
p[4[0]],p[4[1]],p[4[2]],p[4[3]],p[4[4]],p[4[5]],p[4[6]],p[4[7]],
p[5[0]],p[5[1]],p[5[2]],p[5[3]],p[5[4]],p[5[5]],p[5[6]],p[5[7]],
p[6[0]],p[6[1]],p[6[2]],p[6[3]],p[6[4]],p[6[5]],p[6[6]],p[6[7]],
p[7[0]],p[7[1]],p[7[2]],p[7[3]],p[7[4]],p[7[5]],p[7[6]],p[7[7]],
p[8[0]],p[8[1]],p[8[2]],p[8[3]],p[8[4]],p[8[5]],p[8[6]],p[8[7]]
];


  const isRowComplete = row => {
    const symbols = row.map(i => cells[q[i]]);
    return symbols.every(i => i !== null && i === symbols[0]);
  };

  return positions.map(isRowComplete).some(i => i === true);
//someは1つでも配列の中身が条件を満たしていればtrueを返す
}

// Return true if all `cells` are occupied.
function IsDraw(cells) {
  return cells.filter(c => c === null).length === 0;
}

function isOccupied(n){
//マス単位で取られている個所は0か1(プレイヤー番号)を返し、取られていなければ-1を返す
//if(p[n]


}