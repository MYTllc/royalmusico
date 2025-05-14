module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended" // Integrates Prettier with ESLint
  ],
  parserOptions: {
    ecmaVersion: "latest", // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
    project: "./tsconfig.json" // Important for TypeScript linting rules
  },
  env: {
    node: true, // Enables Node.js global variables and Node.js scoping.
    es2021: true // Adds all ECMAScript 2021 globals and automatically sets the ecmaVersion parser option to 12.
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs.
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    "prettier/prettier": ["error", {
      "endOfLine":"auto"
    }]
  }
};
