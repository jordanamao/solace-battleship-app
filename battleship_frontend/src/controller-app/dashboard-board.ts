import { EventAggregator } from "aurelia-event-aggregator";
import { bindable, inject } from "aurelia-framework";
import { GameParams } from "common/game-params";
import { SolaceClient } from "../common/solace-client";
import { KnownBoardCellState, PlayerName, MoveResponseEvent, TopicHelper, InternalMoveResult } from "../common/events";
import obelisk from "obelisk.js";

/*
 * An interface which defines the board's properties defined by the number of squares per row (units)
 * and a measure of the side of a square (size)
 */
interface BoardProperties {
  units: number;
  size: number;
}

@inject(obelisk, SolaceClient, GameParams, TopicHelper, EventAggregator)
export class DashboardBoard {
  @bindable
  player: PlayerName;
  battleshipCanvas;
  pixelView;
  boardProperties: BoardProperties;
  @bindable moveUpdate: MoveResponseEvent;

  constructor(private obelisk: obelisk, private solaceClient: SolaceClient, private gameParams: GameParams, private topicHelper: TopicHelper, private ea: EventAggregator) {
    //Setting the board to have 5 squares per row with each square measuring 60 pixels
    //Note: Be mindful of modifying these properties as you may need to modify the canvas width
    this.boardProperties = {
      units: this.gameParams.gameboardDimensions,
      size: 60
    };
  }

  /**
   * Triggered when the moveResponseEvent variable changes
   * @param moveResponseEvent the updated value
   * @param oldValue
   */
  moveUpdateChanged(moveResponseEvent: MoveResponseEvent, oldValue: MoveResponseEvent) {
    if (moveResponseEvent != null) {
      console.log(JSON.stringify(moveResponseEvent));
      this.renderBoard(moveResponseEvent.playerBoard);
      this.dropMissile(
        moveResponseEvent.playerBoard,
        moveResponseEvent.move.y,
        this.gameParams.gameboardDimensions - 1 - moveResponseEvent.move.x,
        90,
        0xffffff,
        moveResponseEvent.moveResult == "empty" ? "miss" : "hit"
      );
    }
  }

  attached() {
    let canvas = this.battleshipCanvas;
    let point = new obelisk.Point(300, 100);
    //the center of the screen
    this.pixelView = new obelisk.PixelView(canvas, point);
    this.makeGrid();
  }

  /**
   * Function that renders a missile (a pyramid) on the board
   * @param x x co-ordinate for the missile
   * @param y y co-ordinate for the missile
   * @param z z co-ordinate for the missile
   * @param color color for the missile
   */
  renderMissile(x: number, y: number, z: number, color: number) {
    let dimension = new obelisk.PyramidDimension(60);
    let pyColor = new obelisk.PyramidColor().getByRightColor(obelisk.ColorPattern.YELLOW);
    let pyramid = new obelisk.Pyramid(dimension, pyColor);
    this.pixelView.renderObject(pyramid, new obelisk.Point3D(x, y, z));
  }

  /**
   * A function that renders a colored square to indicate whether the move is a hit or a miss
   * @param x x co-ordinate for the square
   * @param y y co-ordiante for the square
   * @param z z co-ordinate for the square
   * @param color for the square
   */
  renderSquare(x: number, y: number, z: number, color: number) {
    let brickDimension = new obelisk.BrickDimension(this.boardProperties.size, this.boardProperties.size);
    let brickColor = new obelisk.SideColor().getByInnerColor(color);
    let brick = new obelisk.Brick(brickDimension, brickColor);
    this.pixelView.renderObject(brick, new obelisk.Point3D(x, y, z));
  }

  /**
   * A function that renders the board with appropriate state for each of the cells
   * @param cells CellState is a an object that consists of three states (hit, miss, or empty)
   */
  renderBoard(cells: KnownBoardCellState[][]) {
    this.pixelView.clear();
    this.makeGrid();
    for (let i = 0; i < this.boardProperties.units; i++) {
      for (let j = 0; j < this.boardProperties.units; j++) {
        if (cells[i][j] === "hit") {
          this.renderSquare(j * this.boardProperties.size, (this.gameParams.gameboardDimensions - 1 - i) * this.boardProperties.size, 0, 0xff0000);
        } else if (cells[i][j] === "miss") {
          this.renderSquare(j * this.boardProperties.size, (this.gameParams.gameboardDimensions - 1 - i) * this.boardProperties.size, 0, 0x0000ff);
        }
      }
    }
  }

  /**
   * Function that animates the board with the dropMissle animation
   * @param cellState An 2 dimensional array of CellState's that contains the state of every cell in the grid
   * @param missileX The co-ordinate of the missile drop
   * @param missileY The y co-ordinate of the missile drop
   * @param missileZ The z co-ordinate of the missile drop
   * @param color The color of the missile
   */
  dropMissile(cellState: KnownBoardCellState[][], missileX: number, missileY: number, missileZ: number, color: number, moveResult: KnownBoardCellState) {
    this.renderBoard(cellState);
    this.renderMissile(missileX * this.boardProperties.size, missileY * this.boardProperties.size, missileZ, color);
    if (missileZ > -(missileX * missileY)) {
      missileZ -= 5;
      requestAnimationFrame(() => this.dropMissile(cellState, missileX, missileY, missileZ, color, moveResult));
    } else {
      cellState[this.gameParams.gameboardDimensions - 1 - missileY][missileX] = moveResult;
      this.renderBoard(cellState);
      let imr: InternalMoveResult = new InternalMoveResult();
      imr.player = this.player;
      if (moveResult == "hit") {
        imr.action = "ship";
      } else {
        imr.action = "empty";
      }
      this.ea.publish(imr);
    }
  }

  /**
   * The makeGrid function draws the grid based on the properties setup in boardProperties
   */
  makeGrid() {
    let lineColor = new obelisk.LineColor();
    let dimensionX = new obelisk.LineXDimension(this.boardProperties.units * this.boardProperties.size);
    let dimensionY = new obelisk.LineYDimension(this.boardProperties.units * this.boardProperties.size);
    let lineX = new obelisk.LineX(dimensionX, lineColor);
    let lineY = new obelisk.LineY(dimensionY, lineColor);

    // Create Grid:
    for (let x = 0; x < this.boardProperties.units + 1; x++) {
      this.pixelView.renderObject(lineX, new obelisk.Point3D(0, x * this.boardProperties.size, 0));
    }
    for (let y = 0; y < this.boardProperties.units + 1; y++) {
      this.pixelView.renderObject(lineY, new obelisk.Point3D(y * this.boardProperties.size, 0, 0));
    }
  }
}
