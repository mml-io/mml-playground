import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

const config = {
  entryPoints: ["src/index.ts"],
  assetNames: "[dir]/[name]-[hash]",
  bundle: true,
  outdir: "./dist",
  metafile: true,
  sourcemap: true,
  publicPath: "/",
  platform: "browser",
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
        to: ["./dist/"],
        keepStructure: true,
      },
    }),
  ],
};

// Serve build, watch for changes and live reload
if (process.argv.includes("--serve")) {
  const ctx = await esbuild.context({
    ...config,
    banner: {
      js: ` (() => new EventSource('/esbuild').addEventListener('change', () => location.reload()))();`,
    },
  });

  if (process.argv.includes("--watch")) await ctx.watch();

  const { host, port } = await ctx.serve({
    servedir: "./dist",
    host: process.env.HOST || "localhost",
    port: Number(process.env.PORT || 3000),
  });

  console.log(`Serving client on ${host}:${port}`);
}

// Only build
else {
  await esbuild.build(config);
}
