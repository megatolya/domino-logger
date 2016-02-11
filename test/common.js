'use strict';

const assert = require('assert');
const dominoLogger = require('../index');
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

    it('should use log/logNS methods as synonyms to info/infoNS', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();

        return intercept(() => {
            logger.log('message 1');
            logger.log('message 2');
            logger.logNS('custom', 'message NS');

            logger.info('message 1');
            logger.info('message 2');
            logger.infoNS('custom', 'message NS');
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);

            assert.strictEqual(stderrMessages.length, 6, 'stderr should have exactly 6 messages');
            assert(stderrMessages[0].includes('message 1'), 'stderr[0] should have exected message');
            assert(stderrMessages[0].includes(`${APP_NAME}:info`), 'stderr[0] should use expected namespace');
            assert(stderrMessages[1].includes('message 2'), 'stderr[1] should have exected message');
            assert(stderrMessages[1].includes(`${APP_NAME}:info`), 'stderr[1] should use expected namespace');
            assert(stderrMessages[2].includes('message NS'), 'stderr[2] should have exected message');
            assert(stderrMessages[2].includes(`${APP_NAME}:custom`), 'stderr[2] should use expected namespace');

            assert(stderrMessages[3].includes('message 1'), 'stderr[3] should have exected message');
            assert(stderrMessages[3].includes(`${APP_NAME}:info`), 'stderr[3] should use expected namespace');
            assert(stderrMessages[4].includes('message 2'), 'stderr[4] should have exected message');
            assert(stderrMessages[4].includes(`${APP_NAME}:info`), 'stderr[4] should use expected namespace');
            assert(stderrMessages[5].includes('message NS'), 'stderr[5] should have exected message');
            assert(stderrMessages[5].includes(`${APP_NAME}:custom`), 'stderr[5] should use expected namespace');
        });
    });

    it('should use warn/warnNS methods as synonyms to error/errorNS', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({emitErrors: false});

        return intercept(() => {
            logger.warn('message 1');
            logger.warn('message 2');
            logger.warnNS('custom', 'message NS');

            logger.error('message 1');
            logger.error('message 2');
            logger.errorNS('custom', 'message NS');
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);

            assert.strictEqual(stderrMessages.length, 6, 'stderr should have exactly 6 messages');
            assert(stderrMessages[0].includes('message 1'), 'stderr[0] should have exected message');
            assert(stderrMessages[0].includes(`${APP_NAME}:error`), 'stderr[0] should use expected namespace');
            assert(stderrMessages[1].includes('message 2'), 'stderr[1] should have exected message');
            assert(stderrMessages[1].includes(`${APP_NAME}:error`), 'stderr[1] should use expected namespace');
            assert(stderrMessages[2].includes('message NS'), 'stderr[2] should have exected message');
            assert(stderrMessages[2].includes(`${APP_NAME}:custom`), 'stderr[2] should use expected namespace');

            assert(stderrMessages[3].includes('message 1'), 'stderr[3] should have exected message');
            assert(stderrMessages[3].includes(`${APP_NAME}:error`), 'stderr[3] should use expected namespace');
            assert(stderrMessages[4].includes('message 2'), 'stderr[4] should have exected message');
            assert(stderrMessages[4].includes(`${APP_NAME}:error`), 'stderr[4] should use expected namespace');
            assert(stderrMessages[5].includes('message NS'), 'stderr[5] should have exected message');
            assert(stderrMessages[5].includes(`${APP_NAME}:custom`), 'stderr[5] should use expected namespace');
        });
    });
});
