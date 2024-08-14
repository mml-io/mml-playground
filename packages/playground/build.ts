import path from "node:path";

import { mml } from "@mml-io/esbuild-plugin-mml";
import { mserveOutputProcessor } from "@mml-io/mserve";
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
