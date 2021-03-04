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
      G.cells[id] = ctx.currentPlayer;//�����Ŋe�Z���Ƀv���C���[��(0��1)�����Ă���H
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
//�P�}�X��
[[0, 1, 2], [9, 10, 11], [18, 19, 20],
[0, 9, 18],[1, 10, 19], [2, 11, 20],
[0, 10, 20], [2, 10, 18]],

//�Q�}�X��
[[3,4,5],[12,13,14],[21,22,23],
[3,12,21],[4,13,22],[5,14,23],
[3,13,23],[5,13,21]],

//�R�}�X��
[[6,7,8],[15,16,17],[24,25,26],
[6,15,24],[7,16,25],[8,17,26],
[6,16,26],[8,16,24]],

//�S�}�X��
[[27,28,29],[36,37,38],[45,46,47],
[27,36,45],[28,37,46],[29,38,47],
[27,37,47],[29,37,45]],


//�T�}�X��
[[30,31,32],[39,40,41],[48,49,50],
[30,39,48],[31,40,49],[32,41,50],
[30,40,50],[32,40,48]],


//�U�}�X��
[[33,34,35],[42,43,44],[51,52,53],
[33,42,51],[34,43,52],[35,44,53],
[33,43,53],[35,43,51]],


//�V�}�X��
[[54,55,56],[63,64,65],[72,73,74],
[54,63,72],[55,64,73],[56,65,74],
[54,64,74],[56,64,72]],


//�W�}�X��
[[57,58,59],[66,67,68],[75,76,77],
[57,66,75],[58,67,76],[59,68,77],
[57,67,77],[59,67,75]],


//�X�}�X��
[[60,61,62],[69,70,71],[78,79,80],
[60,69,78],[61,70,79],[62,71,80],
[60,70,80],[62,70,78]]
  ];
/*
function isRowComplete(row){
	const symbols = row.map(i => cells[i]);//cells[i]�͂��̃Z���̒��g���������Ă���(null��0��1��)
	const reult = symbols.every(i => i !== null && i === symbols[0]);//symbols[0]�́A[0,1,2]�Ȃǂ̔z��̓��̒l�����āA�c��̂Q�̗v�f���S�ē����������Ă���
	if(result == true){
		return symbols[0];
	}
}
*/
function isOccupied(n){
	var temporaryArray = [];
	var z;
    //postitions[n]�̊e��ipositions[n][i]�Ai=0...8�j�ɂ��āA
	for (var i=0; i<positions[n].length; i++) {
	//�����Ă���i�܂�positions[n][i][j]�Aj=0...2�A���S������) ���̂�����΂����Ԃ��A�����Ă��Ȃ����-1��Ԃ�
	    for (var j=0; j<positions[n][i].length; j++) {
		z = positions[n][i][j];
		temporaryArray.push(cells[z]);
	    }
		if(temporaryArray[0] == temporaryArray[1] && temporaryArray[1] == temporaryArray[2] && temporaryArray[0] != null){
			if(temporaryArray[0] == 0){
				return 0;
			}else{
				return 1;
			}
		}else{
			return -1;
		}
	}
}

console.log(isOccupied(0));

if(isOccupied(0) != -1){
	return true;
}
}
// Return true if all `cells` are occupied.
function IsDraw(cells) {
  return cells.filter(c => c === null).length === 0;
}

