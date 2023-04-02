// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@tryhackme/tooling-config/patch/modern-name-resolution');

module.exports = {
  extends: ['./node_modules/@tryhackme/tooling-config/eslint/react'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['vite.config.ts', 'tailwind.config.js'],
  rules: {
    "@typescript-eslint/no-misused-promises": [
      "error",
      {"checksVoidReturn": {"attributes": false}}
    ],
    'jsx-a11y/label-has-associated-control': ['error', {
      labelComponents: [],
      labelAttributes: [],
      controlComponents: [],
      assert: 'either',
      depth: 25
    }],
    '@typescript-eslint/no-use-before-define': 'off',
  }
};
