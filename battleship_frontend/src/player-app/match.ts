import { Move, KnownBoardCellState, MoveResponseEvent, PlayerName, Player, TopicHelper, GameStart } from "../common/events";
import { inject } from "aurelia-framework";
import { Router } from "aurelia-router";
import { SolaceClient } from "../common/solace-client";
import { GameParams } from "../common/game-params";

//type for the state of the page
type PAGE_STATE = "TURN_PLAYER1" | "TURN_PLAYER2";

//Construct that holds the player's scores
class ScoreMap {
  Player1: number;
  Player2: number;
}

/**
 * A class that represents the match for the player.
 *
 * @authors Thomas Kunnumpurath
 */
@inject(Router, SolaceClient, Player, GameParams, TopicHelper, GameStart)
export class Match {
  //Map of the score
  private scoreMap: ScoreMap = new ScoreMap();

  private pageState: PlayerName = "Player1";

  private enemyBoard: KnownBoardCellState[][] = [];

  private turnMessage: string;

  constructor(private router: Router, private solaceClient: SolaceClient, private player: Player, private gameParams: GameParams, private topicHelper: TopicHelper, private gameStart: GameStart) {
    this.scoreMap["Player1"] = this.gameParams.allowedShips;
    this.scoreMap["Player2"] = this.gameParams.allowedShips;
    for (let i = 0; i < gameParams.gameboardDimensions; i++) {
      this.enemyBoard[i] = [];
      for (let j = 0; j < gameParams.gameboardDimensions; j++) {
        this.enemyBoard[i][j] = "empty";
      }
    }

    //Warm up the reply subscription
    this.solaceClient.subscribeReply(`${this.topicHelper.prefix}/MOVE-REPLY/${this.player.getPlayerNameForTopic()}/${this.player.getOtherPlayerNameForTopic()}`);

    // subscribe to the other player's moves here
    this.solaceClient.subscribe(`${this.topicHelper.prefix}/MOVE-REQUEST/${this.player.getOtherPlayerNameForTopic()}`, msg => {
      //De-serialize the received message into a move object
      let move: Move = JSON.parse(msg.getBinaryAttachment());
      //Create a Response object
      let moveResponseEvent: MoveResponseEvent = new MoveResponseEvent();
      //Set the move of the response object to the Move that was requested
      moveResponseEvent.move = move;
      //Set the board of the moveResponse to the current player's public board state
      moveResponseEvent.playerBoard = this.player.publicBoardState;
      //Set the Player of the move response event the name of the player
      moveResponseEvent.player = this.player.name;
      //Check the player's internal board state to find the corresponding
      moveResponseEvent.moveResult = this.player.internalBoardState[move.x][move.y];
      //Send the reply for the move request
      this.solaceClient.sendReply(msg, JSON.stringify(moveResponseEvent));
      //Check the move result and make changes to the score if appropriate and the corresponding icons
      if (this.player.internalBoardState[move.x][move.y] == "ship") {
        this.shipHit(this.player.name);
        this.player.publicBoardState[move.x][move.y] = "hit";
      } else {
        this.player.publicBoardState[move.x][move.y] = "miss";
      }

      this.pageState = this.player.name;
      this.rotateTurnMessage();
    });
  }

  /**
   * Function to rotate the turn page's message
   */
  rotateTurnMessage() {
    if ((this.player.name == "Player1" && this.pageState == "Player1") || (this.player.name == "Player2" && this.pageState == "Player2")) {
      this.turnMessage = "YOUR TURN";
    } else if (this.player.name == "Player1" && this.pageState == "Player2") {
      this.turnMessage = "PLAYER2'S TURN";
    } else {
      this.turnMessage = "PLAYER1'S TURN";
    }
  }

  attached() {
    if (this.player.name == "Player1") {
      this.turnMessage = "YOUR TURN";
    } else {
      this.turnMessage = `PLAYER1'S TURN`;
    }
  }

  //A selection for the board
  boardSelectEvent(column: number, row: number) {
    if (this.player.name == this.pageState && this.enemyBoard[column][row] == "empty") {
      let move: Move = new Move();
      move.x = column;
      move.y = row;
      move.player = this.player.name;
      this.solaceClient
        .sendRequest(
          `${this.topicHelper.prefix}/MOVE-REQUEST/${this.player.getPlayerNameForTopic()}`,
          JSON.stringify(move),
          `${this.topicHelper.prefix}/MOVE-REPLY/${this.player.getPlayerNameForTopic()}/${this.player.getOtherPlayerNameForTopic()}`
        )
        .then((msg: any) => {
          //De-serialize the move response into a moveResponseEvent object
          let moveResponseEvent: MoveResponseEvent = JSON.parse(msg.getBinaryAttachment());
          //Update the current player's enemy board's state
          this.enemyBoard = moveResponseEvent.playerBoard;
          //Update the approrpaite score/icons based on the move response
          if (moveResponseEvent.moveResult == "ship") {
            this.enemyBoard[move.x][move.y] = "hit";
            this.shipHit(this.player.name == "Player1" ? "Player2" : "Player1");
          } else {
            this.enemyBoard[move.x][move.y] = "miss";
          }
          //Change the page state
          this.pageState = this.player.name == "Player1" ? "Player2" : "Player1";
          //Rotate the turn message
          this.rotateTurnMessage();
        })
        .catch(failedMessage => {
          console.log(failedMessage);
          this.turnMessage += " ...TRY AGAIN!";
        });
    }
  }

  /**
   * Function to decrement the score for a player if a ship is hit
   * @param shipHitOwner the player of the ship that was hit
   */
  shipHit(shipHitOwner: PlayerName) {
    this.scoreMap[shipHitOwner]--;
    if (this.scoreMap[shipHitOwner] == 0) {
      if (shipHitOwner == this.player.name) {
        this.router.navigateToRoute("game-over", { msg: "YOU LOSE!" });
      } else {
        this.router.navigateToRoute("game-over", { msg: "YOU WON!" });
      }
    }
  }

  detached() {
    //Unsubcsribe for the events
    this.solaceClient.unsubscribe(`${this.topicHelper.prefix}/MOVE-REQUEST/${this.player.getOtherPlayerNameForTopic()}`);
    this.solaceClient.unsubscribe(`${this.topicHelper.prefix}/MOVE-REPLY/${this.player.getPlayerNameForTopic()}/${this.player.getOtherPlayerNameForTopic()}`);
  }
}
