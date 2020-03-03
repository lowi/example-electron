let fs = require("flowfs/mkdirp");
let rollup = require("rollup");
let svelte = require("rollup-plugin-svelte");
let resolve = require("rollup-plugin-node-resolve");
let commonjs = require("rollup-plugin-commonjs");
let sass = require("./sass");

let pathStartRe = /([A-Z]:|\/)/;

module.exports = async function(path, name, options, cache) {
	let inputOptions = {
		input: path,
		cache,
		
		plugins: [
			svelte({
				hydratable: true,
				
				preprocess: {
					style: sass,
				},
				
				/*
				TODO
				
				client-side CSS is needed in dev because the bundle doesn't write
				any unchanged components' CSS when using cache (see issue below)
				using client-side CSS is OK for dev but not prod as you get a FOUC
				but we won't be using cache in prod anyway, so if the issue
				doesn't get resolved we could leave it like this, as it only
				affects dev
				
				https://github.com/rollup/rollup-plugin-svelte/issues/62
				
				if/when the issue is resolved this should be false, as the ssr provides
				the css
				*/
				
				css: !!options.clientCss,
				
				onwarn() {},
				
				dev: options.dev,
			}),
	
			resolve({
				browser: true,
			}),
			
			commonjs(),
		],
	};
	
	let outputOptions = {
		name,
		format: "iife",
	};
	
	let bundle = await rollup.rollup(inputOptions);
	
	let {output} = await bundle.generate(outputOptions);
	
	let js = output[0];
	
	if (options.saveJs) {
		fs(path).reparent(options.dir, options.buildDir).withExt(".client.js").write(js.code);
	}
	
	return {
		cache: options.cache && bundle.cache,
		js,
		
		watchFiles: bundle.watchFiles.map(function(path) {
			/*
			some paths have markers from rollup plugins - strip these for watching
			
			some are also not absolute; these are also internal to rollup and can
			be stripped
			*/
			
			let start = path.match(pathStartRe);
			
			if (start) {
				return path.substr(start.index);
			} else {
				return false;
			}
		}).filter(Boolean),
	};
}
