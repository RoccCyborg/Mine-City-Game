
type Tile = 
0x00 |  //Blank
0x01 |  //decoration 1
0x02 |  //decoration 2
0x03 |  //water?
0xFF ;  //Unset
type BuildingID = 
0x0001 |	//Conveyor Belt Facing Right
0x0101 |	//Conveyor Belt Facing Down
0x0201 |	//Conveyor Belt Facing Left
0x0301 |	//Conveyor Belt Facing Up
0x0401 |	//Conveyor Belt Facing Down->Right
0x0501 |	//Conveyor Belt Facing Up->Right
0x0601 |	//Conveyor Belt Facing Right->Down
0x0701 |	//Conveyor Belt Facing Left->Down
0x0801 |	//Conveyor Belt Facing Down->Left
0x0901 |	//Conveyor Belt Facing Up->Left
0x0A01 |	//Conveyor Belt Facing Right->Up
0x0B01 |	//Conveyor Belt Facing Left->Up
0xFFFF ;	//Unset




enum ItemID {
	"base:null",
	"base:coal",
	"base:iron"
}

const rands = {
	x_prime: 1299689,
	y_prime: 1156709,
	hill_x: 89,
	hill_y: 11,
}

let Game = {
	scroll: {
		x: -300,
		y: -300
	}
};

interface ChunkedDataStorage {
	storage: Map<string, Chunk>;
	seed: number;
	format: string;
}

class ChunkedDataStorage {
	constructor(seed:number | null){
		this.storage = new Map();
		this.seed = seed ? seed : 0;
		this.format = consts.VERSION;
	}
	getChunk(tileX:number, tileY:number):Chunk{
		if(this.storage.get(`${Math.floor(tileX / consts.CHUNK_SIZE)},${Math.floor(tileY / consts.CHUNK_SIZE)}`)){
			return this.storage.get(`${Math.floor(tileX / consts.CHUNK_SIZE)},${Math.floor(tileY / consts.CHUNK_SIZE)}`);
		} else {
			return this.generateChunk(Math.floor(tileX / consts.CHUNK_SIZE),Math.floor(tileY / consts.CHUNK_SIZE));
		}
	}
	generateChunk(x:number, y:number){
		this.storage.set(`${x},${y}`, 
			new Chunk(x, y, this.seed)
			.generate()
		);
		console.log(`generated chunk ${x}, ${y}`)
		return this.storage.get(`${x},${y}`);
	}
	tileAt(pixelX:number, pixelY:number):Tile{
		return this.getChunk(
			Math.floor(pixelX/consts.TILE_SIZE),
			Math.floor(pixelY/consts.TILE_SIZE)
		).tileAt(tileToChunk(pixelX/consts.TILE_SIZE), tileToChunk(pixelY/consts.TILE_SIZE));
	}
	tileAt2(tileX:number, tileY:number):Tile{
		return this.getChunk(
			Math.floor(tileX/consts.CHUNK_SIZE),
			Math.floor(tileY/consts.CHUNK_SIZE)
		).tileAt(tileToChunk(tileX), tileToChunk(tileY));
	}
	writeTile(tileX:number, tileY:number, tile:Tile):boolean {
		if(this.getChunk(tileX,tileY)){
			this.getChunk(tileX,tileY).setTile(tileToChunk(tileX), tileToChunk(tileY), tile);
			return true;
		}
		return false;
	}
}

interface Level {
	items: Item[];
	buildings: Building[];
}
class Level extends ChunkedDataStorage {
	constructor(seed:number){
		super(seed);
		this.items = [];
		this.buildings = [];
	}
	buildingIDAt(pixelX:number, pixelY:number):BuildingID{
		return this.getChunk(
			Math.floor(pixelX/consts.TILE_SIZE),
			Math.floor(pixelY/consts.TILE_SIZE)
		).buildingAt(tileToChunk(pixelX/consts.TILE_SIZE), tileToChunk(pixelY/consts.TILE_SIZE));
	}
	addItem(x:number, y:number, id:ItemID){
		let tempitem = new Item(x, y, id, this);
		this.items.push(tempitem);
		return tempitem;
	}
	update(){
		for(var item of this.items){
			item.update();
		}
	}
	writeBuilding(tileX:number, tileY:number, buildingID:BuildingID):boolean {
		if(this.getChunk(tileX,tileY)){
			this.getChunk(tileX,tileY).setBuilding(tileToChunk(tileX), tileToChunk(tileY), buildingID);
			return true;
		}
		return false;
	}
	buildBuilding(tileX:number, tileY:number, building:any):boolean {
		if(this.getChunk(tileX,tileY)){
			let tempBuilding:Building = new building();//because eventually we'll have different building classes ex; class Furnace extends Building; not sure if ts supports this
			this.buildings.push(tempBuilding);
			this.getChunk(tileX,tileY).setBuilding(tileToChunk(tileX), tileToChunk(tileY), tempBuilding.id);
			return true;
		}
		return false;
	}
}

interface Chunk {
	layers: [
		Tile[][],
		BuildingID[][],
		null[][]
	];
	chunkSeed: number;
	x: number;
	y: number;
	seed: number;
}


class Chunk {
	constructor(x:number, y:number, seed:number){
		this.x = x;
		this.y = y;
		this.seed = seed;
		this.chunkSeed = Math.abs(Math.round(
			(x*rands.x_prime) +
			(y*rands.y_prime) +
			(Math.pow(seed % 32, (x + y) % 10) % 16384) + 
			Math.pow(seed, 4) + 
			123456789
			% 2147483648
		));
		this.layers = [
			null,//Ground(ground, dirt)
			null,//Buildings
			null//Reserved
		];

		this.layers[0] = [];
		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[0][x] = [];
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[0][x].push(0xFF);
			}
		}

		this.layers[1] = [];
		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[1][x] = [];
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[1][x].push(0xFFFF);
			}
		}

		this.layers[2] = [];
		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[2][x] = [];
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[2][x].push(null);
			}
		}



		this.chunkSeed = Math.abs(Math.round(
			(this.x*rands.x_prime) +
			(this.y*rands.y_prime) +
			(Math.pow(this.seed % 32, (this.x + this.y) % 10) % 16384) + 
			Math.pow(this.seed, 4) + 
			123456789
			% 2147483648
		));//did I pull this out of my butt? yes.
		return this;
	}
	generate():Chunk {
		//Put down the base
		for(var row in this.layers[0]){
			for(var tile in this.layers[0][row]){
				this.layers[0][row][tile] = 0x00;
			}
		}
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE, 0x02);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE + 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE, 0x01);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE - 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE, 0x01);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE + 1, 0x01);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE - 1, 0x01);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE + 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE + 1, (this.chunkSeed % 4 > 1) ? 0x01 : 0x00);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE + 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE - 1, (this.chunkSeed % 8 > 3) ? 0x01 : 0x00);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE - 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE + 1, (this.chunkSeed % 16 > 7) ? 0x01 : 0x00);
		this.setTile((this.chunkSeed - rands.hill_x) % consts.CHUNK_SIZE - 1, (this.chunkSeed - rands.hill_y) % consts.CHUNK_SIZE - 1, (this.chunkSeed % 32 > 15) ? 0x01 : 0x00);

		return this;
	}
	update():Chunk {
		return this;
	}
	tileAt(x:number, y:number):Tile {
		return this.layers[0]?.[y]?.[x] ?? null;
	}
	buildingAt(x:number, y:number):BuildingID {
		return this.layers[1]?.[y]?.[x] ?? null;
	}
	setTile(x:number, y:number, tile:Tile):boolean {
		if(this.tileAt(x, y) == null){
			return false;
		}
		this.layers[0][y][x] = tile;
		return true;
	}
	setBuilding(x:number, y:number, buildingId:BuildingID):boolean {
		if(this.tileAt(x, y) == null){
			return false;
		}
		this.layers[1][y][x] = buildingId;
		return true;
	}
	display(){
		console.log(`%c Base layer of chunk [${this.x},${this.y}]`, `font-weight: bold;`);
		console.table(this.layers[0]);
	}
}

interface Item {
	id: ItemID;
	x: number;
	y: number;
	level: Level;
}
class Item {
	constructor(x:number, y:number, id:ItemID, level:Level){
		this.id = id;
		this.x = x;
		this.y = y;
		this.level = level;
	}
	update(){
		if(this.level.buildingIDAt(this.x, this.y) % 0x100 == 0x01){//this is basically bit math that says "is the last byte == 01". In other words, "Is this item on a conveyor?"
			switch(this.level.buildingIDAt(this.x, this.y) >> 8){//bit masks ftw, this just grabs the first byte
				//yes I know there's no need to write the ids in hex but why the heck not
				case 0x00:
					this.y = (Math.floor(this.y / consts.TILE_SIZE) * consts.TILE_SIZE) + consts.TILE_SIZE/2;
					this.x += consts.buildings.conveyor.SPEED;
					break;
				case 0x01:
					this.x = (Math.floor(this.x / consts.TILE_SIZE) * consts.TILE_SIZE) + consts.TILE_SIZE/2;
					this.y += consts.buildings.conveyor.SPEED;
					break;
				case 0x02:
					this.x -= consts.buildings.conveyor.SPEED;
					this.y = (Math.floor(this.y / consts.TILE_SIZE) * consts.TILE_SIZE) + consts.TILE_SIZE/2;
					break;
				case 0x03:
					this.x = (Math.floor(this.x / consts.TILE_SIZE) * consts.TILE_SIZE) + consts.TILE_SIZE/2;
					this.y -= consts.buildings.conveyor.SPEED;
					break;
				case 0x04:

					break;
				case 0x05:

					break;
				case 0x06:

					break;
				case 0x07:

					break;
				case 0x08:

					break;
				case 0x09:

					break;
				case 0x0A:

					break;
				case 0x0B:

					break;
			}
		}
	}
}

interface Building{
	x: number;
	y: number;
	id: BuildingID;
}
class Building {
	constructor(tileX:number, tileY: number, id:BuildingID){
		this.x = tileX;
		this.y = tileY;
		this.id = id;
	}
}