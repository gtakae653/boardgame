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
  /** ���̃m�[�h���\���Q�[���̏�� */
  state: State;
  /** �e�m�[�h�i�O�^�[���̏�ԁj */
  parent?: Node;
  /** �e�m�[�h���炱�̃m�[�h�ɂ��ǂ蒅�����Ƃ��ɂƂ����s�� */
  parentAction?: BotAction;
  /** �܂��Ƃ��Ă��Ȃ��s�� */
  actions: BotAction[];
  /** ���݂̖ڕW�i�H�j */
  objectives: Objectives | Objectives[];
  /** �q�m�[�h�i���̃^�[���̃m�[�h�j */
  children: Node[];
  /** ���̃m�[�h��ʉ߂����V�~�����[�V�����̐� */
  visits: number;
  /** ���̃m�[�h��ʉ߂��ď������� */
  value: number;
}

interface Objective {
  //  �Q�[���ƃR���e�L�X�g���� true/ false��Ԃ�
  checker: (G: any, ctx: Ctx) => boolean;
  weight: number;//�d��
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
 // �Q�[���̏�Ԃ��ǂ̃v���C���[�̃^�[�����A�Ƃ���^�����Objective�̈ꗗ�i���ʒB�����ׂ��ڕW�H�j��Ԃ��֐�
  private objectives: (G: any, ctx: Ctx, playerID: PlayerID) => Objectives;
 // �J��Ԃ����񐔂ƃm�[�h��^������Ɖ���������֐��i�������ĂȂ񂾂낤�j
  private iterationCallback: (data: {
    iterationCounter: number;
    numIterations: number;
    metadata: Node;
  }) => void;
  private reducer: Reducer;//Reducer�́A���̕��̃\�[�X������ƁA�ǂ���炠��m�[�h����q�m�[�h�i���̃^�[���̏�ԁj����肾�����u�̂悤�ł��B
  iterations: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);//�J��Ԃ��񐔁B���ڒl���w�肵�Ă��������ǁA�Q�[���̏�Ԃɂ���āu���Ɖ���J��Ԃ����v���֐��ŕԂ��Ă��悢�B
  playoutDepth?: number | ((G: any, ctx: Ctx, playerID?: PlayerID) => number);//�J��Ԃ��̐[��

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

  //����m�[�h����H��鎟�̎q�m�[�h��I������H
  private select(node: Node) {
    // This node has unvisited children.
    //���̃m�[�h�ɂ͂܂��H���Ă��Ȃ��q�m�[�h������(�܂��Ƃ��Ă��Ȃ��s��������j
    if (node.actions.length > 0) {
      return node;//�Ȃ�A���̃m�[�h��I�ԁi�L�΂��b�オ���邩��H�j
    }
    // This is a terminal node.//���̃m�[�h�͏I�[�ł���
    if (node.children.length == 0) {
      return node;//�Ȃ�A���̃m�[�h��I�ԁi�������Ă��邩��H�j
    }
    // ���̎��_�Ŏc���Ă���̂́u�I�[�ł͂Ȃ����ǁA�S���̎q����H���Ă���`�Ղ�������́v
    let selectedChild = null;
    let best = 0;
    for (const child of node.children) {//�S���̎q�m�[�h�ɂ��Č��Ă݂悤
      // Number.EPSILON�́uJavaScript�ŕ\���ł���ł����������̒l: 10^-16���炢�H�v�B
      // child.visits��0�̂Ƃ��Ɋ���Ȃ��Ȃ邱�Ƃւ̑΍�
      const childVisits = child.visits + Number.EPSILON;
      const uct =
        child.value / childVisits + // child.value���]���֐����ۂ��B���������̎��_�ł́u���̃m�[�h�̎q���ɁA����������������邩�v�Ƃ����l
        Math.sqrt((2 * Math.log(node.visits)) / childVisits);
      if (selectedChild == null || uct > best) {//�����΂񂢂���𗊂�
        best = uct;
        selectedChild = child;
      }
    }
    return this.select(selectedChild);//��������A����ɉ���H��
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
    let playoutDepth = this.getOpt('playoutDepth');//���Ƃǂꂭ�炢�H�邩���v�Z
    if (typeof this.playoutDepth === 'function') {
      playoutDepth = this.playoutDepth(state.G, state.ctx);
    }
    for (let i = 0; i < playoutDepth && state.ctx.gameover === undefined; i++) {
      const { G, ctx } = state;
      let playerID = ctx.currentPlayer;
      if (ctx.activePlayers) {
        playerID = Object.keys(ctx.activePlayers)[0];
      }
//���̏�Ԃŉ\�ȍs����S�����׏グ��
      const moves = this.enumerate(G, ctx, playerID);
      // Check if any objectives are met.
      //�ǂꂩ1�ڕW��B�����Ă���΂�����Ԃ�
      const objectives = this.objectives(G, ctx, playerID);
      // Object.keys({a:3, b:5}) -> ["a","b"] �݂����ɑ����̔z���Ԃ�
      // reduce�͍��v���v�Z����悤�ȂƂ��Ɏg���B�����ł͏d��(weight)��S�������Ă���  
// �܂��AObjective�̐��̂��܂��悭�킩���ĂȂ��񂾂��ǂˁB�B�B�B
      const score = Object.keys(objectives).reduce((score, key) => {//�����ŃX�R�A���v�Z���Ă���H�H
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
//���邱�Ƃ��Ȃ�������I���i�p�X�H�j
      if (!moves || moves.length == 0) {
        return undefined;
      }
//���邱�Ƃ���ǂꂩ1�����_���ɑI��
      const id = this.random(moves.length);
      const childState = this.reducer(state, moves[id]);
      state = childState;
//�����depth�̂Ԃ�J��Ԃ�
    }
    return state.ctx.gameover;
  }

  private backpropagate(//�u�t�`���v�݂����ȈӖ��B�e�̃m�[�h�̏����X�V����I�ȁB
    node: Node,
    result: { score?: number; draw?: boolean; winner?: PlayerID } = {}
  ) {
    node.visits++;//�K�␔�𑝂₷
    if (result.score !== undefined) {
      node.value += result.score;//�I�I������score�Ƃ����̂��o�ė��邪�A����score���u��ꂽ�}�X�̐��v�ɂł���΂悳����
    }
    if (result.draw === true) {//���������Ȃ�0.5���₻��
      node.value += 0.5;
    }
    if (
      node.parentAction &&
      result.winner === node.parentAction.payload.playerID//1�O�̃A�N�V���������̃v���C���[�̍s���Ȃ�i�������������Ȃ�H�j1���₻��
    ) {
      node.value++;
    }
    if (node.parent) {//����ɐe�֓`��
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
    const getResult = () => {//����getResult�Ɖ����ɂłĂ���result�͓����Ȃ̂��Ⴄ�̂�
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
          const result = this.playout(child);//���@������result���������backpropagate��
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