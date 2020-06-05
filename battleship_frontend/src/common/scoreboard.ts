import { inject, bindable } from "aurelia-framework";
import { GameParams } from "common/game-params";

/**
 * Class that represents the Scoreboard for the event
 */
@inject(GameParams)
export class Scoreboard {
  //The score for the board
  @bindable
  private score: number;

  constructor(private gameparams: GameParams) {}
}
