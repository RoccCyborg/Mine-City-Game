/*!license
Copyright © <BalaM314>, 2024.
This file is part of Untitled Electron Game.
Untitled Electron Game is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
Untitled Electron Game is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
You should have received a copy of the GNU General Public License along with Untitled Electron Game. If not, see <https://www.gnu.org/licenses/>.
*/
/* Contains game-specific functions. */

import { tech, objectives } from "./objectives.js";
import type { SaveData } from "./types.js";
import { Camera } from "./ui/graphics.js";
import { GUI, HUD } from "./ui/gui.js";
import { Input } from "./ui/input.js";
import { safeToSave, saveToLocalStorage, parseError, assert, saveExists } from "./util/funcs.js";
import { Rand } from "./util/random.js";
import { Log } from "./util/log.js";
import { Game, consts, settings } from "./vars.js";
import { Level } from "./world/world.js";



export function manualLocalSave(allowConfirmDialog: boolean, showSuccessMessage: boolean) {
	if (safeToSave() || allowConfirmDialog &&
		confirm("Are you sure you want to save? This will overwrite your current saved world which seems to be different!")) {
		try {
			saveToLocalStorage();
			if (showSuccessMessage) alert("Saved successfully!");
		} catch (err) {
			alert("Failed to save! " + parseError(err));
		}
	}
}

export const SaveIO = {
	/**Exports an Untitled Electron Game save, as an object. */
	export(): SaveData {
		return {
			UntitledElectronGame: {
				metadata: {
					validationCode: "esrdtfgvczdsret56u7yhgvfcesrythgvfd!",
					uuid: Game.level1?.uuid ?? Math.random().toString().substring(2),
					version: consts.VERSION,
					timeCreated: new Date().getTime().toString()
				},
				level1: Game.level1.export(),
				techTree: tech.write(),
				objectives: objectives.write(),
			}
		};
	},

	/**Imports an Untitled Electron Game save. */
	import(rawData: string) {
		let tempLevel: Level;
		try {
			Log.group(`Importing save data...`, () => {
				let data = JSON.parse(rawData) as SaveData;
				assert(data.UntitledElectronGame.metadata.validationCode === "esrdtfgvczdsret56u7yhgvfcesrythgvfd!");

				let levelData = data.UntitledElectronGame.level1;
				levelData.version = data.UntitledElectronGame.metadata.version;
				levelData.uuid = data.UntitledElectronGame.metadata.uuid ?? (<any>data.UntitledElectronGame.metadata).id;
				assert(levelData.chunks instanceof Object);

				tempLevel = Level.read(levelData);
				Log.info("Parsed world data.");
				Game.level1 = tempLevel;

				if (data.UntitledElectronGame.techTree) {
					const num = tech.read(data.UntitledElectronGame.techTree);
					Log.info(`Imported ${num} tech tree nodes.`);
				}
				if (data.UntitledElectronGame.objectives) {
					const num = objectives.read(data.UntitledElectronGame.objectives);
					Log.info(`Imported ${num} completed objectives.`);
				}
				Log.info(`Imported save data.`);
			});
		} catch (err) {
			Log.error("Import failed.", err);
			//TODO don't call alert here
			alert("Import failed! " + parseError(err));
		}
	}
};
/**Called when switching to gamestate "game". */

export function load() {

	Camera.scrollTo(0, 0);
	Camera.zoomTo(1);
	Input.placedBuilding.type = "base_null";

	if (!localStorage.firstload) {
		localStorage.firstload = true;
		GUI.alert(
			`Welcome to Untitled Electron Game!
This is a game about building a factory. To get started, follow the objectives in the top right.`
		);
	}

	if (!Game.enteredGame) {

		if (saveExists() &&
			(settings.alwaysLoadSave || confirm("Would you like to load your save?"))) SaveIO.import(localStorage.getItem("save1")!);
		else Game.level1 = new Level(Rand.int(0, 10000), true).generate();

		if (settings.autoSave) {
			if (safeToSave()) {
				setInterval(() => {
					saveToLocalStorage();
					Log.info("Autosaved.");
				}, 30000);
			} else {
				GUI.alert("It looks like your current world isn't the same world as your save. Autosaving has been disabled to avoid overwriting it.");
			}
		}
	}

	Game.sceneName = "game";
	Game.forceRedraw = true;
	HUD.show();
}

