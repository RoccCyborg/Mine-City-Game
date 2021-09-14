



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
window.onmousemove = (e:MouseEvent) => {
	mouseX = e.x;
	mouseY = e.y;
	latestMouseEvent = e;
}
let keysPressed:string[] = [];
window.onkeydown = (e:KeyboardEvent) => {
	switch(e.key){
		case "ArrowRight":
			placedBuilding.direction = 0x000; break;
		case "ArrowDown":
			placedBuilding.direction = 0x100; break;
		case "ArrowLeft":
			placedBuilding.direction = 0x200; break;
		case "ArrowUp":
			placedBuilding.direction = 0x300; break;
		case "1":
			placedBuilding.type = 0x0001; break;
		case "2":
			placedBuilding.type = 0x0002; break;
		case "3":
			placedBuilding.type = 0x0003; break;
		case "4":
			placedBuilding.type = 0x0004; break;
		case "5":
			placedBuilding.type = 0x0005; break;
		case "6":
			placedBuilding.type = 0x0006; break;
		case "7":
			placedBuilding.type = 0x0007; break;
		case "0":
			placedBuilding.type = 0xFFFF; break;		
	}
	if(parseInt(e.key)){
		for(var x of document.getElementById("toolbar").children){
			x.classList.remove("selected");
		}
		(document.getElementById("toolbar").children?.[parseInt(e.key) - 1] as HTMLElement)?.classList.add("selected");
	}
	if(keysPressed.indexOf(e.key.toLowerCase()) == -1){
		keysPressed.push(e.key.toLowerCase());
	}
}
window.onkeyup = (e:KeyboardEvent) => {
	if(keysPressed.indexOf(e.key.toLowerCase()) != -1){
		keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
	}
}

window.onmousedown = (e:MouseEvent) => {mouseIsPressed = true; latestMouseEvent = e; canOverwriteBuilding = true;}
window.onmouseup = (e:MouseEvent) => {mouseIsPressed = false; latestMouseEvent = e; canOverwriteBuilding = true;}



//general functions
function sq(x:number):number{
	return x * x;
}
const programStart = new Date();
function millis():number{
	return (new Date()).valueOf() - programStart.valueOf();
}

function gcd(x:number, y:number):any{
	if((typeof x !== 'number') || (typeof y !== 'number')){
		return false;
	}
	x = Math.abs(x);
	y = Math.abs(y);
	while(y) {
		var t = y;
		y = x % y;
		x = t;
	}
	return x;
}
function random(min:number|any[],max:number):number{
	if(typeof min == "number"){
		if(arguments.length > 2){
			throw new Error("Too many arguments for random");
		}
		if(arguments.length == 1){
			max = min;
			min = 0;
		}
		if(arguments.length == 0){
			min = 0;
			max = 1;
		}
		return Math.random()*(max-min) + min;
	} else if(min instanceof Array){
		return min[Math.floor(random(0, min.length + 1))];
	}
}

function range(start:number, end:number){
	let temp = [];
	for(let i = start; i <= end; i ++){
		temp.push(i);
	}
	return temp;
}

function constrain(x:number, min:number, max:number){
	if(x > max) return max;
	if(x < min) return min;
	return x;
}

function assert(x:any){
	if(!x){
		throw new Error(x);
	}
}

/**
 * Drawing Functions
 * 
 */

enum rectMode {
	CENTER,
	CORNER
}

function rect(x:number, y:number, w:number, h:number, mode?:rectMode, _ctx?:CanvasRenderingContext2D){
	if(!_ctx) _ctx = ctx;
	if(mode == rectMode.CENTER){
		_ctx.fillRect(x - w/2, y - w/2, w, h);
	} else {
		_ctx.fillRect(x, y, w, h);
	}
}

function ellipse(x, y, w, h){
	ctx.beginPath();
	ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
	ctx.fill();
}




/**
 * Game-related functions
 */
let alerts = [];
function _alert(x:string | [string,number]){
	alerts.push(x);
}
function loadTextures(){
	for(var element of document.getElementById("textures").children){
		textures.set(element.id, element);
	}
};


function zoom(scaleFactor){
	scaleFactor = constrain(scaleFactor, 0.9, 1.1);
	if(consts.DISPLAY_SCALE * scaleFactor < 1){
		scaleFactor = 1 / consts.DISPLAY_SCALE;
	} else if(consts.DISPLAY_SCALE * scaleFactor > 5){
		scaleFactor = 5 / consts.DISPLAY_SCALE;
	}
	if((consts.DISPLAY_SCALE <= 1 && scaleFactor <= 1)||(consts.DISPLAY_SCALE >= 5 && scaleFactor >= 1)){
		return;
	}
	Game.forceRedraw = true;
	consts.DISPLAY_SCALE *= scaleFactor;
	Game.scroll.x -= (innerWidth * 0.5 * (scaleFactor - 1))/consts.DISPLAY_SCALE;
	Game.scroll.y -= (innerHeight * 0.5 * (scaleFactor - 1))/consts.DISPLAY_SCALE;
}

window.onwheel = (e:WheelEvent) => {
	zoom(Math.pow(1.001, -e.deltaY));
}

function tileToChunk(tileCoord:number):number {
	tileCoord = Math.floor(tileCoord) % consts.CHUNK_SIZE;
	return tileCoord + (tileCoord < 0 ? consts.CHUNK_SIZE : 0);
}

function pixelToTile(pixelCoord:number):number {
	pixelCoord = Math.floor(pixelCoord) % consts.TILE_SIZE;
	return pixelCoord + (pixelCoord < 0 ? consts.TILE_SIZE : 0);
}

var interval1;

function onConsoleOpen(){
	console.log("%c Hey there! It looks like you're checking out the console.\nIf you want to view the source code, *please do it at* https://github.com/BalaM314/Untitled-Electron-Game \n Make sure to view the .ts files as the .js files are compiled and thus look weird.", "color: blue; font-size: 30px;")
	cancelAnimationFrame(interval1);
}

function isConsoleOpen(){
	interval1 = requestAnimationFrame(_ => {
		let x = /lol/;
		x.toString = function(){
			onConsoleOpen();
			return "[object TestingConsoleOpen]";
		};
		//yes really. This is **probably** a bug.
		console.log({e: x});
	});
}

isConsoleOpen();
