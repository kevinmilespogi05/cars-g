import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'dev-dist'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
        global: 'readonly',
      },
    },
  },
  // Special configuration for service worker files
  {
    files: ['**/sw.js', '**/workbox-*.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        self: 'readonly',
        importScripts: 'readonly',
        caches: 'readonly',
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBObjectStore: 'readonly',
        IDBIndex: 'readonly',
        IDBCursor: 'readonly',
        IDBTransaction: 'readonly',
        IDBRequest: 'readonly',
        DOMException: 'readonly',
        URL: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
        ExtendableEvent: 'readonly',
        FetchEvent: 'readonly',
        registration: 'readonly',
        define: 'readonly',
        _: 'readonly',
        _extends: 'readonly',
      },
    },
  },
  // Cypress E2E tests - provide Cypress globals to avoid no-undef
  {
    files: ['cypress/**', 'cypress/**/*.js', 'cypress/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.cypress,
      },
    },
  },
  // Unit tests (Jest) and __tests__ folders - provide jest globals
  {
    files: ['**/__tests__/**', '**/*.spec.js', '**/*.test.js', '**/*.spec.ts', '**/*.test.ts', '**/*.spec.tsx', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
];
