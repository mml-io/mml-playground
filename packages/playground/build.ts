import path from "node:path";
import url from "node:url";

import { mml } from "@mml-io/esbuild-plugin-mml";
import { mserveOutputProcessor } from "@mml-io/mserve";
import * as esbuild from "esbuild";

const buildMode = "--build";
const watchMode = "--watch";
const deployFlag = "--deploy";
const verboseFlag = "--verbose";

const args = process.argv.splice(2);

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

if (args.length === 0) {
  console.error(helpString);
  process.exit(1);
}

const [mode, deploy, verbose] = args.reduce<[string, boolean, boolean]>(
  ([mode, deploy, verbose], arg) => {
    switch (arg) {
      case buildMode:
        return [arg, deploy, verbose];
      case watchMode:
        return [arg, deploy, verbose];
      case deployFlag:
        return [mode, true, verbose];
      case verboseFlag:
        return [mode, deploy, true];
      default:
        console.error("Unknown flag:", arg);
        process.exit(1);
    }
  },
  [buildMode, false, false],
);

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outdir = path.join(__dirname, "build");

const {
  MSERVE_PROJECT,
  MSERVE_API_KEY,
  MSERVE_PROTOCOL,
  MSERVE_HOST,
  MMLHOSTING_PROTOCOL = "wss",
  MMLHOSTING_HOST,
} = process.env as { [env: string]: string };

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["src/world.ts"],
  outdir,
  bundle: true,
  minify: true,
  plugins: [
    mml({
      verbose,
      ...(deploy
        ? {
            outputProcessor: mserveOutputProcessor({
              deploy: true,
              mserve: {
                host: MSERVE_HOST!,
                protocol: MSERVE_PROTOCOL,
              },
              projectId: MSERVE_PROJECT,
              apiKey: MSERVE_API_KEY!,
            }),
            importPrefix: `${MMLHOSTING_PROTOCOL}://${MMLHOSTING_HOST}/v1/`,
          }
        : {}),
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
