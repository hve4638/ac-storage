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
        '^types$': '<rootDir>/src/types/index',
        '^types/(.*)$': '<rootDir>/src/types/$1',
        '^features/(.*)$': '<rootDir>/src/features/$1',
        '^data/(.*)$': '<rootDir>/src/data/$1',
        '^errors/(.*)$': '<rootDir>/src/errors/$1',
        '^errors$': '<rootDir>/src/errors/index',
        '^utils$': '<rootDir>/src/utils/index',
        '^utils/(.*)$': '<rootDir>/src/utils/$1',
    },
};
