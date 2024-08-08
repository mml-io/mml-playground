import { gzip } from "node-gzip";
import lockfile from "proper-lockfile";
import path, { relative, resolve, join } from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";

import * as esbuild from "esbuild";

const buildMode = "--build";
const watchMode = "--watch";

const args = process.argv.splice(2);

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

if (args.length !== 1) {
  console.error(helpString);
  process.exit(1);
}

const mode = args[0];

const jsExt = /\.js$/;

function cleanupJS(path: string, log?: (...args: any[]) => void) {
  const stat = fs.statSync(path);
  const isJS = stat.isFile() && jsExt.test(path);
  if (isJS) {
    fs.rmSync(path);
    return;
  }
  if (!stat.isDirectory()) {
    return;
  }
  let files = fs.readdirSync(path);
  if (files.length > 0) {
    for (const file of files) {
      cleanupJS(join(path, file), log);
    }
    // re-evaluate files; after deleting subfolder
    // we may have parent folder empty now
    files = fs.readdirSync(path);
  }

  if (files.length == 0) {
    log?.("Removing:", path);
    fs.rmdirSync(path);
    return;
  }
}


type OutputProcessorResult = {
  path?: string;
  importStr?: string;
};


type MaybePromise<T> = Promise<T> | T;

interface OutputProcessor {
  onOutput(path: string): MaybePromise<OutputProcessorResult | void>;
  onEnd?(outdir: string, result: esbuild.BuildResult): MaybePromise<esbuild.OnEndResult | void>;
};

type OutputProcessorProvider = (log: typeof console.log) => OutputProcessor;

type MServerOutputProcessorOptions = {
  projectId: string;
  apiKey: string;
  mserve?: {
    protocol?: "https" | "http" | string;
    host: string;
  },
  deploy?: boolean
};

export function mserveOutputProcessor({
  projectId,
  apiKey,
  deploy = false,
  mserve = { host: "api.mserve.io" },
}: MServerOutputProcessorOptions): OutputProcessorProvider {
  type Deployable = { id: string; name: string, importStr: string };
  const deployables: { [path: string]: Deployable } = {};

  return (log: typeof console.log) => ({
    onOutput(inPath) {
      const extname = path.extname(inPath)

      let dirname = path.dirname(inPath)
      let name = path.basename(inPath, extname);

      if (name === "index") {
        name = path.basename(dirname);
      }

      const id = `${name.slice(0, 16)}-${crypto.hash("sha1", inPath, "hex").slice(-6)}`;

      const importStr = `${projectId}_${id}`;

      deployables[inPath] = { name, id, importStr };

      return { importStr };
    },
    async onEnd(outdir, result) {
      if (!deploy) {
        log("skipping deployment")
        return;
      }

      const outputs = Object.keys(result.metafile?.outputs || {});
      log("deploying outputs to MServe", { projectId, deployables, outputs });

      type Request = {
        name: string;
        description?: string;
        enabled?: boolean;
        source: {
          type: "source",
          source: string;
        }
      }
      const url = `${mserve.protocol ?? "https"}://${mserve.host}/v1/mml-objects/${projectId}/object-instances`;
      const out = Object.keys(result.metafile?.outputs || {})
        .map(async output => {
          const deployable = deployables[path.relative(outdir, output)];
          if (!deployable) {
            return undefined;
          }
          const { name, id } = deployable;
          const source = await fsp.readFile(path.resolve(__dirname, output), { encoding: "utf8" })
          const request: Request = {
            name,
            source: {
              type: "source",
              source,
            }
          };
          log("deploying", { deployable });
          let response = await fetch(url + '/' + id, {
            method: "POST",
            body: await gzip(JSON.stringify(request)),
            headers: {
              "authorization": `Bearer ${apiKey}`,
              "content-type": "application/json",
              "content-encoding": "gzip",
            },
          });

          console.log(apiKey)
          if (response.status === 404) {
            log("object instance does not exist, creating...");
            response = await fetch(url, {
              method: "POST",
              body: await gzip(JSON.stringify({ ...request, id })),
              headers: {
                "authorization": `Bearer ${apiKey}`,
                "content-type": "application/json",
                "content-encoding": "gzip",
              },
            });
          }
          if (response.status !== 200) {
            const { status } = response;
            const message = await response.text();
            log("failed to deploy object instance", { deployable, status, message });
            return {
              text: "",
              detail: {
                status: response.status,
                message: await response.text(),
              },
            };
          }
          log(`deployed output ${name} to MServe`, deployable)
        });
      return Promise.all(out)
        .then(results => {
          const errors = results.reduce((errors, error) => error ? errors.concat(error) : errors, [] as esbuild.PartialMessage[])
          console.log("errors", errors);
          return { errors };
        })
    },
  })
};

export type MMLPluginOptions = {
  verbose?: boolean;
  outputProcessor?: OutputProcessorProvider;
  pathPrefix?: string;
}

function mmlPlugin({
  verbose = false,
  pathPrefix = "ws:///",
  outputProcessor: outputProcessorProvider
}: MMLPluginOptions = {}
): esbuild.Plugin {
  const log = verbose ? (...args: any[]) => console.log("[mml]:", ...args) : () => { };
  let results: esbuild.BuildResult[] = [];
  let importStubs: Record<string, string> = {};

  // We create a new non-root instance of the plugin anytime we need to run a child build process
  // This signifies to the the child plugin that it should store its result in the `results` array
  // so that the root instance can merge them for the final result.
  const makePlugin = (isRoot: boolean = false): esbuild.Plugin => ({
    name: "mml",
    setup(build) {
      // We rely on the metfile to perform JS-to-HTML embedding and file renames.
      build.initialOptions.metafile = true;
      const outdir = resolve(__dirname, build.initialOptions.outdir ?? "build");

      build.onStart(async () => {
        if (isRoot) {
          log("onStart: acquiring lock on build directory");
          fs.rmSync(outdir, { recursive: true, force: true });
          fs.mkdirSync(outdir, { recursive: true });
          try {
            lockfile.lockSync(outdir);
          } catch (error) {
            return {
              errors: [{ text: "failed to acquire lock on build directory", detail: error }]
            }
          }

          results = [];
          importStubs = {};
        }
      });

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
        const importStub = `mml:${relativeOutPath} `;

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

        const outputProcessor = outputProcessorProvider?.(log);

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

        if (result.errors.length > 0) {
          log("onEnd: errors in build, releasing lock on build directory");
          lockfile.unlockSync(outdir);
          return;
        }

        // If we have a any js files, that do not have a corresponding HTML file,
        // we need to create one and embed the JavaScript into a <script> tag.
        // Then we can delete the JavaScript file as it is no longer needed.
        const outputs = result.metafile!.outputs;
        for (const [jsPath, meta] of Object.entries(outputs)) {
          if (jsExt.test(jsPath)) {
            const htmlPath = jsPath.replace(/\.js$/, ".html");
            if (!(htmlPath in outputs)) {
              delete outputs[jsPath]
              const js = await fsp.readFile(jsPath, { encoding: "utf8" });
              const html = `< body > </body><script>${js}</script > `;
              await fsp.writeFile(htmlPath, html);
              outputs[htmlPath] = { ...meta, bytes: meta.bytes + 30 };
            }
          }
        }

        // Use the user-provided renamer to generate a new name for the files, then
        // update the filenames on disk, metafile.outputs and the importStubs (if present).
        if (outputProcessor) {
          for (const [output, meta] of Object.entries(outputs)) {
            const path = relative(outdir, output);
            const result = await outputProcessor.onOutput(path);
            if (!result) {
              continue;
            }
            const { path: newPath = path, importStr: newImport = newPath } = result;
            if (newPath !== path) {
              const newOutput = relative(__dirname, join(outdir, newPath));
              log("Renaming:", path, "->", newPath);
              await fsp.rename(output, newOutput);
              outputs[newOutput] = meta
              delete outputs[output];
            }
            if (newImport !== path && path in importStubs) {
              importStubs[newImport] = importStubs[path];
              delete importStubs[path];
            }
          }
        }

        cleanupJS(outdir, log);

        // Now we go through all of the output files and rewrite the import stubs to
        // correct output path.
        await Promise.all(
          Object.keys(outputs)
            .map(async output => {
              let contents = await fsp.readFile(output, { encoding: "utf8" });
              for (const [path, stub] of Object.entries(importStubs)) {
                const replacement = pathPrefix + path;
                log("Replacing import stub:", { path, stub, replacement, output });
                contents = contents.replaceAll(stub, replacement)
              }
              await fsp.writeFile(output, contents);
            })
        );

        const res = await outputProcessor?.onEnd?.(outdir, result);

        log("onEnd: releasing lock on build directory");
        lockfile.unlockSync(outdir);

        log("onEnd", result);
        return res;
      });
    },
  })

  return makePlugin(true);
}

const outdir = path.join(__dirname, "build")

const {
  MSERVE_PROJECT_ID,
  MSERVE_API_KEY,
  MSERVE_PROTOCOL,
  MSERVE_HOST,
  MMLHOSTING_PROTOCOL = "wss",
  MMLHOSTING_HOST,
} = process.env as { [env: string]: string };

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["./src/playground/index.tsx"],
  outdir,
  outbase: "src",
  minify: true,
  bundle: true,
  write: true,
  assetNames: "[dir]/[name]",
  sourcemap: false,
  entryNames: "[dir]/[name]",
  plugins: [mmlPlugin({
    outputProcessor: mserveOutputProcessor({
      deploy: true,
      mserve: {
        host: MSERVE_HOST!,
        protocol: MSERVE_PROTOCOL,
      },
      projectId: MSERVE_PROJECT_ID!,
      apiKey: MSERVE_API_KEY!,
    }),
    verbose: true,
    pathPrefix: `${MMLHOSTING_PROTOCOL}://${MMLHOSTING_HOST}/v1/`,
  })],
};

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
