/*
 * Copyright 2018 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
import { CreateGameReducer } from '../core/reducer';
import { Bot } from './bot';
import type { BotAction } from './bot';
import type { Game, PlayerID, Ctx, State, Reducer } from '../types';

export interface Node {
  /** このノードが表すゲームの状態 */
  state: State;
  /** 親ノード（前ターンの状態） */
  parent?: Node;
  /** 親ノードからこのノードにたどり着いたときにとった行動 */
  parentAction?: BotAction;
  /** まだとっていない行動 */
  actions: BotAction[];
  /** 現在の目標（？） */
  objectives: Objectives | Objectives[];
  /** 子ノード（次のターンのノード） */
  children: Node[];
  /** このノードを通過したシミュレーションの数 */
  visits: number;
  /** このノードを通過して勝った回数 */
  value: number;
}

interface Objective {
  //  ゲームとコンテキストから true/ falseを返す
  checker: (G: any, ctx: Ctx) => boolean;
  weight: number;//重み
}

type Objectives = Record<string, Objective>;

/**
 * The number of iterations to run before yielding to
 * the JS event loop (in async mode).
 */
const CHUNK_SIZE = 25;

/**
 * Bot that uses Monte-Carlo Tree Search to find promising moves.
 */
export class MCTSBot extends Bot {
 // ゲームの状態やらどのプレイヤーのターンか、とかを与えるとObjectiveの一覧（当面達成すべき目標？）を返す関数
  private objectives: (G: any, ctx: Ctx, playerID: PlayerID) => Objectives;
 // 繰り返した回数とノードを与えられると何かをする関数（何かってなんだろう）
  private iterationCallback: (data: {
    iterationCounter: number;
    numIterations: number;
    metadata: Node;
  }) => void;
  private reducer: Reducer;//Reducerは、下の方のソースを見ると、どうやらあるノードから子ノード（次のターンの状態）を作りだす装置のようです。
  iterations: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);//繰り返し回数。直接値を指定してもいいけど、ゲームの状態によって「あと何回繰り返すか」を関数で返してもよい。
  playoutDepth?: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);//繰り返しの深さ

  constructor({
    enumerate,
    seed,
    objectives,
    game,
    iterations,
    playoutDepth,
    iterationCallback,
  }: {
    enumerate: Game['ai']['enumerate'];
    seed?: string | number;
    game: Game;
    objectives?: (G: any, ctx: Ctx, playerID?: PlayerID) => Objectives;
    iterations?: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);
    playoutDepth?: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);
    iterationCallback?: (data: {
      iterationCounter: number;
      numIterations: number;
      metadata: Node;
    }) => void;
  }) {
    super({ enumerate, seed });

    if (objectives === undefined) {
      objectives = () => ({});
    }

    this.objectives = objectives;
    this.iterationCallback = iterationCallback || (() => {});
    this.reducer = CreateGameReducer({ game });
    this.iterations = iterations;
    this.playoutDepth = playoutDepth;

    this.addOpt({
      key: 'async',
      initial: false,
    });

    this.addOpt({
      key: 'iterations',
      initial: typeof iterations === 'number' ? iterations : 1000,
      range: { min: 1, max: 2000 },
    });

    this.addOpt({
      key: 'playoutDepth',
      initial: typeof playoutDepth === 'number' ? playoutDepth : 50,
      range: { min: 1, max: 100 },
    });
  }

  private createNode({
    state,
    parentAction,
    parent,
    playerID,
  }: {
    state: State;
    parentAction?: BotAction;
    parent?: Node;
    playerID?: PlayerID;
  }): Node {
    const { G, ctx } = state;

    let actions: BotAction[] = [];
    let objectives: Objectives | Objectives[] = [];

    if (playerID !== undefined) {
      actions = this.enumerate(G, ctx, playerID);
      objectives = this.objectives(G, ctx, playerID);
    } else if (ctx.activePlayers) {
      for (const playerID in ctx.activePlayers) {
        actions = actions.concat(this.enumerate(G, ctx, playerID));
        objectives = objectives.concat(this.objectives(G, ctx, playerID));
      }
    } else {
      actions = actions.concat(this.enumerate(G, ctx, ctx.currentPlayer));
      objectives = objectives.concat(
        this.objectives(G, ctx, ctx.currentPlayer)
      );
    }

    return {
      state,
      parent,
      parentAction,
      actions,
      objectives,
      children: [],
      visits: 0,
      value: 0,
    };
  }

  //あるノードから辿れる次の子ノードを選択する？
  private select(node: Node) {
    // This node has unvisited children.
    //このノードにはまだ辿っていない子ノードがある(まだとっていない行動がある）
    if (node.actions.length > 0) {
      return node;//なら、このノードを選ぶ（伸ばし甲斐があるから？）
    }
    // This is a terminal node.//このノードは終端である
    if (node.children.length == 0) {
      return node;//なら、このノードを選ぶ（勝負ついているから？）
    }
    // この時点で残っているのは「終端ではないけど、全部の子供を辿っている形跡があるもの」
    let selectedChild = null;
    let best = 0;
    for (const child of node.children) {//全部の子ノードについて見てみよう
      // Number.EPSILONは「JavaScriptで表現できる最も小さい正の値: 10^-16くらい？」。
      // child.visitsが0のときに割れなくなることへの対策
      const childVisits = child.visits + Number.EPSILON;
      const uct =
        child.value / childVisits + // child.valueが評価関数っぽい。ただしこの時点では「このノードの子孫に、勝ったやつがいくつあるか」という値
        Math.sqrt((2 * Math.log(node.visits)) / childVisits);
      if (selectedChild == null || uct > best) {//いちばんいいやつを頼む
        best = uct;
        selectedChild = child;
      }
    }
    return this.select(selectedChild);//そこから、さらに下を辿る
  }

  private expand(node: Node) {
    const actions = node.actions;

    if (actions.length == 0 || node.state.ctx.gameover !== undefined) {
      return node;
    }

    const id = this.random(actions.length);
    const action = actions[id];
    node.actions.splice(id, 1);
    const childState = this.reducer(node.state, action);
    const childNode = this.createNode({
      state: childState,
      parentAction: action,
      parent: node,
    });
    node.children.push(childNode);
    return childNode;
  }

  playout({ state }: Node) {
    let playoutDepth = this.getOpt('playoutDepth');//あとどれくらい辿るかを計算
    if (typeof this.playoutDepth === 'function') {
      playoutDepth = this.playoutDepth(state.G, state.ctx);
    }
    for (let i = 0; i < playoutDepth && state.ctx.gameover === undefined; i++) {
      const { G, ctx } = state;
      let playerID = ctx.currentPlayer;
      if (ctx.activePlayers) {
        playerID = Object.keys(ctx.activePlayers)[0];
      }
//この状態で可能な行動を全部調べ上げる
      const moves = this.enumerate(G, ctx, playerID);
      // Check if any objectives are met.
      //どれか1つ目標を達成していればそいつを返す
      const objectives = this.objectives(G, ctx, playerID);
      // Object.keys({a:3, b:5}) -> ["a","b"] みたいに属性の配列を返す
      // reduceは合計を計算するようなときに使う。ここでは重み(weight)を全部足している  
// まあ、Objectiveの正体がまだよくわかってないんだけどね。。。。
      const score = Object.keys(objectives).reduce((score, key) => {//ここでスコアを計算している？？
        const objective = objectives[key];
        if (objective.checker(G, ctx)) {
          return score + objective.weight;
        }
        return score;
      }, 0);
      // If so, stop and return the score.
      if (score > 0) {
        return { score };
      }
//やれることがなかったら終わり（パス？）
      if (!moves || moves.length == 0) {
        return undefined;
      }
//やれることからどれか1個ランダムに選ぶ
      const id = this.random(moves.length);
      const childState = this.reducer(state, moves[id]);
      state = childState;
//これをdepthのぶん繰り返す
    }
    return state.ctx.gameover;
  }

  private backpropagate(//「逆伝搬」みたいな意味。親のノードの情報を更新する的な。
    node: Node,
    result: { score?: number; draw?: boolean; winner?: PlayerID } = {}
  ) {
    node.visits++;//訪問数を増やす
    if (result.score !== undefined) {
      node.value += result.score;//！！ここにscoreというのが出て来るが、このscoreを「取れたマスの数」にできればよさそう
    }
    if (result.draw === true) {//引き分けなら0.5増やそう
      node.value += 0.5;
    }
    if (
      node.parentAction &&
      result.winner === node.parentAction.payload.playerID//1つ前のアクションが今のプレイヤーの行動なら（自分が勝ったなら？）1増やそう
    ) {
      node.value++;
    }
    if (node.parent) {//さらに親へ伝搬
      this.backpropagate(node.parent, result);
    }
  }

  play(
    state: State,
    playerID: PlayerID
  ): Promise<{ action: BotAction; metadata: Node }> {
    const root = this.createNode({ state, playerID });
    let numIterations = this.getOpt('iterations');
    if (typeof this.iterations === 'function') {
      numIterations = this.iterations(state.G, state.ctx);
    }
    const getResult = () => {//このgetResultと下★にでてくるresultは同じなのか違うのか
      let selectedChild: Node | null = null;
      for (const child of root.children) {
        if (selectedChild == null || child.visits > selectedChild.visits) {
          selectedChild = child;
        }
      }
      const action = selectedChild && selectedChild.parentAction;
      const metadata = root;
      return { action, metadata };
    };
    return new Promise((resolve) => {
      const iteration = () => {
        for (
          let i = 0;
          i < CHUNK_SIZE && this.iterationCounter < numIterations;
          i++
        ) {
          const leaf = this.select(root);
          const child = this.expand(leaf);
          const result = this.playout(child);//★　ここでresultをもらってbackpropagateへ
          this.backpropagate(child, result);
          this.iterationCounter++;
        }
        this.iterationCallback({
          iterationCounter: this.iterationCounter,
          numIterations,
          metadata: root,
        });
      };
      this.iterationCounter = 0;
      if (this.getOpt('async')) {
        const asyncIteration = () => {
          if (this.iterationCounter < numIterations) {
            iteration();
            setTimeout(asyncIteration, 0);
          } else {
            resolve(getResult());
          }
        };
        asyncIteration();
      } else {
        while (this.iterationCounter < numIterations) {
          iteration();
        }
        resolve(getResult());
      }
    });
  }
}