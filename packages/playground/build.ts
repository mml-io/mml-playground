import { readFile, writeFile, rm } from "node:fs/promises";
import path, { relative, resolve } from "node:path";

import { rimrafSync } from "rimraf";

import * as esbuild from "esbuild";

const buildMode = "--build";
const watchMode = "--watch";

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

export type MMLPluginOptions = {
  verbose?: boolean;
  removeJS?: boolean;
}

function mmlPlugin({ verbose = false, removeJS = true }: MMLPluginOptions = {}): esbuild.Plugin {
  const log = verbose ? console.log : () => { };

  const results: esbuild.BuildResult[] = [];

  // We create a new non-root instance of the plugin anytime we need to run a child build process
  // This signifies to the the child plugin that it should store its result in the `results` array
  // so that the root instance can merge them for the final result.
  const makePlugin = (isRoot: boolean = false): esbuild.Plugin => ({
    name: "mml",
    setup(build) {
      // We rely on the metfile to perform JS-to-HTML embedding and file renames.
      build.initialOptions.metafile = true;
      const outdir = resolve(__dirname, build.initialOptions.outdir ?? "build");

      // Main entry point for any imports that are prefixed with "mml:".
      // We strip the prefix and resolve the path with esbuild before handing off to
      // an mml loader.
      build.onResolve({ filter: /^mml:/ }, async (args) => {
        log("onResolve", args);
        const { path, ...rest } = args;
        const result = await build.resolve(path.slice("mml:".length), rest);
        return { ...result, namespace: "mml" };
      });

      // Loader for any (originally) mml-prefixed paths. This requests the file be built by a
      // child esbuild instance, however we control the rewriting of the import paths using the
      // "text" loader to embed the path to the document as a string within the importer.
      build.onLoad({ filter: /.*/, namespace: "mml" }, async (args) => {
        log("onLoad", args);
        const { path } = args;
        const result = await build.esbuild.build({
          ...build.initialOptions,
          metafile: true,
          entryPoints: [path],
          plugins: [makePlugin()]
        });
        const outPath = Object.keys(result.metafile.outputs)[0];
        const contents = relative(outdir, outPath).replace(/\.[tj]sx?/, ".html");
        return { contents, loader: "text" };
      });

      // Any raw HTML files should just be copied to the build directory
      // TODO: These could contain script tags with references to local files,
      //       we may want to consider loading and embedding them directly into the HTML.
      build.onLoad({ filter: /\.html$/ }, async (args) => {
        log("onLoad", args);
        const { path } = args;
        const contents = await readFile(path, { encoding: "utf8" });
        return { contents, loader: "file" };
      });

      build.onEnd(async result => {
        if (!isRoot) {
          results.push(result);
          return;
        }

        // We are in the root plugin instance. All child instances have finished and
        // push their results into the array. Now we combine all the results into one.
        const combinedResults = results.reduce((acc, val) => ({
          errors: acc.errors.concat(val.errors),
          warnings: acc.warnings.concat(val.warnings),
          outputFiles: (acc.outputFiles ?? []).concat(val.outputFiles ?? []),
          metafile: {
            inputs: { ...acc.metafile?.inputs, ...val.metafile?.inputs },
            outputs: { ...acc.metafile?.outputs, ...val.metafile?.outputs },
          },
          mangleCache: { ...acc.mangleCache, ...val.mangleCache },
        }), result);

        Object.assign(result, combinedResults);

        // If we have a any js files, that do not have a corresponding HTML file,
        // we need to create one and embed the JavaScript into a <script> tag.
        const jsExt = /\.js$/;
        const outputs = result.metafile!.outputs;
        for (const [output, meta] of Object.entries(outputs)) {
          if (jsExt.test(output)) {
            const js = await readFile(output, { encoding: "utf8" });
            const html = `<body></body><script>${js}</script>`;
            const htmlPath = output.replace(/\.[tj]sx?/, ".html");
            if (!(htmlPath in outputs)) {
              outputs[htmlPath] = { ...meta, bytes: meta.bytes + 30 };
              await writeFile(htmlPath, html);
            }
          }
        }

        // For an MML project, we only need the HTML files so we can clean up
        // any remaining JS files from the build directory and the result outputs.
        if (removeJS) {
          for (const output of Object.keys(outputs)) {
            if (jsExt.test(output)) {
              rm(output)
              delete outputs[output];
            }
          }
        }

        log("onEnd", result);
      });
    },
  })

  return makePlugin(true);
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
      .build(buildOptions).catch(() => process.exit(1));
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
