import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react-hooks';

export default tseslint.config({
  ignores: ['dist/**'],
  files: ['src/**/*.{ts,tsx}'],
  extends: [tseslint.configs.recommended, react.configs['recommended-latest']],
  settings: { react: { version: 'detect' } },
});
