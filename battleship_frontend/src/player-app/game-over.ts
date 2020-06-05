import { SolaceClient } from "common/solace-client";
import { bindable, inject } from "aurelia-framework";

/**
 * Class that represents the Game Over Screen
 * @author Thomas Kunnumpurath
 */
@inject(SolaceClient)
export class GameOver {
  @bindable
  msg: string;

  constructor(private solaceClient: SolaceClient) {}

  activate(params, routeConfig, navigtationInstruction) {
    this.msg = params.msg;
    this.solaceClient.disconnect();
  }
}
