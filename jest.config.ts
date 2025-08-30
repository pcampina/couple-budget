import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|js|html)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
        useESM: true,
        stringifyContentPathRegex: '\\.(html)$'
      }
    ]
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@domain/(.*)$': '<rootDir>/src/app/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/app/application/$1'
  },
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/app/**/*.ts'],
  coverageThreshold: {
    global: {
      lines: 100
    }
  }
};

export default config;
