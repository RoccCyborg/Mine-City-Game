/*!license
Copyright © <BalaM314>, 2024.
This file is part of Untitled Electron Game.
Untitled Electron Game is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
Untitled Electron Game is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
You should have received a copy of the GNU General Public License along with Untitled Electron Game. If not, see <https://www.gnu.org/licenses/>.
*/
import { consts } from "../vars.js";
export class Intersector {
    static pointInRect([x, y], [rX, rY, rW, rH]) {
        return x >= rX && x < (rX + rW) && y >= rY && y < (rY + rH);
    }
    static rectsIntersect([aX, aY, aW, aH], [bX, bY, bW, bH]) {
        return bX <= aX + aW && aX <= bX + bW && bY <= aY + aH && aY <= bY + bH;
    }
}
export function add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}
export function mul(a, amount) {
    return [a[0] * amount, a[1] * amount];
}
export class Pos {
    constructor(pixelX, pixelY) {
        this.pixelX = pixelX;
        this.pixelY = pixelY;
    }
    static fromPixelCoords(x, y) {
        return new Pos(x, y);
    }
    static fromTileCoords(x, y, centered) {
        return new Pos(this.tileToPixel(x, centered), this.tileToPixel(y, centered));
    }
    get pixel() {
        return [this.pixelX, this.pixelY];
    }
    get tile() {
        return [this.tileXExact, this.tileYExact];
    }
    get tileC() {
        return [this.tileXCentered, this.tileYCentered];
    }
    get pixelXCenteredInTile() {
        return Pos.tileToPixel(this.tileX, true);
    }
    get pixelYCenteredInTile() {
        return Pos.tileToPixel(this.tileY, true);
    }
    get tileX() {
        return Pos.pixelToTile(this.pixelX);
    }
    get tileY() {
        return Pos.pixelToTile(this.pixelY);
    }
    get tileXCentered() {
        return Pos.pixelToTile(this.pixelX) + 0.5;
    }
    get tileYCentered() {
        return Pos.pixelToTile(this.pixelY) + 0.5;
    }
    get tileXExact() {
        return Pos.pixelToTileExact(this.pixelX);
    }
    get tileYExact() {
        return Pos.pixelToTileExact(this.pixelY);
    }
    get tileOffsetXInPixels() {
        return Pos.tileOffsetInPixels(this.pixelX);
    }
    get tileOffsetYInPixels() {
        return Pos.tileOffsetInPixels(this.pixelY);
    }
    get tileOffsetXInTiles() {
        return Pos.tileOffsetInTiles(this.pixelX);
    }
    get tileOffsetYInTiles() {
        return Pos.tileOffsetInTiles(this.pixelY);
    }
    get tileOffsetXCentered() {
        return Pos.tileOffsetInTiles(this.pixelX) == 0.5;
    }
    get tileOffsetYCentered() {
        return Pos.tileOffsetInTiles(this.pixelY) == 0.5;
    }
    get chunkOffsetXInTiles() {
        return Pos.chunkOffsetInTiles(this.tileX);
    }
    get chunkOffsetYInTiles() {
        return Pos.chunkOffsetInTiles(this.tileY);
    }
    get chunkX() {
        return Pos.pixelToChunk(this.pixelX);
    }
    get chunkY() {
        return Pos.pixelToChunk(this.pixelY);
    }
    static pixelToTile(pixelCoord) {
        return Math.floor(pixelCoord / consts.TILE_SIZE);
    }
    static pixelToTileExact(pixelCoord) {
        return pixelCoord / consts.TILE_SIZE;
    }
    static tileToPixel(tileCoord, centered) {
        return (tileCoord + centered * 0.5) * consts.TILE_SIZE;
    }
    static chunkToTile(chunkCoord) {
        return chunkCoord * consts.CHUNK_SIZE;
    }
    static tileToChunk(tileCoord) {
        return Math.floor(tileCoord / consts.CHUNK_SIZE);
    }
    static tileToChunkExact(tileCoord) {
        return Math.floor(tileCoord / consts.CHUNK_SIZE);
    }
    static pixelToChunk(pixelCoord) {
        return Math.floor(pixelCoord / consts.chunkSizeInPixels);
    }
    static chunkToPixel(chunkCoord) {
        return chunkCoord * consts.chunkSizeInPixels;
    }
    static tileOffsetInPixels(pixelCoord) {
        pixelCoord = Math.floor(pixelCoord) % consts.TILE_SIZE;
        return pixelCoord + (pixelCoord < 0 ? consts.TILE_SIZE : 0);
    }
    static tileOffsetInTiles(pixelCoord) {
        pixelCoord = Math.floor(pixelCoord) % consts.TILE_SIZE;
        return (pixelCoord + (pixelCoord < 0 ? consts.TILE_SIZE : 0)) / consts.TILE_SIZE;
    }
    static chunkOffsetInTiles(tileCoord) {
        tileCoord = Math.floor(tileCoord) % consts.CHUNK_SIZE;
        return tileCoord + (tileCoord < 0 ? consts.CHUNK_SIZE : 0);
    }
}
