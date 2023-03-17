/*
	Main classes.
*/



class Level {
	resources: {
		[index: string]: number
	}
	storage: Map<string, Chunk>;
	seed: number;
	format: string;
	uuid: string;
	constructor(data:number|LevelData){
		this.storage = new Map<string, Chunk>();
		this.format = consts.VERSION;
		this.resources = {};
		if(typeof data != "object"){
			this.seed = data ?? 0;
			this.uuid = Math.random().toString().substring(2);
			this.generateNecessaryChunks();
			this.buildBuilding(0, 0, ["base_resource_acceptor", 0]);
			this.buildBuilding(0, -1, ["base_resource_acceptor", 0]);
			this.buildBuilding(-1, 0, ["base_resource_acceptor", 0]);
			this.buildBuilding(-1, -1, ["base_resource_acceptor", 0]);
		} else {
			// Generate a level from JSON
			let {chunks, resources, seed, version, uuid} = data;
			this.seed = seed;
			this.resources = resources;
			this.uuid = uuid;
			let position, chunkData;
			try {
				for([position, chunkData] of Object.entries(chunks)){
					chunkData.version = version;
					this.storage.set(position, new Chunk({
						x: parseInt(position.split(",")[0]), y: parseInt(position.split(",")[1]),
						seed: seed, parent: this
					}, chunkData).generate());
					//Generate a chunk with that data
				}
			} catch(err){
				throw new Error(`Error loading chunk ${position}: ${parseError(err)}`)
			}

		}
	}
	hasChunk(tileX:number, tileY:number):boolean {
		return !! this.storage.get(`${Pos.tileToChunk(tileX)},${Pos.tileToChunk(tileY)}`);
	}
	getChunk(tileX:number, tileY:number):Chunk {
		if(!this.hasChunk(tileX, tileY)){
			this.generateChunk(Pos.tileToChunk(tileX), Pos.tileToChunk(tileY));
		}
		return this.storage.get(`${Pos.tileToChunk(tileX)},${Pos.tileToChunk(tileY)}`)!;
	}
	generateChunk(x:number, y:number){
		if(this.storage.get(`${x},${y}`)){
			return;
		}
		this.storage.set(`${x},${y}`, 
			new Chunk({x, y, seed: this.seed, parent: this})
			.generate()
		);
	}
	generateNecessaryChunks(){
		let [chunkX, chunkY] = Camera.unproject(0, 0).map(Pos.pixelToChunk) as [number, number]
		const xOffsets = [0, 1, 2, 3, 4];
		const yOffsets = [0, 1, 2];
		for(const xOffset of xOffsets){
			for(const yOffset of yOffsets){
				this.generateChunk(chunkX + xOffset, chunkY + yOffset);
			}
		}
		//good enough
	}

	tileAtByPixel(pixelX:number, pixelY:number):TileID{
		return this.getChunk(
			Pos.pixelToTile(pixelX),
			Pos.pixelToTile(pixelY)
		).tileAt(Pos.chunkOffsetInTiles(Pos.pixelToTile(pixelX)), Pos.chunkOffsetInTiles(Pos.pixelToTile(pixelY)));
	}
	tileAtByTile(tileX:number, tileY:number):TileID{
		return this.getChunk(
			tileX,
			tileY
		).tileAt(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY));
	}
	setTileByTile(tileX:number, tileY:number, tile:TileID):boolean {
		this.getChunk(tileX,tileY).setTile(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY), tile);
		Game.forceRedraw = true;
		return true;
	}
	buildingAtTile(tileX:number, tileY:number):Building | null {
		return this.getChunk(
			tileX,
			tileY
		).buildingAt(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY));
	}
	buildingAtPixel(pixelX:number, pixelY:number):Building | null {
		return this.getChunk(
			Pos.pixelToTile(pixelX),
			Pos.pixelToTile(pixelY)
		).buildingAt(Pos.chunkOffsetInTiles(Pos.pixelToTile(pixelX)), Pos.chunkOffsetInTiles(Pos.pixelToTile(pixelY)));
	}
	buildingAtPos(pos:Pos):Building | null {
		return this.getChunk(
			pos.tileX,
			pos.tileY
		).buildingAt(pos.chunkOffsetXInTiles, pos.chunkOffsetYInTiles);
	}
	overlayBuildAtTile(tileX:number, tileY:number):OverlayBuild | null {
		return this.getChunk(
			Math.floor(tileX),
			Math.floor(tileY)
		).overlayBuildAt(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY));
	}
	overlayBuildAtPos(pos:Pos):OverlayBuild | null {
		return this.getChunk(
			pos.tileX,
			pos.tileY
		).overlayBuildAt(pos.chunkOffsetXInTiles, pos.chunkOffsetYInTiles);
	}
	writeBuilding(tileX:number, tileY:number, building:Building | null):boolean {
		if(this.getChunk(tileX,tileY)){
			this.getChunk(tileX,tileY).setBuilding(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY), building);
			Game.forceRedraw = true;
			return true;
		}
		return false;
	}
	writeOverlayBuild(tileX:number, tileY:number, building:OverlayBuild | null):boolean {
		if(this.getChunk(tileX,tileY)){
			this.getChunk(tileX,tileY).setOverlayBuild(Pos.chunkOffsetInTiles(tileX), Pos.chunkOffsetInTiles(tileY), building);
			Game.forceRedraw = true;
			return true;
		}
		return false;
	}
	
	
	displayGhostBuilding(tileX:number, tileY:number, buildingID:BuildingIDWithMeta, currentframe:CurrentFrame){
		if(!this.hasChunk(tileX, tileY)) return;
		Gfx.layer("ghostBuilds");
		//TODO this should probably be different method
		if(keybinds.placement.break_building.isHeld()){
			Gfx.alpha(0.9);
			Gfx.tImage(Gfx.texture("misc/invalidunderlay"), tileX, tileY, 1, 1);
			Gfx.alpha(1);
		}
		if(buildingID[0] == "base_null") return;

		let changedID:BuildingIDWithMeta = [buildingID[0], buildingID[1]];
		changedID[1] = Buildings.get(buildingID[0]).changeMeta(changedID[1], tileX, tileY, this);
		let textureSize = Buildings.get(buildingID[0]).textureSize(buildingID[1]);

		//Draw underlay
		let isError = !Buildings.get(changedID[0]).canBuildAt(tileX, tileY, this);
		let underlayTextureSize = textureSize[0][0] == textureSize[0][1] ? textureSize : [[1, 1], [0, 0]];
		Gfx.tImage(isError ? Gfx.texture("misc/invalidunderlay") : Gfx.texture("misc/ghostunderlay"), tileX + underlayTextureSize[1][0], tileY + underlayTextureSize[1][1], underlayTextureSize[0][0], underlayTextureSize[0][1]);

		Gfx.alpha(0.7);
		Building.prototype.display.bind({
			pos: Pos.fromTileCoords(tileX, tileY, false),
			meta: changedID[1],
			level: this,
			block: {
				animated: false,
				id: changedID[0]
			},
			stringID: Building.prototype.stringID
		})(currentframe, "ghostBuilds");
		Gfx.alpha(1);

	}

	breakBuilding(tileX:number, tileY:number){
		function safeBreak(build:Building | null){
			if(build && !build.block.immutable) build.break();
		}
		safeBreak(this.buildingAtTile(tileX, tileY));
		safeBreak(this.overlayBuildAtTile(tileX, tileY));
	}
	buildBuilding(tileX:number, tileY:number, buildingID:BuildingIDWithMeta):boolean {
		if(this.buildingAtTile(tileX, tileY)?.block.immutable) return false;

		if(buildingID[0] == "base_null"){
			return true;
		}
		const block = Buildings.get(buildingID[0]);

		//Only overwrite the same building once per build attempt.
		//Otherwise, you could constantly overwrite a building on every frame you tried to build, which is not good.
		if(block.isOverlay){
			if(this.overlayBuildAtTile(tileX, tileY)?.block.id == buildingID[0] && this.overlayBuildAtTile(tileX, tileY)?.meta == buildingID[1]){
				if(!canOverwriteBuilding) return false;
				canOverwriteBuilding = false;
			}
			this.overlayBuildAtTile(tileX, tileY)?.break();
		} else {
			if(this.buildingAtTile(tileX, tileY)?.block.id == buildingID[0] && this.buildingAtTile(tileX, tileY)?.meta == buildingID[1]){
				if(!canOverwriteBuilding) return false;
				canOverwriteBuilding = false;
			}
			this.buildingAtTile(tileX, tileY)?.break();
		}

		if(block.canBuildAt(tileX, tileY, this)){
			trigger(triggerType.placeBuilding, buildingID[0]);
			if(block.prototype instanceof MultiBlockController){
				//Multiblock handling
				const _block = block as typeof MultiBlockController;
				const offsets = MultiBlockController.getOffsetsForSize(..._block.multiblockSize);
				//todo dubious
				const multiblockSecondary = Buildings.get("base_multiblock_secondary") as typeof MultiBlockSecondary;
				
				//Break all the buildings under
				for(const [xOffset, yOffset] of offsets){
					const buildUnder = this.buildingAtTile(tileX + xOffset, tileY + yOffset);
					//if(buildUnder?.block.immutable) return false;
					buildUnder?.break();
				}
				
				//Create buildings
				let controller = new _block(tileX, tileY, buildingID[1], this);
				controller.secondaries = offsets.map(([x, y]) => new multiblockSecondary(tileX + x, tileY + y, 0, this));
				//Link buildings
				controller.secondaries.forEach(secondary => secondary.controller = controller);
				//Write buildings
				this.writeBuilding(tileX, tileY, controller);
				controller.secondaries.forEach(secondary => this.writeBuilding(secondary.pos.tileX, secondary.pos.tileY, secondary));
				return true;
			} else {
				const building = new block(
					tileX, tileY,
					block.changeMeta(buildingID[1], tileX, tileY, this), this
				);
				if(building instanceof OverlayBuild){
					return this.writeOverlayBuild(tileX, tileY, building);
				} else {
					return this.writeBuilding(tileX, tileY, building);
				}
			}
		} else {
			trigger(triggerType.placeBuildingFail, buildingID[0]);
			return false;
		}
	}

	update(currentFrame:CurrentFrame){
		for(let chunk of this.storage.values()){
			chunk.update(currentFrame);
		}
	}
	display(currentframe:Object):void {
		
		//Instantly returns in the display method if offscreen.
		for(let chunk of this.storage.values()){
			chunk.display(currentframe);
		}
		
	}
	displayTooltip(mousex:number, mousey:number, currentframe:CurrentFrame){
		if(!currentframe.tooltip){return;}
		const [x, y] = Camera.unproject(mousex, mousey);
		Gfx.layer("overlay");
		Gfx.font("16px monospace");
		let building = this.buildingAtPixel(x, y);
		if(building instanceof Building){
			let buildingID = building.block.id;
			if(building.block.displaysItem && building.item){
				let item = this.buildingAtPixel(x, y)!.item;
				if(item && (Math.abs(item.pos.pixelX - x) < consts.ITEM_SIZE / 2) && Math.abs(item.pos.pixelY - y) < consts.ITEM_SIZE / 2){
					//If the item is within 8 pixels of the cursor
					Gfx.fillColor("#0033CC");
					Gfx.rect(mousex, mousey, (names.item[item.id] ?? item.id).length * 10, 16);
					Gfx.strokeColor("#000000");
					Gfx.lineRect(mousex, mousey, (names.item[item.id] ?? item.id).length * 10, 16);
					Gfx.fillColor("#FFFFFF");
					Gfx.text((names.item[item.id] ?? item.id), mousex + 2, mousey + 10);
					return;
				}
			}
			Gfx.fillColor("#0033CC");
			Gfx.rect(mousex, mousey, (names.building[buildingID] ?? buildingID).length * 10, 16);
			Gfx.strokeColor("#000000");
			Gfx.lineRect(mousex, mousey, (names.building[buildingID] ?? buildingID).length * 10, 16);
			Gfx.fillColor("#FFFFFF");
			Gfx.text((names.building[buildingID] ?? buildingID), mousex + 2, mousey + 10);
			return;
		}
		let tileID = this.tileAtByPixel(x, y);
		Gfx.fillColor("#0033CC");
		Gfx.rect(mousex, mousey, (names.tile[tileID] ?? tileID).length * 10, 16);
		Gfx.strokeColor("#000000");
		Gfx.lineRect(mousex, mousey, (names.tile[tileID] ?? tileID).length * 10, 16);
		Gfx.fillColor("#FFFFFF");
		Gfx.text((names.tile[tileID] ?? tileID), mousex + 2, mousey + 10);
		return;
	}
	export():LevelData {
		//Exports the level's data to JSON.
		let chunkOutput:Record<string, ChunkData> = {};
		for(let [position, chunk] of this.storage.entries()){
			let output = chunk.export();
			if(output){
				chunkOutput[position] = output;
			}
		}


		return {
			chunks: chunkOutput,
			resources: this.resources,
			seed: this.seed,
			version: consts.VERSION,
			uuid: this.uuid
		};
	}
}





class Chunk {
	layers: [
		TileID[][],
		(Building | null)[][],
		(OverlayBuild | null)[][]
	];
	_generator: Generator<{
    value: number;
    chance(amount: number): boolean;
	}, never>;
	x: number;
	y: number;
	chunkSeed: number;
	parent: Level;
	hasBuildings: boolean = false;
	constructor({x, y, seed, parent}: { x: number; y: number; seed: number; parent: Level;}, data?:ChunkData){
		this.x = x;
		this.y = y;
		this.parent = parent;
		//Don't allow x or y to be zero
		let tweakedX = x == 0 ? 5850 : x;
		let tweakedY = y == 0 ? 9223 : y;
		this.chunkSeed = Math.abs(
			(((tweakedX) ** 3) * (tweakedY ** 5) + 3850 + ((seed - 314) * 11)) % (2 ** 16)
		);
		//A very sophisticated algorithm that I definitely didn't just make up

		this._generator = pseudoRandom(this.chunkSeed);
		this.layers = [
			new Array(consts.CHUNK_SIZE),
			new Array(consts.CHUNK_SIZE),
			new Array(consts.CHUNK_SIZE)
		];

		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[0][x] = new Array(consts.CHUNK_SIZE);
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[0][x][z] = "base_null";
			}
		}

		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[1][x] = new Array(consts.CHUNK_SIZE);
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[1][x][z] = null;
			}
		}

		for(let x = 0; x < consts.CHUNK_SIZE; x ++){
			this.layers[2][x] = new Array(consts.CHUNK_SIZE);
			for(let z = 0; z < consts.CHUNK_SIZE; z ++){
				this.layers[2][x][z] = null;
			}
		}

		if(data){
			//Import a chunk from JSON data.
			//TODO 🚮
			if(+data.version.split(" ")[1].replaceAll(".", "") < 200){
				(data as any).layers = data;
			}
			for(let y in data.layers[0]){
				for(let x in data.layers[0][y]){
					let _buildingData = data.layers[0][y][x] as BuildingData | LegacyBuildingData | null;
					if(!_buildingData) continue;
					this.hasBuildings = true;
					let buildingData:BuildingData;
					if(+data.version.split(" ")[1].replaceAll(".", "") <= 200){
						_buildingData.id = hex(_buildingData.id as any as number, 4) as LegacyBuildingID;
					}
					if(+data.version.split(" ")[1].replaceAll(".", "") < 300){
						buildingData = {
							..._buildingData,
							id: mapLegacyRawBuildingID(getLegacyRawBuildingID((_buildingData as LegacyBuildingData).id)),
							meta: +(_buildingData as LegacyBuildingData).id >> 8
						}
						//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa I am still looking forward to beta when I can throw out these garbage formats
					} else buildingData = _buildingData as BuildingData;
					let tempBuilding:Building;
					try {
						tempBuilding = new (Buildings.get(buildingData.id))(
							parseInt(x) + (consts.CHUNK_SIZE * this.x),
							parseInt(y) + (consts.CHUNK_SIZE * this.y),
							buildingData.meta, this.parent
						);
					} catch(err){
						console.error(err);
						throw new Error(`Failed to import building id ${stringifyMeta(buildingData.id, buildingData.meta)} at position ${x},${y} in chunk ${this.x},${this.y}. See console for more details.`);
					}
					if(buildingData.item){
						//If the building has an item, spawn it in.
						tempBuilding.item = new Item(buildingData.item.x, buildingData.item.y, buildingData.item.id);
					}
					if(buildingData.inv && tempBuilding instanceof StorageBuilding){
						//If the building has an inventory, spawn in the items.
						for(let itemData of buildingData.inv){
							let tempItem = new Item(itemData.x, itemData.y, itemData.id);
							tempBuilding.inventory.push(tempItem);
						}
					}
					this.layers[1][y][x] = tempBuilding;
				}
			}

			//Same as above but for overlay builds.
			for(let y in data.layers[1]){
				for(let x in data.layers[1][y]){
					let _buildingData = data.layers[1][y][x] as BuildingData | LegacyBuildingData | null;
					if(!_buildingData) continue;
					this.hasBuildings = true;
					let buildingData:BuildingData;
					if(+data.version.split(" ")[1].replaceAll(".", "") <= 200){
						_buildingData.id = hex(_buildingData.id as any as number, 4) as LegacyBuildingID;
					}
					if(+data.version.split(" ")[1].replaceAll(".", "") < 300){
						buildingData = {
							..._buildingData,
							id: mapLegacyRawBuildingID(getLegacyRawBuildingID((_buildingData as LegacyBuildingData).id)),
							meta: +(_buildingData as LegacyBuildingData).id >> 8
						}
						//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa I am still looking forward to beta when I can throw out these garbage formats
					} else buildingData = _buildingData as BuildingData;
					let tempBuilding = new (Buildings.get(buildingData.id))(
						parseInt(x) + (consts.CHUNK_SIZE * this.x),
						parseInt(y) + (consts.CHUNK_SIZE * this.y),
						buildingData.meta, this.parent
					) as OverlayBuild;
					if(buildingData.item && +data.version.split(" ")[1].replaceAll(".", "") >= 130){
						//AAAAAAAAAAAAAAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaAAA
						tempBuilding.item = new Item(buildingData.item.x, buildingData.item.y, buildingData.item.id);
					}
					this.layers[2][y][x] = tempBuilding;
				}
			}
		}

		return this;
	}
	update(currentFrame:CurrentFrame):Chunk {
		if(!this.hasBuildings) return this;
		for(let i = 0; i < consts.CHUNK_SIZE; i ++){
			for(let j = 0; j < consts.CHUNK_SIZE; j ++){
				if(this.layers[1][i][j]){
					this.layers[1][i][j]!.update(currentFrame);
				}
			}
		}
		for(let i = 0; i < consts.CHUNK_SIZE; i ++){
			for(let j = 0; j < consts.CHUNK_SIZE; j ++){
				if(this.layers[2][i][j]){
					this.layers[2][i][j]!.update(currentFrame);
				}
			}
		}
		return this;
	}
	tileAt(tileX:number, tileY:number):TileID {
		return this.layers[0][tileY]?.[tileX] ?? (() => {throw new Error(`Tile ${tileX}, ${tileY} does not exist!`)})();
	}
	buildingAt(tileX:number, tileY:number):Building | null {
		return this.layers[1][tileY]?.[tileX] ?? null;
	}
	overlayBuildAt(tileX:number, tileY:number):OverlayBuild | null {
		return this.layers[2][tileY]?.[tileX] ?? null;
	}
	setTile(tileX:number, tileY:number, value:TileID):boolean {
		try {
			this.tileAt(tileX, tileY);
		} catch(err){
			return false;
		}
		this.layers[0][tileY][tileX] = value;
		return true;
	}
	setBuilding(tileX:number, tileY:number, value:Building | null):boolean {
		if(this.tileAt(tileX, tileY) == null){
			return false;
		}
		this.layers[1][tileY][tileX] = value;
		if(value instanceof Building) this.hasBuildings = true;
		return true;
	}
	setOverlayBuild(tileX:number, tileY:number, value:OverlayBuild | null):boolean {
		if(this.tileAt(tileX, tileY) == null){
			return false;
		}
		this.layers[2][tileY][tileX] = value;
		if(value instanceof Building) this.hasBuildings = true;
		return true;
	}
	/**
	 * @deprecated
	 */
	displayToConsole(){
		console.log(`%c Base layer of chunk [${this.x},${this.y}]`, `font-weight: bold;`);
		console.table(this.layers[0]);
		//The oldest method in this program. Was used a very long time ago.
	}
	generator(){
		return this._generator.next().value;
	}
	generate():Chunk {
		//This... needs to be refactored.  TODO
		let isWet = false;
		let isHilly = false;

		let distanceFromSpawn = Math.sqrt(this.x **2 + this.y **2);
		let distanceBoost = constrain(Math.log((distanceFromSpawn / generation_consts.ore_scale) + 0.5)/2, 0, 0.6);
		//A value added to the perlin noise on each tile to make the amount of stone/ore increase, scales as you go further out.

		if(this.generator().chance(0.07) && distanceFromSpawn > generation_consts.min_water_chunk_distance){
			isWet = true;
		} else if(distanceBoost > generation_consts.hilly.terrain_cutoff){
			isHilly = true;
		}
		
		if(isWet){//Generator for wet chunks.
			for(let row in this.layers[0]){
				for(let tile in this.layers[0][row]){
					//Choose the tile to be placed:
					if(row == "0" || row == "15" || tile == "0" || tile == "15"){
						this.layers[0][row][tile] = "base_water";//If on edge, place water
					} else if(row == "1" || row == "14" || tile == "1" || tile == "14"){
						this.layers[0][row][tile] = this.generator().chance(0.5) ? "base_water" : "base_stone";//If near edge, place 50-50 stone or water		
					} else {
						this.layers[0][row][tile] = 
						this.generator().chance(0.1) ?
						(this.generator().chance(0.3) ? "base_ore_iron" : "base_ore_coal")
						: "base_stone";
						//Otherwise, stone, iron, or coal.
					}
				}
			}
		} else if(isHilly){
			//Hilly terrain generator:
			//Based on perlin noise.

			//Chooses which ore to generate based on RNG and ditance from spawn.
			let oreToGenerate:TileID;
			let oreRand = this.generator();
			if(distanceFromSpawn < generation_consts.hilly.min_iron_distance){
				oreToGenerate = "base_ore_coal";
			} else if(distanceFromSpawn < generation_consts.hilly.min_copper_distance){
				oreToGenerate = oreRand.chance(0.5) ? "base_ore_iron" : "base_ore_coal";
			} else {
				oreToGenerate = oreRand.chance(0.5) ? (oreRand.chance(0.25) ? "base_ore_copper" : "base_ore_iron") : "base_ore_coal";
			}


			for(let row in this.layers[0]){
				for(let tile in this.layers[0][row]){
					//Choose the tile to be placed:
					let noiseHeight = 
					Math.abs(noise.perlin2(
						((this.x * consts.CHUNK_SIZE) + +tile + this.parent.seed) / generation_consts.perlin_scale,
						((this.y * consts.CHUNK_SIZE) + +row + (this.parent.seed + generation_consts.y_offset))
							/ generation_consts.perlin_scale
					));
					//This formula just finds the perlin noise value at a tile, but tweaked so it's different per seed and not mirrored diagonally.

					if((noiseHeight + distanceBoost / 2) > generation_consts.hilly.ore_threshold){
						this.layers[0][row][tile] = oreToGenerate;
					} else if((noiseHeight + distanceBoost) > generation_consts.hilly.stone_threshold){
						this.layers[0][row][tile] = "base_stone";
					} else {
						this.layers[0][row][tile] = "base_grass";
					}
				}
			}
		} else {
			//Old terrain generation. I kept it, just only close to spawn.
			for(let row in this.layers[0]){
				for(let tile in this.layers[0][row]){
					this.layers[0][row][tile] = "base_grass";
				}
			}
			let oreToGenerate:TileID;
			if(distanceFromSpawn < 3){
				oreToGenerate = "base_ore_coal";
			} else {
				oreToGenerate = (this.generator().chance(0.5)) ? "base_ore_coal" : "base_ore_iron";
			}
			let hill_x = Math.floor(this.generator().value * 16);
			let hill_y = Math.floor(this.generator().value * 16);

			//Makes a "hill", with an ore node in the middle, stone on the sides, and maybe stone in the corners.
			this.setTile(hill_x, hill_y, oreToGenerate);
			this.setTile(hill_x + 1, hill_y, "base_stone");
			this.setTile(hill_x - 1, hill_y, "base_stone");
			this.setTile(hill_x, hill_y + 1, "base_stone");
			this.setTile(hill_x, hill_y - 1, "base_stone");
			this.setTile(hill_x + 1, hill_y + 1, this.generator().chance(0.5) ? "base_grass" : "base_stone");
			this.setTile(hill_x + 1, hill_y - 1, this.generator().chance(0.5) ? "base_grass" : "base_stone");
			this.setTile(hill_x - 1, hill_y + 1, this.generator().chance(0.5) ? "base_grass" : "base_stone");
			this.setTile(hill_x - 1, hill_y - 1, this.generator().chance(0.5) ? "base_grass" : "base_stone");
		}


		return this;
	}
	display(currentframe:any){
		if(!Camera.isVisible([
			Pos.chunkToPixel(this.x), Pos.chunkToPixel(this.y),
			Pos.chunkToPixel(1), Pos.chunkToPixel(1)
		], consts.chunkCullingMargin)) return;//if offscreen return immediately
		currentframe.cps ++;
		
		if(currentframe.redraw){
			Gfx.layer("tile");
			Gfx.strokeColor("#000000");
			Gfx.lineWidth(1);
			Gfx.layer("tile");
			for(let y = 0; y < consts.CHUNK_SIZE; y ++){
				for(let x = 0; x < consts.CHUNK_SIZE; x ++){
					currentframe.tps ++;
					let tileX = (this.x * consts.CHUNK_SIZE) + x;
					let tileY = (this.y * consts.CHUNK_SIZE) + y;
					const tile = this.layers[0][y][x];
					Gfx.tImage(Gfx.texture(`tile/${tile}`), tileX, tileY, 1, 1);
					if(currentframe.debug) Gfx.lineTRect(tileX, tileY, 1, 1);
				}
			}
		}
		for(let y = 0; y < this.layers[1].length; y ++){
			for(let x = 0; x < this.layers[1][y].length; x ++){
				this.layers[1][y][x]?.display(currentframe);
			}
		}
		for(let y = 0; y < this.layers[2].length; y ++){
			for(let x = 0; x < this.layers[2][y].length; x ++){
				this.layers[2][y][x]?.display(currentframe);
			}
		}
		if(currentframe.debug){
			Gfx.layer("overlay");
			Gfx.strokeColor("#0000FF");
			Gfx.lineTRect(
				this.x * consts.CHUNK_SIZE, this.y * consts.CHUNK_SIZE,
				consts.CHUNK_SIZE, consts.CHUNK_SIZE
			);
		}
	}
	export():ChunkData | null {
		let exportDataL1:(BuildingData | null)[][] = [];
		let hasBuildings = false;
		for(let row of this.layers[1]){
			let tempRow:(BuildingData | null)[] = [];
			for(let building of row){
				if(building instanceof Building){
					hasBuildings = true;
				}
				tempRow.push(building?.export() ?? null);
			}
			exportDataL1.push(tempRow);
		}

		let exportDataL2:(BuildingData | null)[][]= [];
		for(let row of this.layers[2]){
			let tempRow:(BuildingData | null)[] = [];
			for(let overlayBuild of row){
				if(overlayBuild instanceof Building){
					hasBuildings = true;
				}
				tempRow.push(overlayBuild?.export() ?? null);
			}
			exportDataL2.push(tempRow);
		}

		if(hasBuildings){
			return {
				layers: [exportDataL1, exportDataL2],
				version: consts.VERSION,
			};
		} else {
			return null;
		}
	}
}

class Item {
	pos: Pos;
	constructor(x:number, y:number, public id:ItemID){
		this.pos = Pos.fromPixelCoords(x, y);
	}
	update(currentframe:CurrentFrame){
		//nothing necessary
	}
	display(currentframe:CurrentFrame){
		if(Camera.isPointVisible([this.pos.pixelX, this.pos.pixelY], consts.ITEM_SIZE)){
			currentframe.ips ++;
			Gfx.layer("items");
			Gfx.pImage(Gfx.texture(`item/${this.id}`), this.pos.pixelX, this.pos.pixelY, consts.ITEM_SIZE, consts.ITEM_SIZE, RectMode.CENTER);
		}
	}
	export():ItemData | null {
		return {
			id: this.id,
			x: this.pos.pixelX,
			y: this.pos.pixelY,
		};
	}
}

class Building {
	static animated = false;
	static outputsItems = false;
	static id:RawBuildingID;
	/**Whether this building cannot be placed or broken.*/
	static immutable = false;
	static isOverlay = false;
	static displaysItem = false;

	item: Item | null = null;
	pos:Pos;
	block = this.constructor as typeof Building;
	constructor(x:number, y:number, public readonly meta:BuildingMeta, public level:Level){
		this.pos = Pos.fromTileCoords(x, y, false);
	}
	static changeMeta(meta:BuildingMeta, tileX:number, tileY:number, level:Level):BuildingMeta {
		return meta;
	}
	static getID(type:RawBuildingID, direction:Direction, modifier:number):BuildingIDWithMeta {
		return [type, 0];
	}
	static canBuildAt(tileX:number, tileY:number, level:Level){
		//By default, buildings cant be built on water
		return level.tileAtByTile(tileX, tileY) != "base_water";
	}
	/**Returns texture size and offset given meta. */
	static textureSize(meta:number):[size:[number, number], offset:[number, number]] {
		return [[1, 1], [0, 0]];
	}
	static canOutputTo(building:Building | null){
		return building instanceof Conveyor;
	}
	/**Called to destroy the building. Should remove all references to it. */
	break(){
		if(this.block.isOverlay) this.level.writeOverlayBuild(this.pos.tileX, this.pos.tileY, null);
		else this.level.writeBuilding(this.pos.tileX, this.pos.tileY, null);
	}
	update(currentFrame:CurrentFrame){
		this.item?.update(currentFrame);
	}
	stringID(){
		return stringifyMeta(this.block.id, this.meta);
	}
	display(currentFrame:CurrentFrame, layer:(keyof typeof Gfx.layers) = this.block.isOverlay ? "overlayBuilds" : "ghostBuilds"){
		const textureSize = Buildings.get(this.block.id).textureSize(this.meta);
		//do not edit, necessary due to the cursed .bind() shenanigans
		
		Gfx.tImage(
			Gfx.texture(`building/${this.stringID()}`),
			this.pos.tileX + textureSize[1][0], this.pos.tileY + textureSize[1][1],
			...textureSize[0],
			Gfx.layers[layer]
		);
		if(this.item instanceof Item && this.block.displaysItem){
			this.item.display(currentFrame);
		}
	}
	hasItem():Item | null {
		if(this.item) return this.item;
		return null;
	}
	removeItem():Item | null {
		if(this.item){
			let temp = this.item;
			this.item = null;
			return temp;
		}
		return null;
	}
	/**Whether a building can ever accept items from a particular side. */
	acceptsItemFromSide(side:Direction):boolean {
		return true;
	}
	/**Whether a building can ever output items to a particular side. */
	outputsItemToSide(side:Direction):boolean {
		return true;
	}
	buildAt(direction:Direction):Building | null {
		return this.level.buildingAtTile(this.pos.tileX + direction.vec[0], this.pos.tileY + direction.vec[1]);
	}
	buildAtOffset(offset:[x:number, y:number]):Building | null {
		return this.level.buildingAtTile(this.pos.tileX + offset[0], this.pos.tileY + offset[1]);
	}
	spawnItem(id:ItemID){
		for(const direction of Object.values(Direction)){
			const build = this.buildAt(direction);
			if(
				build && this.block.canOutputTo(build) &&
				this.outputsItemToSide(direction) && build.acceptItem(new Item(
					(this.pos.tileX + 0.5 + direction.vec[0] * 0.6) * consts.TILE_SIZE,
					(this.pos.tileY + 0.5 + direction.vec[1] * 0.6) * consts.TILE_SIZE,
					id
				), direction.opposite)
			) return true;
		}
		return false;
	}
	acceptItem(item:Item, side:Direction | null):boolean {
		if(this.item === null && (side == null || this.acceptsItemFromSide(side))){
			this.item = item;
			return true;
		} else {
			return false;
		}
	}
	export():BuildingData {
		return {
			x: this.pos.tileX,
			y: this.pos.tileY,
			id: this.block.id,
			meta: this.meta,
			item: this.item?.export() ?? null,
			inv: []
		};
	}
}



class BuildingWithRecipe extends Building {
	timer: number = -1;
	recipe: Recipe | null = null;
	items: Item[] = [];
	static outputsItems = true;
	static recipeType: {recipes: Recipe[]};
	static recipeMaxInputs = 3;
	block!:typeof BuildingWithRecipe;
	constructor(tileX:number, tileY:number, meta:BuildingMeta, level:Level){
		super(tileX, tileY, meta, level);
		if(this.constructor === BuildingWithRecipe) throw new Error("Cannot initialize abstract class BuildingWithRecipe");
	}
	acceptItem(item:Item):boolean {
		for(let i = 0; i < this.block.recipeMaxInputs; i ++){
			//repeat recipeMaxInputs times
			if(!this.items[i] && !this.items.map(item => item.id).includes(item.id)){
				//if there is nothing in this item slot and the new item's id is not in the list of current items' ids
				for(let recipe of this.block.recipeType.recipes){
					//for each recipe this building can do
					if(!recipe.inputs) continue;//If the recipe has no inputs, it cant be the right one
					if(!this.items.map(item => recipe.inputs!.includes(item.id)).includes(false) && recipe.inputs.includes(item.id)){
						//if all of the current items are inputs of the recipe and the item is an input of the recipe
						this.items[i] = item;
						if(recipe.inputs.length == i + 1){
							this.setRecipe(recipe);
						}
						return true;
					}
				}
				return false;
			}
		}
		return false;
	}
	hasItem(){
		return null;
	}
	removeItem(){
		return null;
	}
	setRecipe(recipe:Recipe){
		if(!(recipe.inputs instanceof Array)) throw new ShouldNotBePossibleError("tried to set invalid recipe");
		this.recipe = recipe;
		this.timer = recipe.duration;
	}
	update(){
		if(this.timer > 0){
			this.timer --;
		} else if(this.timer == 0 && this.recipe){
			if(this.spawnItem(this.recipe.outputs[0])){
				this.timer = -1;
				this.items = [];
				this.recipe = null;
			}
		}
	}
}


class Miner extends Building {
	timer: number;
	miningItem: ItemID | null = null;
	static outputsItems = true;
	constructor(tileX:number, tileY:number, meta:BuildingMeta, level:Level){
		super(tileX, tileY, meta, level);
		this.timer = 61;
		for(let recipe of recipes.base_mining.recipes){
			if(recipe.tile == level.tileAtByTile(tileX, tileY)){
				this.miningItem = recipe.outputs[0];
				return;
			}
		}
		console.warn(`Miner cannot mine tile at ${tileX}, ${tileY}`);
	}
	static canBuildAt(tileX:number, tileY:number, level:Level):boolean {
		return level.tileAtByTile(tileX, tileY).split("_")[1] == "ore";
	}
	update(){
		if(!this.miningItem) return;
		if(this.timer > 0){
			this.timer --;
		} else {
			if(this.spawnItem(this.miningItem)){
				this.timer = 61;
				trigger(triggerType.buildingRun, this.block.id, this.miningItem);
			}
		}
	}
}



class TrashCan extends Building {
	acceptItem(item:Item){
		return true;
	}
}


class Conveyor extends Building {
	static displaysItem = true;
	/**Speed of the item in pixels per update. */
	static speed = 1;
	block!:typeof Conveyor;
	outputSide:Direction = Conveyor.outputSide(this.meta);
	acceptsItemFromSide(side:Direction):boolean {
		//Bit cursed, but far better than what it used to be
		switch(side){
			case Direction.left: return [
				0x00, 0x07, 0x0B, 0x0C, 0x0D, 0x0F, 0x13, 0x15, 0x17, 0x18, 0x19, 0x1B,
			].includes(this.meta);
			case Direction.up: return [
				0x01, 0x05, 0x09, 0x0D, 0x0E, 0x0F, 0x11, 0x14, 0x16, 0x18, 0x19, 0x1A,
			].includes(this.meta);
			case Direction.right: return [
				0x02, 0x06, 0x0A, 0x0E, 0x10, 0x11, 0x12, 0x15, 0x17, 0x19, 0x1A, 0x1B,
			].includes(this.meta);
			case Direction.down: return [
				0x03, 0x08, 0x04, 0x0C, 0x10, 0x12, 0x13, 0x14, 0x16, 0x18, 0x1A, 0x1B,
			].includes(this.meta);
			default: never();
		}
	}
	outputsItemToSide(side:Direction):boolean {
		//Bit cursed, but far better than what it used to be
		switch(side){
			case Direction.left: return [
				2, 8, 9, 16, 17, 22, 26
			].includes(this.meta);
			case Direction.up: return [
				3, 10, 11, 18, 19, 23, 27
			].includes(this.meta);
			case Direction.right: return [
				0, 4, 5, 12, 13, 20, 24
			].includes(this.meta);
			case Direction.down: return [
				1, 6, 7, 14, 15, 21, 25
			].includes(this.meta);
			default: never();
		}
	}
	/**Not sure if this function is a good idea? */
	static outputSide(meta:number):Direction {
		if([2, 8, 9, 16, 17, 22, 26].includes(meta)) return Direction.left;
		if([3,10,11, 18, 19, 23, 27].includes(meta)) return Direction.up;
		if([0, 4, 5, 12, 13, 20, 24].includes(meta)) return Direction.right;
		if([1, 6, 7, 14, 15, 21, 25].includes(meta)) return Direction.down;
		throw new Error(`Invalid meta ${meta}`);
	}
	static getID(type:RawBuildingID, direction:Direction, modifier:number):BuildingIDWithMeta {
		return [type, direction.num] as BuildingIDWithMeta;
	}
	static changeMeta(meta:BuildingMeta, tileX:number, tileY:number, level:Level):BuildingMeta {
		if(keybinds.placement.force_straight_conveyor.isHeld()){
			return meta;
			//If holding shift, just return a straight conveyor.
		}

		let hasLeftBuilding = level.buildingAtTile(tileX - 1, tileY)?.outputsItemToSide(Direction.right) ?? false;
		let hasTopBuilding = level.buildingAtTile(tileX, tileY - 1)?.outputsItemToSide(Direction.down) ?? false;
		let hasRightBuilding = level.buildingAtTile(tileX + 1, tileY)?.outputsItemToSide(Direction.left) ?? false;
		let hasBottomBuilding = level.buildingAtTile(tileX, tileY + 1)?.outputsItemToSide(Direction.up) ?? false;
		
		switch(meta){
			case 0:
				if(hasLeftBuilding){
					if(hasTopBuilding && hasBottomBuilding) return 0x18;
					else if(hasTopBuilding) return 0x0D;
					else if(hasBottomBuilding) return 0x0C;
					else return 0x00;
				} else {
					if(hasTopBuilding && hasBottomBuilding) return 0x14;
					else if(hasTopBuilding) return 0x05;
					else if(hasBottomBuilding) return 0x04;
					else return 0x00;
				}
			case 1:
				if(hasTopBuilding){
					if(hasLeftBuilding && hasRightBuilding) return 0x19;
					else if(hasLeftBuilding) return 0x0F;
					else if(hasRightBuilding) return 0x0E;
					else return 0x01;
				} else {
					if(hasLeftBuilding && hasRightBuilding) return 0x15;
					else if(hasLeftBuilding) return 0x07;
					else if(hasRightBuilding) return 0x06;
					else return 0x01;
				}
			case 2:
				if(hasRightBuilding){
					if(hasTopBuilding && hasBottomBuilding) return 0x1A;
					else if(hasTopBuilding) return 0x11;
					else if(hasBottomBuilding) return 0x10;
					else return 0x02;
				} else {
					if(hasTopBuilding && hasBottomBuilding) return 0x16;
					else if(hasTopBuilding) return 0x09;
					else if(hasBottomBuilding) return 0x08;
					else return 0x02;
				}
			case 3:
				if(hasBottomBuilding){
					if(hasLeftBuilding && hasRightBuilding) return 0x1B;
					else if(hasLeftBuilding) return 0x13;
					else if(hasRightBuilding) return 0x12;
					else return 0x03;
				} else {
					if(hasLeftBuilding && hasRightBuilding) return 0x17;
					else if(hasLeftBuilding) return 0x0B;
					else if(hasRightBuilding) return 0x0A;
					else return 0x03;
				}
			default: return meta;
		}
	}
	update(){
		if(this.item instanceof Item){
			if(this.item.pos.tileX != this.pos.tileX || this.item.pos.tileY != this.pos.tileY){
				let building = this.buildAt(this.outputSide);
				if(!building) return;
				if(building.acceptItem(this.item, this.outputSide.opposite)){
					this.item = null;
				}
				return;
			}
			switch(this.meta){
				//yes I know there's no need to write the ids in hex but why the heck not
				case 0x00:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					break;
				case 0x01:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.block.speed;
					break;
				case 0x02:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x03:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x04:
					if(this.item.pos.tileOffsetXInTiles >= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles > 0.5)
						this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x05:
					if(this.item.pos.tileOffsetXInTiles >= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles < 0.5)
						this.item.pos.pixelY += this.block.speed;
					break;
				case 0x06:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles > 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x07:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles < 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					break;
				case 0x08:
					if(this.item.pos.tileOffsetXInTiles <= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x09:
					if(this.item.pos.tileOffsetXInTiles <= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY += this.block.speed;
					break;
				case 0x0A:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles > 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x0B:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles < 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					break;
				case 0x0C:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x0D:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY += this.block.speed;
					break;
				case 0x0E:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles > 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x0F:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles < 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					break;
				case 0x10:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x11:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY += this.block.speed;
					break;
				case 0x12:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles > 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x13:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetXInTiles < 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					break;
				case 0x14:
					if(this.item.pos.tileOffsetXInTiles >= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.item.pos.tileOffsetYInTiles > 0.5 ? -1 : 1;
					break;
				case 0x15:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles >= 0.5)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.item.pos.tileOffsetXInTiles > 0.5 ? -1 : 1;
					break;
				case 0x16:
					if(this.item.pos.tileOffsetXInTiles <= 0.5 && this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.item.pos.tileOffsetYInTiles > 0.5 ? -1 : 1;
					break;
				case 0x17:
					if(this.item.pos.tileOffsetXCentered && this.item.pos.tileOffsetYInTiles <= 0.5)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.item.pos.tileOffsetXInTiles > 0.5 ? -1 : 1;
					break;
				case 0x18:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.block.speed;
					else if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.item.pos.tileOffsetYInTiles > 0.5 ? -1 : 1;	
					break;
				case 0x19:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.block.speed;
					else if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.item.pos.tileOffsetXInTiles > 0.5 ? -1 : 1;
					break;
				case 0x1A:
					if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX -= this.block.speed;
					else if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY += this.item.pos.tileOffsetYInTiles > 0.5 ? -1 : 1;
					break;
				case 0x1B:
					if(this.item.pos.tileOffsetXCentered)
						this.item.pos.pixelY -= this.block.speed;
					else if(this.item.pos.tileOffsetYCentered)
						this.item.pos.pixelX += this.item.pos.tileOffsetXInTiles > 0.5 ? -1 : 1;
					break;
			}
		}
	}
}

class OverlayBuild extends Building {
	static isOverlay = true;
	buildingUnder(){
		return this.level.buildingAtPos(this.pos);
	}
}

class Extractor extends OverlayBuild {
	static displaysItem = true;
	static speed = 1;
	block!:typeof Extractor;
	outputOffset: [x:number, y:number] = this.block.getOutputTile(this.meta)
	static textureSize(meta:BuildingMeta){
		switch(meta){
			case 0: return [[2, 1], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 1: return [[1, 2], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 2: return [[2, 1], [-1, 0]] as [size:[number, number], offset:[number, number]];
			case 3: return [[1, 2], [0, -1]] as [size:[number, number], offset:[number, number]];
			case 4: return [[3, 1], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 5: return [[1, 3], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 6: return [[3, 1], [-2, 0]] as [size:[number, number], offset:[number, number]];
			case 7: return [[1, 3], [0, -2]] as [size:[number, number], offset:[number, number]];
			case 8: return [[4, 1], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 9: return [[1, 4], [0, 0]] as [size:[number, number], offset:[number, number]];
			case 10: return [[4, 1], [-3, 0]] as [size:[number, number], offset:[number, number]];
			case 11: return [[1, 4], [0, -3]] as [size:[number, number], offset:[number, number]];
			default: return [[1, 1], [0, 0]] as [size:[number, number], offset:[number, number]];
		}
	}
	static getID(type:RawBuildingID, direction:Direction, modifier:number):BuildingIDWithMeta {
		return [type, (modifier * 4) + direction.num] as BuildingIDWithMeta;
	}
	static getOutputTile(meta:BuildingMeta):[x:number, y:number] {
		switch(meta){
			case 0: return [1, 0];
			case 1: return [0, 1];
			case 2: return [-1, 0];
			case 3: return [0, -1];
			case 4: return [2, 0];
			case 5: return [0, 2];
			case 6: return [-2, 0];
			case 7: return [0, -2];
			case 8: return [2, 0];
			case 9: return [0, 2];
			case 10: return [-2, 0];
			case 11: return [0, -2];
			default: throw new Error(`Invalid meta ${meta}`);
		}
	}

	grabItemFromTile(filter:(item:Item) => boolean = item => item instanceof Item){

		if(
			this.buildingUnder() instanceof Building &&
			this.buildingUnder()!.hasItem() &&
			filter(this.buildingUnder()!.hasItem()!)
		){
			this.item = this.buildingUnder()!.removeItem()!;
			this.item.pos.pixelX = this.pos.pixelXCenteredInTile;
			this.item.pos.pixelY = this.pos.pixelYCenteredInTile;
		}

	}

	dropItem(){
		if(this.item instanceof Item){
			if(this.buildAtOffset(this.outputOffset)?.acceptItem(this.item, null)){
				this.item = null;
			}
		} else {
			console.error(this);
			throw new InvalidStateError(`no item to drop; extractor at ${this.pos.tileX} ${this.pos.tileY}`);
		}
	}

	update(){
		if(this.item instanceof Item){
			switch(this.meta){
				case 0x00:
					if(this.item.pos.tileXExact >= this.pos.tileX + 1.5) return this.dropItem();
					else this.item.pos.pixelX += this.block.speed;
					break;
				case 0x01:
					if(this.item.pos.tileYExact >= this.pos.tileY + 1.5) return this.dropItem();
					else this.item.pos.pixelY += this.block.speed;
					break;
				case 0x02:
					if(this.item.pos.tileXExact <= this.pos.tileX - 0.5) return this.dropItem();
					else this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x03:
					if(this.item.pos.tileYExact <= this.pos.tileY - 0.5) return this.dropItem();
					else this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x04:
					if(this.item.pos.tileXExact >= this.pos.tileX + 2.5) return this.dropItem();
					else this.item.pos.pixelX += this.block.speed;
					break;
				case 0x05:
					if(this.item.pos.tileYExact >= this.pos.tileY + 2.5) return this.dropItem();
					else this.item.pos.pixelY += this.block.speed;
					break;
				case 0x06:
					if(this.item.pos.tileXExact <= this.pos.tileX - 1.5) return this.dropItem();
					else this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x07:
					if(this.item.pos.tileYExact <= this.pos.tileY - 1.5) return this.dropItem();
					else this.item.pos.pixelY -= this.block.speed;
					break;
				case 0x08:
					if(this.item.pos.tileXExact >= this.pos.tileX + 3.5) return this.dropItem();
					else this.item.pos.pixelX += this.block.speed;
					break;
				case 0x09:
					if(this.item.pos.tileYExact >= this.pos.tileY + 3.5) return this.dropItem();
					else this.item.pos.pixelY += this.block.speed;
					break;
				case 0x0A:
					if(this.item.pos.tileXExact <= this.pos.tileX - 2.5) return this.dropItem();
					else this.item.pos.pixelX -= this.block.speed;
					break;
				case 0x0B:
					if(this.item.pos.tileYExact <= this.pos.tileY - 2.5) return this.dropItem();
					else this.item.pos.pixelY -= this.block.speed;
					break;
			}
		} else {
			this.grabItemFromTile();
		}
	}

	acceptsItemFromSide(side:Direction){ return false; }
	acceptItem(item:Item){ return false; }
}

class StorageBuilding extends Building {
	inventory:Item[] = [];
	static capacity:number = 64;
	block!:typeof StorageBuilding;
	hasItem(){
		if(this.inventory.length != 0) return this.inventory[0];
		return super.hasItem();
	}
	removeItem(){
		if(this.inventory?.length > 0){
			return this.inventory.pop()!;
		}
		return super.removeItem();
	}
	acceptItem(item:Item) {
		if(this.inventory.length < this.block.capacity){
			this.inventory.push(item);
			return true;
		} else return false;
	}
	export():BuildingData {
		let inv:ItemData[] = [];
		if(this.inventory){
			for(let item of this.inventory){
				const data = item.export();
				if(data) inv.push(data);
			}
		}
		return {
			x: this.pos.tileX,
			y: this.pos.tileY,
			id: this.block.id,
			meta: this.meta,
			item: null,
			inv: inv
		};
	}
}


class ResourceAcceptor extends Building {
	static immutable = true;
	acceptItem(item:Item){
		this.level.resources[item.id] ??= 0;
		this.level.resources[item.id] ++;
		return true;
	}
}

class MultiBlockController extends BuildingWithRecipe {
	block!: typeof MultiBlockController;
	secondaries: MultiBlockSecondary[] = [];
	static multiblockSize = [2, 2] as [number, number];
	static outputsItems = true;
	static textureSize(meta: number) {
		return [this.multiblockSize, [0, 0]] as [size: [number, number], offset: [number, number]];
	}
	static getOffsetsForSize(width:number, height:number){
		let offsets = new Array<[x:number, y:number]>();
		for(let i = 0; i < width; i ++){
			for(let j = 0; j < height; j ++){
				if(i == 0 && j == 0) continue;
				offsets.push([i, j]);
			}
		}
		return offsets;
	}
	break(){
		this.secondaries.forEach(secondary => secondary.break(true));
		this.secondaries = [];
		super.break();
	}
	update(){
		if(this.secondaries.length != this.block.multiblockSize[0] * this.block.multiblockSize[1] - 1){
			if(!this.resetSecondaries()) this.break();
		}
		super.update();
	}
	/**Attempts to reconnects to secondaries, returning if the attempt succeeded. */
	resetSecondaries():boolean {
		let possibleSecondaries = MultiBlockController.getOffsetsForSize(...this.block.multiblockSize)
		.map(([xOffset, yOffset]) =>
			this.level.buildingAtTile(this.pos.tileX + xOffset, this.pos.tileY + yOffset)
		);
		for(let possibleSecondary of possibleSecondaries){
			if(
				possibleSecondary instanceof MultiBlockSecondary && 
				(possibleSecondary.controller == this || possibleSecondary.controller == undefined)
			){
				possibleSecondary.controller = this;
				this.secondaries.push(possibleSecondary);
			} else {
				return false;
			}
		}
		return true;
	}
	spawnItem(id: ItemID):boolean {
		if(super.spawnItem(id)){
			return true;
		}
		for(let secondary of this.secondaries){
			if(secondary.spawnItem(id)){
				return true;
			}
		}
		return false;
	}
}

class MultiBlockSecondary extends Building {
	/**Assigned in buildBuilding */
	controller: MultiBlockController | null = null;
	static outputsItems = true;
	acceptItem(item: Item):boolean {
		return this.controller?.acceptItem(item) ?? false;
	}
	break(isRecursive?:boolean){
		if(!isRecursive){
			this.controller?.break();
		} else {
			this.controller = null;
			super.break();
		}
	}
	display(currentFrame:CurrentFrame){
		//Do nothing, the controller is responsible for displaying
	}
	update(){
		if(!(this.controller instanceof MultiBlockController)){
			this.break();
		}
	}
}
