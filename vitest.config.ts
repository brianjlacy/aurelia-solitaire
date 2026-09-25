import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/__tests__/**/*.spec.ts'],
      setupFiles: ['./tests/setup.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov', 'json-summary'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/__tests__/**', 'src/main.ts', 'src/testing/**', 'src/**/*.d.ts'],
        thresholds: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
          'src/domain/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
          'src/utils/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
          'src/stores/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
          'src/composables/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
          'src/components/**': { lines: 80, functions: 80, branches: 75, statements: 80 },
        },
      },
    },
  }),
)
