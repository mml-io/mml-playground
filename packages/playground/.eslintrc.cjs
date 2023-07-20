module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    jest: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: ["plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          {
            assertionStyle: "as",
            objectLiteralTypeAssertions: "allow",
          },
        ],
      },
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
  ],
  plugins: ["react", "react-hooks", "@typescript-eslint", "import", "prettier"],
  parser: "@typescript-eslint/parser",
  rules: {
    "jsx-quotes": ["error", "prefer-double"],
    "quote-props": ["error", "as-needed"],
    "object-shorthand": ["error", "always"],
    "no-unused-vars": "off",
    "no-var": ["error"],
    "no-console": "off",
    "import/order": [
      "error",
      {
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
        groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always",
        pathGroups: [
          {
            pattern: "~*",
            group: "internal",
          },
          {
            pattern: "~*/*",
            group: "internal",
          },
        ],
      },
    ],
    "sort-imports": [
      "error",
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
      },
    ],
    "prettier/prettier": ["warn"],
    eqeqeq: ["error", "always", { null: "ignore" }],
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx", ".js", ".jsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "tsconfig.json",
      },
    },
    "import/internal-regex": "^~",
    react: {
      version: "18.2",
    },
  },
};
