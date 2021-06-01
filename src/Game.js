import { INVALID_MOVE } from 'boardgame.io/core';

export const TicTacToe = {
    // ここで生成したオブジェクトが Gとして各種関数に渡される
    setup: () => ({ cells: Array(/*81*/9).fill(null) }),
    turn: {
        moveLimit: 1,
    },

    moves: {
        clickCell: (G, ctx, id) => {
        	if (G.cells[id] !== null) {
            		return INVALID_MOVE;
          	}
            G.cells[id] = ctx.currentPlayer;//ここで各セルにプレイヤー名(0か1)を入れている？
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
            for (let i = 0; i < /*81*/9; i++) {
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
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
  ];

const isRowComplete = row => {
    const symbols = row.map(i => cells[i]);
    return symbols.every(i => i !== null && i === symbols[0]);
  };

  return positions.map(isRowComplete).some(i => i === true);
}

// Return true if all `cells` are occupied.
function IsDraw(cells) {
  return cells.filter(c => c === null).length === 0;
}

/*  const positions = [
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

const place = [
//マス単位での配置
[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
[1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
];

function isOccupied(n){
	var temporaryArray = [];
	var occupiedArray = [];
	var z;
    //postitions[n]の各列（positions[n][i]、i=0...8）について、
	for (let i=0; i<positions[n].length; i++) {
	//揃っている（つまりpositions[n][i][j]、j=0...2、が全部同じ) ものがあればそれを返す、揃っていなければ-1を返す
	    for (var j=0; j<positions[n][i].length; j++) {
    		z = positions[n][i][j];
    		temporaryArray[j] = cells[z];
    		//console.log(temporaryArray);
	    }

		if(temporaryArray[0] == temporaryArray[1] && temporaryArray[1] == temporaryArray[2] && temporaryArray[0] != null){
			if(temporaryArray[0] == 0){
				occupiedArray[i] = 0;
			}else{
				occupiedArray[i] = 1;
			}
		}else{
			occupiedArray[i] = -1;
		}

	}

	for(let i=0;i<occupiedArray.length;i++){
		if(occupiedArray[i] != -1){
			return occupiedArray[i];
		}
	}
}

for(var i=0;i<9;i++){
	if(isOccupied(i) != null){
		placeAssign(i);
		for(var x=0;x<8;x++){
			if(place[x][0] == place[x][1]  && place[x][1] == place[x][2] && place[x][0] != null){
				return true;
			}
		}
	}
}

function placeAssign(n){//占領されたマスの番号と一致するplace配列の中身を書き換えたい
	for(var a=0;a<8;a++){
		for(var b=0;b<3;b++){
			if(place[a][b] == n){
				if(isOccupied(n) == 0){
					place[a][b] = true;
				}else{
					place[a][b] = false;
				}
			}
		}
	}
}

}



// Return true if all `cells` are occupied.
function IsDraw(cells) {
    return cells.filter(c => c === null).length === 0;
}
*/