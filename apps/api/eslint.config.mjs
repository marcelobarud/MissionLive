import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: ['dist/**'],
  files: ['src/**/*.ts', 'test/**/*.ts'],
  extends: [tseslint.configs.recommended],
});
