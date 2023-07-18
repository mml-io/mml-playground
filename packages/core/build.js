import esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";

const buildMode = "--build";
const watchMode = "--watch";

const helpString = `Mode must be provided as one of ${buildMode} or ${watchMode}`;

const args = process.argv.splice(2);

if (args.length !== 1) {
  console.error(helpString);
  process.exit(1);
}

const mode = args[0];

const buildOptions = {
  entryPoints: ["src/index.ts"],
  write: true,
  bundle: true,
  format: "esm",
  outdir: "build",
  target: "es2020",
  platform: "node",
  packages: "external",
  sourcemap: true,
  loader: {},
  plugins: [dtsPlugin()],
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
