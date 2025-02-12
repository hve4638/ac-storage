module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js'],
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
    testMatch: ['<rootDir>/src/**/*.(spec|test).ts'],
    moduleNameMapper: {
        '^types/(.*)$': '<rootDir>/src/types/$1',
        '^features/(.*)$': '<rootDir>/src/features/$1',
    },
};
