module.exports = {
  // Line width
  printWidth: 100,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Semicolons
  semi: true,

  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX
  jsxSingleQuote: true,

  // Trailing commas
  trailingComma: 'es5',

  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'avoid',

  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,

  // Parser
  requirePragma: false,
  insertPragma: false,

  // Prose wrap
  proseWrap: 'preserve',

  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',

  // End of line
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // Single attribute per line
  singleAttributePerLine: false,

  // Override settings for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
      },
    },
    {
      files: '*.js',
      options: {
        parser: 'babel',
      },
    },
    {
      files: 'package.json',
      options: {
        tabWidth: 2,
        printWidth: 120,
      },
    },
    {
      files: '*.test.{js,ts}',
      options: {
        printWidth: 120, // Longer lines for test descriptions
      },
    },
    {
      files: '*.spec.{js,ts}',
      options: {
        printWidth: 120, // Longer lines for test descriptions
      },
    },
  ],
};
