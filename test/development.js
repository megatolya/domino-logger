'use strict';

const assert = require('assert');
const dominoLogger = require('../');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger NODE_ENV=development', () => {
    it('should output debug logs in development environment', () => {
        if (process.env.NODE_ENV === 'production') {
            console.warn(`NODE_ENV is invalid for this test: ${process.env.NODE_ENV}`);
            return;
        }

        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false
        });

        return intercept(() => {
            logger.error('Error occured: %s', 'error description');
            logger.error('Error occured once more');
            logger.info('What a nice weather today!');
        }).then(messages => {
            const stdoutMessages = messages.get(process.stdout);
            const stderrMessages = messages.get(process.stderr);

            assert(Array.isArray(stdoutMessages), 'stdout should not have messages');
            assert.strictEqual(stdoutMessages.length, 0, 'stdout should not have messages');

            assert(Array.isArray(stderrMessages), 'stderr should have messages');
            assert.strictEqual(stderrMessages.length, 3, 'stderr should have exactly 3 messages');
            assert(stderrMessages[0].includes('Error occured: error description'), 'stderr should have exected message');
            assert(stderrMessages[1].includes('Error occured once more'), 'stderr should have exected message');
            assert(stderrMessages[2].includes('What a nice weather today!'), 'stderr should also contain info-message because debug uses stderr by default');
        });
    });
});
