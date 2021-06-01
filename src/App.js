import { Client } from 'boardgame.io/client';
import { TicTacToe } from './Game';
import { TicTacToeBoard } from './Board';

class TicTacToeClient {
    constructor(rootElement) {
    	// As before, but we also subscribe to the client:

        this.client = Client({ game: TicTacToe });
        this.client.start();
    	this.rootElement = rootElement;
        this.createBoard();
        this.attachListeners();
    	this.client.subscribe(state => this.update(state));
    }

	createBoard() {
		// Create cells in rows for the Tic-Tac-Toe board.
		const rows = [];
		for (let i = 0; i < /*9*/3; i++) {
  			const cells = [];
  			for (let j = 0; j < /*9*/3; j++) {
    			const id = /*9*/3 * i + j;
    			cells.push(`<td class="cell" data-id="${id}"></td>`);
  			}
  			rows.push(`<tr>${cells.join('')}</tr>`);
		}

		// Add the HTML to our app <div>.
		// Well use the empty <p> to display the game winner later.
		this.rootElement.innerHTML = `
  		<table>${rows.join('')}</table>
  		<p class="winner"></p>
		`;
	}

  	attachListeners() {
		// This event handler will read the cell id from a cell
		// `data-id` attribute and make the `clickCell` move.
		const handleCellClick = event => {
  			const id = parseInt(event.target.dataset.id);
  			this.client.moves.clickCell(id);
		};
		// Attach the event listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');
		cells.forEach(cell => {
  			cell.onclick = handleCellClick;
		});
	}

	update(state) {
    	// Get all the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');
		// Update cells to display the values in game state.
		cells.forEach(cell => {
  			const cellId = parseInt(cell.dataset.id);
  			const cellValue = state.G.cells[cellId];
  			cell.textContent = cellValue !== null ? cellValue : '';
		});
		// Get the gameover message element.
		const messageEl = this.rootElement.querySelector('.winner');
		// Update the element to show a winner if any.
		if (state.ctx.gameover) {
  			messageEl.textContent =
    			state.ctx.gameover.winner !== undefined ?
                'Winner: ' + state.ctx.gameover.winner
     		: 'Draw!';
		} else {
  			messageEl.textContent = '';
		}
	}

}

const appElement = document.getElementById('app');
const app = new TicTacToeClient(appElement);

const App = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
});

export default App;
