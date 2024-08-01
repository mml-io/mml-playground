import { v5 as uuidv5 } from "uuid";
import path, { relative, resolve, join } from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";

import { rimrafSync } from "rimraf";

import * as esbuild from "esbuild";

const buildMode = "--build";
const watchMode = "--watch";

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;


function rmEmptyDirs(dir: string, log?: (...args: any[]) => void) {
  if (!fs.statSync(dir).isDirectory()) {
    return;
  }
  let files = fs.readdirSync(dir);
  if (files.length > 0) {
    for (const file of files) {
      rmEmptyDirs(join(dir, file), log);
    }
    // re-evaluate files; after deleting subfolder
    // we may have parent folder empty now
    files = fs.readdirSync(dir);
  }

  if (files.length == 0) {
    log?.("Removing:", dir);
    fs.rmdirSync(dir);
    return;
  }
}

type MMLRenamer = (path: string) => string;

export function mserveRenamer(): MMLRenamer {
  return function(inPath) {
    const extname = path.extname(inPath)

    let dirname = path.dirname(inPath)
    let basename = path.basename(inPath, extname);

    const id = crypto.hash("sha1", inPath, "hex").slice(-8)

    if (basename === "index") {
      basename = path.basename(dirname);
    }

    return `${basename.slice(0, 16)}-${id}${extname}`;
  };
};

export type MMLPluginOptions = {
  verbose?: boolean;
  renamer?: (path: string) => string;
  pathPrefix?: string;
}

function mmlPlugin({
  verbose = false,
  pathPrefix = "ws:///",
  renamer,
}: MMLPluginOptions = {}
): esbuild.Plugin {
  const log = verbose ? (...args: any[]) => console.log("[mml]:", ...args) : () => { };

  const results: esbuild.BuildResult[] = [];

  const importStubs: Record<string, string> = {};

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
        const relativeOutPath = relative(outdir, outPath).replace(/\.[tj]sx?/, ".html");
        const importStub = `mml:${relativeOutPath}`;

        importStubs[relativeOutPath] = importStub;

        return { contents: importStub, loader: "text" };
      });

      // Any raw HTML files should just be copied to the build directory.
      // TODO: These could contain script tags with references to local files,
      //       we may want to consider loading and embedding them directly into the HTML.
      build.onLoad({ filter: /\.html$/ }, async (args) => {
        log("onLoad", args);
        const { path } = args;
        const contents = await fsp.readFile(path, { encoding: "utf8" });
        return { contents, loader: "copy" };
      });

      build.onEnd(async result => {
        if (!isRoot) {
          results.push(result);
          return;
        }

        // We are in the root plugin instance. All child instances have finished and
        // pushed their results into the array. Now we combine all the results into one.
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
        // Then we can delete the JavaScript file as it is no longer needed.
        const jsExt = /\.js$/;
        const outputs = result.metafile!.outputs;
        for (const [jsPath, meta] of Object.entries(outputs)) {
          if (jsExt.test(jsPath)) {
            const htmlPath = jsPath.replace(/\.js$/, ".html");
            if (!(htmlPath in outputs)) {
              const js = await fsp.readFile(jsPath, { encoding: "utf8" });
              const html = `<body></body><script>${js}</script>`;
              await fsp.writeFile(htmlPath, html);
              outputs[htmlPath] = { ...meta, bytes: meta.bytes + 30 };
            }
            fsp.rm(jsPath)
            delete outputs[jsPath]
          }
        }

        // Use the user-provided renamer to generate a new name for the files, then
        // update the filenames on disk, metafile.outputs and the importStubs (if present).
        if (renamer) {
          for (const [output, meta] of Object.entries(outputs)) {
            const path = relative(outdir, output);
            const newPath = renamer(path);
            const newOutput = relative(__dirname, join(outdir, newPath));
            log("Renaming:", path, "->", newPath);
            await fsp.rename(output, newOutput);
            if (path in importStubs) {
              importStubs[newPath] = importStubs[path];
            }
            outputs[newOutput] = meta
            delete outputs[output];
            delete importStubs[path];
          }
        }

        rmEmptyDirs(outdir, log);

        // Now we go through all of the output files and rewrite the import stubs to
        // correct output path.
        Object.keys(outputs)
          .forEach(async output => {
            let contents = await fsp.readFile(output, { encoding: "utf8" });
            for (const [path, stub] of Object.entries(importStubs)) {
              const replacement = pathPrefix + path;
              log(`Replacing(${path}):`, stub, "->", replacement);
              contents = contents.replaceAll(stub, replacement)
            }
            await fsp.writeFile(output, contents);
          });

        log("onEnd", result);
      });
    },
  })

  return makePlugin(true);
}

const outdir = path.join(__dirname, "build")

// TODO: put this behind a flag?
rimrafSync(outdir);

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["./src/playground/index.tsx"],
  outdir,
  outbase: "src",
  bundle: true,
  write: true,
  assetNames: "[dir]/[name]",
  entryNames: "[dir]/[name]",
  plugins: [mmlPlugin()],
};

const args = process.argv.splice(2);

if (args.length !== 1) {
  console.error(helpString);
  process.exit(1);
}

const mode = args[0];

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
