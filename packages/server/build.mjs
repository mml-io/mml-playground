import esbuild from "esbuild";
import ts from "typescript";

const tsConfig = ts.parseJsonConfigFileContent(
  {
    extends: "./tsconfig.json",
    exclude: ["node_modules"],
  },
  ts.sys,
  process.cwd(),
);

await esbuild.build({
  entryPoints: tsConfig.fileNames,
  outdir: "./dist",
  sourcemap: true,
  platform: "node",
  format: "cjs",
  target: "es2018",
});
