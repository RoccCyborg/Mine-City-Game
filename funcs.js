/**
 * Utility Functions
 *
 *
 */
//.protptype.
/*interface Array<T> {
    last: Function
}
(Array).prototype.last = function():any{
    return this[this.length - 1];
}*/
let mouseX = 0;
let mouseY = 0;
let mouseIsPressed = false;
let latestMouseEvent = null;
window.onmousemove = (e) => {
    mouseX = e.x;
    mouseY = e.y;
    latestMouseEvent = e;
};
let keysPressed = [];
window.onkeydown = (e) => {
    if (keysPressed.indexOf(e.key.toLowerCase()) == -1) {
        keysPressed.push(e.key.toLowerCase());
    }
};
window.onkeyup = (e) => {
    if (keysPressed.indexOf(e.key.toLowerCase()) != -1) {
        keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
    }
};
window.onmousedown = (e) => { mouseIsPressed = true; latestMouseEvent = e; };
window.onmouseup = (e) => { mouseIsPressed = false; latestMouseEvent = e; };
//general functions
function sq(x) {
    return x * x;
}
const programStart = new Date();
function millis() {
    return (new Date()).valueOf() - programStart.valueOf();
}
function gcd(x, y) {
    if ((typeof x !== 'number') || (typeof y !== 'number')) {
        return false;
    }
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) {
        var t = y;
        y = x % y;
        x = t;
    }
    return x;
}
function random(min, max) {
    if (arguments.length > 2) {
        throw new Error("Too many arguments for random");
    }
    if (arguments.length == 1) {
        max = min;
        min = 0;
    }
    if (arguments.length == 0) {
        min = 0;
        max = 1;
    }
    return Math.random() * (max - min) + min;
}
function range(start, end) {
    let temp = [];
    for (let i = start; i <= end; i++) {
        temp.push(i);
    }
    return temp;
}
function constrain(x, min, max) {
    if (x > max)
        return max;
    if (x < min)
        return min;
    return x;
}
function assert(x) {
    if (!x) {
        throw new Error(x);
    }
}
/**
 * Drawing Functions
 *
 */
var rectMode;
(function (rectMode) {
    rectMode[rectMode["CENTER"] = 0] = "CENTER";
    rectMode[rectMode["CORNER"] = 1] = "CORNER";
})(rectMode || (rectMode = {}));
function rect(x, y, w, h, mode, _ctx) {
    _ctx = _ctx ?? ctx;
    mode = mode ?? rectMode.CORNER;
    if (mode == rectMode.CENTER) {
        _ctx.fillRect(x - w / 2, y - w / 2, w, h);
    }
    else if (mode == rectMode.CORNER) {
        _ctx.fillRect(x, y, w, h);
    }
    else {
        console.warn("invalid mode to rect()");
    }
}
function ellipse(x, y, w, h) {
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
}
/**
 * Game-related functions
 */
let alerts = [];
function _alert(x) {
    alerts.push(x);
}
function loadTextures() {
    for (var element of document.getElementById("textures").children) {
        textures.set(element.id, element);
    }
}
;
function zoom(scaleFactor) {
    scaleFactor = constrain(scaleFactor, 0.9, 1.1);
    if (consts.DISPLAY_SCALE * scaleFactor < 1) {
        scaleFactor = 1 / consts.DISPLAY_SCALE;
    }
    else if (consts.DISPLAY_SCALE * scaleFactor > 5) {
        scaleFactor = 5 / consts.DISPLAY_SCALE;
    }
    consts.DISPLAY_SCALE *= scaleFactor;
    Game.scroll.x -= (innerWidth * 0.5 * (scaleFactor - 1)) / consts.DISPLAY_SCALE;
    Game.scroll.y -= (innerHeight * 0.5 * (scaleFactor - 1)) / consts.DISPLAY_SCALE;
}
window.onwheel = (e) => {
    zoom(Math.pow(1.001, -e.deltaY));
};
function tileToChunk(tileCoord) {
    tileCoord = Math.floor(tileCoord) % consts.CHUNK_SIZE;
    return tileCoord + (tileCoord < 0 ? consts.CHUNK_SIZE : 0);
}
function pixelToTile(pixelCoord) {
    pixelCoord = Math.floor(pixelCoord) % consts.TILE_SIZE;
    return pixelCoord + (pixelCoord < 0 ? consts.TILE_SIZE : 0);
}
var interval1;
function onConsoleOpen() {
    console.log("%c Hey there! It looks like you're checking out the console.\nIf you want to view the source code, *please do it at* https://github.com/BalaM314/Untitled-Electron-Game \n Make sure to view the .ts files as the .js files are compiled and thus look weird.", "color: blue; font-size: 30px;");
    cancelAnimationFrame(interval1);
}
function isConsoleOpen() {
    interval1 = requestAnimationFrame(_ => {
        let x = /lol/;
        x.toString = function () {
            onConsoleOpen();
            return "[object TestingConsoleOpen]";
        };
        //yes really. This is **probably** a bug.
        console.log({ e: x });
    });
}
isConsoleOpen();
