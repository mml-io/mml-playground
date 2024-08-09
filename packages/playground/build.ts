import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

import { mml, OutputProcessorProvider } from "@mml-io/esbuild-plugin-mml";
import * as esbuild from "esbuild";
import { gzip } from "node-gzip";

const buildMode = "--build";
const watchMode = "--watch";

const args = process.argv.splice(2);

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

if (args.length !== 1) {
  console.error(helpString);
  process.exit(1);
}
const mode = args[0];

type MServerOutputProcessorOptions = {
  projectId: string;
  apiKey: string;
  mserve?: {
    protocol?: "https" | "http" | string;
    host: string;
  };
  deploy?: boolean;
};

export function mserveOutputProcessor({
  projectId,
  apiKey,
  deploy = false,
  mserve = { host: "api.mserve.io" },
}: MServerOutputProcessorOptions): OutputProcessorProvider {
  type Deployable = { id: string; name: string; importStr: string };
  const deployables: { [path: string]: Deployable } = {};

  return (log: typeof console.log) => ({
    onOutput(inPath) {
      const extname = path.extname(inPath);

      const dirname = path.dirname(inPath);
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
        log("skipping deployment");
        return;
      }

      const outputs = Object.keys(result.metafile?.outputs || {});
      log("deploying outputs to MServe", { projectId, deployables, outputs });

      type Request = {
        name: string;
        description?: string;
        enabled?: boolean;
        parameters: object;
        source: {
          type: "source";
          source: string;
        };
      };
      const url = `${mserve.protocol ?? "https"}://${mserve.host}/v1/mml-objects/${projectId}/object-instances`;
      const out = Object.keys(result.metafile?.outputs || {}).map(async (output) => {
        const deployable = deployables[path.relative(outdir, output)];
        if (!deployable) {
          return undefined;
        }
        const { name, id } = deployable;
        const source = await fsp.readFile(path.resolve(__dirname, output), { encoding: "utf8" });
        const request: Request = {
          name,
          parameters: {},
          source: {
            type: "source",
            source,
          },
        };
        log("deploying", { deployable });
        let response = await fetch(url + "/" + id, {
          method: "POST",
          body: await gzip(JSON.stringify(request)),
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "content-encoding": "gzip",
          },
        });

        if (response.status === 404) {
          log("object instance does not exist, creating...");
          response = await fetch(url, {
            method: "POST",
            body: await gzip(JSON.stringify({ ...request, id })),
            headers: {
              authorization: `Bearer ${apiKey}`,
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
        log(`deployed output ${name} to MServe`, deployable);
      });
      return Promise.all(out).then((results) => {
        const errors = results.reduce(
          (errors, error) => (error ? errors.concat(error) : errors),
          [] as esbuild.PartialMessage[],
        );
        return { errors };
      });
    },
  });
}

const outdir = path.join(__dirname, "build");

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
  plugins: [
    mml({
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
      importPrefix: `${MMLHOSTING_PROTOCOL}://${MMLHOSTING_HOST}/v1/`,
    }),
  ],
};

switch (mode) {
  case buildMode:
    esbuild.build(buildOptions).catch(() => process.exit(1));
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
