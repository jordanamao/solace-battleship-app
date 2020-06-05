import { EventAggregator } from "aurelia-event-aggregator";
import { InternalMoveResult } from "../common/events";
import { inject } from "aurelia-framework";

@inject(EventAggregator)
export class moverate {

  private moveCount1: number;
  private moveRate1: number;
  private moveCount2: number;
  private moveRate2: number;

  constructor(private ea: EventAggregator) {
    this.moveCount1 = 0;
    this.moveCount2 = 0;
  }

  attached() {
    //Aurelia's internal event bus - this event will be triggered after the dashboard animation happens
    this.ea.subscribe(InternalMoveResult, (imr: InternalMoveResult) => {

      if(imr.player == "Player1") {
        this.moveCount1++;
        this.moveRate1 = this.moveCount1/25*100;
      } else {
        this.moveCount2++;
        this.moveRate2 = this.moveCount2/25*100;
      }

    });
  }

}
