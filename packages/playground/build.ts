import { readFile, writeFile } from "node:fs/promises";
import path, { relative, resolve } from "node:path";

import { rimrafSync } from "rimraf";

import * as esbuild from "esbuild";

const buildMode = "--build";
const watchMode = "--watch";

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

export type MMLPluginOptions = {
  verbose?: boolean;
}

function mmlPlugin({ verbose = false }: MMLPluginOptions = {}): esbuild.Plugin {
  const log = verbose ? console.log : () => { };

  const plugin: esbuild.Plugin = {
    name: "mml",
    setup(build) {
      build.initialOptions.metafile = true;
      const outdir = resolve(__dirname, build.initialOptions.outdir ?? "build");

      build.onResolve({ filter: /^mml:/ }, async (args) => {
        log("onResolve", args);
        const { path, ...rest } = args;
        const result = await build.resolve(path.slice("mml:".length), rest);
        return { ...result, namespace: "mml" };
      });

      build.onLoad({ filter: /.*/, namespace: "mml" }, async (args) => {
        log("onLoad", args);
        const { path } = args;
        const result = await build.esbuild.build({
          ...build.initialOptions,
          metafile: true,
          entryPoints: [path]
        });
        const outPath = Object.keys(result.metafile.outputs)[0];
        const contents = relative(outdir, outPath).replace(/\.[tj]sx?/, ".html");
        return { contents, loader: "text" };
      });

      build.onLoad({ filter: /\.html$/ }, async (args) => {
        log("onLoad", args);
        const { path } = args;
        const contents = await readFile(path, { encoding: "utf8" });
        return { contents, loader: "file" };
      });

      build.onEnd(async result => {
        if (!result.metafile) {
          return;
        }
        const jsExt = /\.js$/;
        const outputs = result.metafile.outputs;
        for (const [output, meta] of Object.entries(outputs)) {
          if (jsExt.test(output)) {
            const js = await readFile(output, { encoding: "utf8" });
            const html = `<body></body><script>${js}</script>`;
            const htmlPath = output.replace(/\.[tj]sx?/, ".html");
            if (!(htmlPath in outputs)) {
              writeFile(htmlPath, html);
              outputs[htmlPath] = { ...meta, bytes: meta.bytes + 30 };
            }
          }
        }

        log("onEnd", result);
      });
    },
  };
  return plugin;
}

const outdir = path.join(__dirname, "build")
const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["./src/playground/index.tsx"],
  outdir,
  outbase: "src",
  bundle: true,
  write: true,
  assetNames: "[dir]/[name]",
  entryNames: "[dir]/[name]",
  plugins: [mmlPlugin({ verbose: true })],
};

const args = process.argv.splice(2);

if (args.length !== 1) {
  console.error(helpString);
  process.exit(1);
}

const mode = args[0];

rimrafSync(outdir);

switch (mode) {
  case buildMode:
    esbuild
      .build(buildOptions).catch(() => process.exit(1))
    break;
  case watchMode:
    esbuild
      .context({ ...buildOptions })
      .then((context) => context.watch())
      .catch(() => process.exit(1));
    break;
  default:
    console.error(helpString);
}
