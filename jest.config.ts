import type { Config } from 'jest';
import { createCjsPreset } from 'jest-preset-angular/presets';

const preset = createCjsPreset();

const config: Config = {
  ...preset,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$'
      }
    ]
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@domain/(.*)$': '<rootDir>/src/app/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/app/application/$1'
  },
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['src/app/**/*.{ts,html}']
};

export default config;
