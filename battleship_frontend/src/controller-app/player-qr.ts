import { PlayerName } from "../common/events";
import { bindable } from "aurelia-framework";

/**
 * Represnts the QRCode that a player uses to join
 * @author Thomas Kunnumpurath
 */
export class PlayerQr {
  //Name of the player
  @bindable
  player: PlayerName;
  @bindable
  playerStatus: string;

  //URL of the QR Code image
  playerQRUrl: string;
  //Status message for the player
  status: string;
  //URL for the player joined
  playerJoinUrl: string;
  //sessionId for the player
  @bindable
  sessionId: string;

  /**
   * Aurelia function that is called when the page is loaded
   */
  attached() {
    this.status = `Waiting for ${this.player} to join...`;
    this.playerJoinUrl = `http://${location.host}/join/${this.sessionId}/${this.player}`;
    this.playerQRUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(this.playerJoinUrl)}&amp;size=200x200&amp;color=00CB95&amp;bgcolor=333333`;
  }
}
