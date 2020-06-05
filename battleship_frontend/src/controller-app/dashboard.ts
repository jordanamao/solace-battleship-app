import { EventAggregator } from "aurelia-event-aggregator";
import { Router } from "aurelia-router";
import { GameParams } from "common/game-params";
import { MoveResponseEvent, TopicHelper, GameStart, InternalMoveResult } from "../common/events";
import { bindable, inject } from "aurelia-framework";
import { SolaceClient } from "common/solace-client";
//import { Moverate } from "./moverate";

//Construct that holds the player's scores
class ScoreMap {
  Player1: number;
  Player2: number;
}

class MoveResultMap {
  Player1: MoveResponseEvent;
  Player2: MoveResponseEvent;
}

@inject(SolaceClient, TopicHelper, GameParams, Router, GameStart, EventAggregator)
export class Dashboard {
  private action: string;
  private moveResultMap: MoveResultMap = new MoveResultMap();
  private scoreMap: ScoreMap = new ScoreMap();
  private turnMessage: string;
  

  constructor(private solaceClient: SolaceClient, private topicHelper: TopicHelper, private gameParams: GameParams, private router: Router, private gameStart: GameStart, private ea: EventAggregator) {
    this.scoreMap.Player1 = gameParams.allowedShips;
    this.scoreMap.Player2 = gameParams.allowedShips;
    this.turnMessage = "Player1's Turn";
  }

  attached() {
    //Subscribe to all MOVE-REPLYs from Player1 and Player2 to propogate in the dashboard
    this.solaceClient.subscribe(`${this.topicHelper.prefix}/MOVE-REPLY/*/*`, msg => {
      let moveResponseEvent: MoveResponseEvent = JSON.parse(msg.getBinaryAttachment());
      this.moveResultMap[moveResponseEvent.player] = moveResponseEvent;
    });

    //Aurelia's internal event bus - this event will be triggered after the dashboard animation happens
    this.ea.subscribe(InternalMoveResult, (imr: InternalMoveResult) => {
      if (imr.action == "ship") {
        this.action = "hit";
        this.scoreMap[imr.player] -= 1;
        if (this.scoreMap[imr.player] == 0) {
          this.router.navigateToRoute("game-over", { msg: `${imr.player == "Player1" ? "Player2" : "Player1"} WINS!!!!` });
        }
      } else {
        this.action = "miss";
      }
      this.turnMessage = `${imr.player}'s Turn`;
    });
  }

  detached() {
    // Unsubscribe from all MOVE-REPLY events
    this.solaceClient.unsubscribe(`${this.topicHelper.prefix}/MOVE-REPLY/*/*`);
  }
}
