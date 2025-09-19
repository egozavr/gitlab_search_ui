/** @type {import("prettier").Config} */
export default {
  printWidth: 140,
  singleQuote: true,
  arrowParens: 'avoid',
  htmlWhitespaceSensitivity: 'ignore',
  overrides: [
    {
      files: '*.html',
      options: {
        parser: 'angular',
      },
    },
  ],
};
