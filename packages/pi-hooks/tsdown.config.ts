import { defineConfig } from "tsdown";

export default defineConfig({
	target: ["es2020"],
	platform: "node",
	entry: ["./src/index.ts"],
	clean: true,
	unbundle: true,
	minify: false,
	fixedExtension: false,
	sourcemap: false,
	dts: false,
	format: {
		esm: {
			outDir: "./dist",
		},
	},
	deps: {
		neverBundle: ["effect", "@earendil-works/pi-coding-agent"],
		alwaysBundle: [/^@vahor\/shared/],
	},
});
