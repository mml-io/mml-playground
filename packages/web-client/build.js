import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

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
  entryPoints: {
    index: "src/index.ts",
  },
  bundle: true,
  write: true,
  outdir: "./build/",
  assetNames: "[dir]/[name]-[hash]",
  target: "es2020",
  loader: {
    ".svg": "file",
    ".png": "file",
    ".jpg": "file",
  },
  plugins: [
    copy({
      resolveFrom: "cwd",
      assets: {
        from: ["./public/**/*"],
        to: ["./build/"],
        keepStructure: true,
      },
    }),
  ],
};

switch (mode) {
  case buildMode:
    esbuild.build(buildOptions).catch(() => process.exit(1));
    break;
  case watchMode:
    esbuild
      .context({ ...buildOptions, banner: {
          js: ` (() => new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://")+window.location.host+'/web-client-build').addEventListener('message', () => location.reload()))();`,
        }, })
      .then((context) => context.watch())
      .catch(() => process.exit(1));
    break;
  default:
    console.error(helpString);
}
