import { inject } from "aurelia-framework";
import { Router } from "aurelia-router";
import { SolaceClient } from "common/solace-client";
import { BoardSetEvent, Player, PlayerName, PrivateBoardCellState, KnownBoardCellState, TopicHelper, BoardSetResult } from "../common/events";
import { GameParams } from "common/game-params";

/**
 * Responsible for setting the board
 * @author Thomas Kunnumpurath, Andrew Roberts
 */
@inject(Router, SolaceClient, Player, GameParams, TopicHelper)
export class BoardSet {
  //State for the board
  private boardsSet: number = 0;
  private placedShips: number = 0;
  private donePlacing: boolean = false;
  private error: string = "";

  constructor(private router: Router, private solaceClient: SolaceClient, private player: Player, private gameParams: GameParams, private topicHelper: TopicHelper) {
    // initialize empty boards
    let playerBoard: PrivateBoardCellState[][] = [];
    let knownOpponentBoard: KnownBoardCellState[][] = [];
    for (let i = 0; i < this.gameParams.gameboardDimensions; i++) {
      playerBoard[i] = [];
      knownOpponentBoard[i] = [];
      for (let j = 0; j < this.gameParams.gameboardDimensions; j++) {
        playerBoard[i][j] = "empty";
        knownOpponentBoard[i][j] = "empty";
      }
    }

    this.player.internalBoardState = playerBoard;
    this.player.publicBoardState = knownOpponentBoard;
    this.player.isTurn = false;

    //WARM-UP THE BOARD-SET-REPLY SUBSCRIPTION
    this.solaceClient.subscribeReply(`${this.topicHelper.prefix}/BOARD-SET-REPLY/${this.player.getPlayerNameForTopic()}/CONTROLLER`);

    //SET THE SUBSCRIPTION FOR THE MATCH START
    this.solaceClient.subscribe(`${this.topicHelper.prefix}/MATCH-START/CONTROLLER`, msg => {
      console.log(msg);
      this.router.navigateToRoute("match");
    });
  }

  /**
   * Set the state of the player's board
   * @param row the row for the board piece
   * @param column the column for the board piece
   */
  boardSelectEvent(column: number, row: number) {
    if (!this.donePlacing) {
      // toggle cell state
      if (this.player.internalBoardState[column][row] == "empty") {
        if (this.placedShips >= this.gameParams.allowedShips) {
          alert("No ships remaining, remove one first!");
          return;
        }
        let tmpBoard = JSON.parse(JSON.stringify(this.player.internalBoardState)); // a lazy man's deep copy
        tmpBoard[column][row] = "ship";
        this.player.internalBoardState = tmpBoard;
        ++this.placedShips;
        return;
      }

      let tmpBoard = JSON.parse(JSON.stringify(this.player.internalBoardState));
      tmpBoard[column][row] = "empty";
      this.player.internalBoardState = tmpBoard;
      --this.placedShips;
      return;
    }
  }

  /**
   * Function to begin a match - it publishes a board-set request message and then sets the done placing variable to true
   */
  beginMatch() {
    if (this.placedShips == 5) {
      let boardsetEvent: BoardSetEvent = new BoardSetEvent();
      boardsetEvent.playerName = this.player.name;
      boardsetEvent.shipsSet = this.placedShips;
      //Send the request to set the board
      this.solaceClient
        .sendRequest(
          `${this.topicHelper.prefix}/BOARD-SET-REQUEST/${this.player.getPlayerNameForTopic()}`,
          JSON.stringify(boardsetEvent),
          `${this.topicHelper.prefix}/BOARD-SET-REPLY/${this.player.getPlayerNameForTopic()}/CONTROLLER`
        )
        .then((msg: any) => {
          let boardsetResult: BoardSetResult = JSON.parse(msg.getBinaryAttachment());
          if (boardsetResult.success) {
            this.donePlacing = true;
          } else {
            this.error = "Board Set Action Failed! Please try again!";
          }
        })
        .catch(err => {
          this.error = err;
        });
    }
  }

  detached() {
    //Unsubscribe from the .../BOARD-SET-REPLY event
    this.solaceClient.unsubscribe(`${this.topicHelper.prefix}/BOARD-SET-REPLY/${this.player.getPlayerNameForTopic()}/CONTROLLER`);
    //Unsubscribe from the ../MATCH-START event
    this.solaceClient.unsubscribe(`${this.topicHelper.prefix}/MATCH-START/CONTROLLER`);
  }
}
