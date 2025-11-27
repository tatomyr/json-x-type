import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
      extension: ['.js'],
      all: true,
      include: ['applications/**/*.js'],
    },
    snapshotFormat: {
      escapeString: false,
    },
  },
})
