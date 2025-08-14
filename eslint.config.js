import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

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
];
