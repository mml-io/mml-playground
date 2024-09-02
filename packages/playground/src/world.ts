import type { MMLWorldConfig } from "@mml-io/esbuild-plugin-mml";
// eslint-disable-next-line import/no-unresolved
import playground from "mml:./playground";

export default {
  mmlDocuments: {
    0: {
      url: playground,
    },
  },
} satisfies MMLWorldConfig;
