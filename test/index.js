'use strict';

const assert = require('assert');
const dominoLogger = require('../');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger', () => {
    it('should have defined API', () => {
        assert.strictEqual(typeof dominoLogger, 'function', 'logger should be a function');
        assert.strictEqual(dominoLogger.length, 1, 'logger should have 1 argument');

        const loggerFactory = dominoLogger(APP_NAME);
        assert.strictEqual(typeof loggerFactory, 'function', 'logger factory should be a function');
    });

    it('should have defined API for instances', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();

        assert.strictEqual(typeof logger, 'object', 'logger instance should be an object');
        assert.strictEqual(typeof logger.info, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.infoNS, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.error, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.errorNS, 'function', 'logger.info should be a function');
    });

    it('should emit errors by default', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('No error event was caught'));
            }, 300);

            logger.on('error', ({namespace, message}) => {
                clearTimeout(timeout);

                assert.strictEqual(namespace, `${APP_NAME}:error`, `Namespace should be ${APP_NAME}:error`);
                assert.strictEqual(message, 'Some kind of error', `Message text is unexpected: ${message}`);

                resolve();
            });

            // do not spoil output
            intercept(() => {
                logger.error('Some kind of error');
            });
        });
    });

    it('should not emit errors if emitErrors is false', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({emitErrors: false});

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 300);

            logger.on('error', ({namespace, message}) => {
                clearTimeout(timeout);
                reject(new Error(`Unexpected error caught: ${message}`));
            });

            // do not spoil output
            intercept(() => {
                logger.error('Some kind of error');
            });
        });
    });

    it('should use provided namespace', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({namespace: 'API', emitErrors: false});

        return intercept(() => {
            logger.error('message');
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);

            assert(Array.isArray(stderrMessages), 'stderr should have messages');
            assert.strictEqual(stderrMessages.length, 1, 'stderr should have exactly 1 message');
            assert(stderrMessages[0].includes('message'), 'stderr should have exected message');
        });
    });
});
