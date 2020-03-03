let {
	app,
	BrowserWindow,
	globalShortcut,
	protocol,
} = require("electron");

let windowStateKeeper = require("electron-window-state");
let fs = require("flowfs");
let url = require("url");
let svelteViewEngine = require("svelte-view-engine");

let win;

function setupSvelte() {
	let root = __dirname + "/..";
	
	let engine = svelteViewEngine({
		template: `${root}/src/template.html`,
		dir: `${root}/src/pages`,
		type: "html",
		buildScript: `${root}/scripts/svelte/build.js`,
		buildDir: `${root}/build/pages`,
		init: true,
		watch: true,
		clientCss: true,
		liveReload: true,
		rebuildOnRenderError: true,
		dev: true,
	});
	
	protocol.registerStringProtocol("svelte", async function(request, callback) {
		let path = url.parse(request.url).pathname;
		
		callback(await engine.render(path, {}));
	});
}

function createWindow() {
	let winState = windowStateKeeper();
	
	win = new BrowserWindow({
		x: winState.x,
		y: winState.y,
		width: winState.width,
		height: winState.height,
		
		webPreferences: {
			nodeIntegration: true,
		},
	});
	
	winState.manage(win);
	
	win.setMenu(null);

	win.loadURL("svelte://" + fs(__dirname).child("pages/Index.html").path);
	
	win.webContents.openDevTools();

	win.on("closed", function() {
		win = null;
	});

	globalShortcut.register("CommandOrControl+Q", function() {
		app.quit();
	});
};

app.on("ready", async function() {
	setupSvelte();
	createWindow();
});

app.on("window-all-closed", function() {
	// mac - leave the app running after all windows are closed
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", function() {
	// On macOS it"s common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (!win) {
		createWindow();
	}
});
