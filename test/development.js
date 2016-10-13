'use strict';

const assert = require('assert');
const dominoLogger = require('../index');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger NODE_ENV=development', () => {
    it('should output debug logs in development environment', () => {
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

    it('should emit errors only for error/errorNS', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();
        const errors = [];

        logger.on('error', err => errors.push(err));

        return intercept(() => {
            logger.error('message without NS');
            logger.errorNS('custom', 'message with NS');
            logger.log('another message');
        }).then(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    assert.strictEqual(errors.length, 2, 'Only 2 errors should have been emitted');
                    resolve();
                }, 300);
            });
        });
    });

    it('should contains stringify JSON on log message', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();
        const expectedMessage = JSON.stringify({key: 'value'});

        return intercept(() => {
            logger.log('some message', new Map([['key', 'value']]));
        }).then(messages => {
            assert(messages.get(process.stderr)[0].includes(expectedMessage));
        });
    });
});
