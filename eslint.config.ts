import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  globalIgnores([
    '**/dist/**',
    '**/dist-e2e/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    'docs/api/**',
  ]),
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  ...pluginVueA11y.configs['flat/recommended'],
  {
    name: 'app/rules',
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': 'error',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Nesting a control inside its <label> is a valid association.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },
  {
    name: 'app/tests',
    files: ['**/__tests__/**', 'tests/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  skipFormatting,
)
