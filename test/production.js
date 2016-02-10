'use strict';

const assert = require('assert');
const dominoLogger = require('../index');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger NODE_ENV=production', () => {
    it('should output debug logs in production environment', () => {
        if (process.env.NODE_ENV !== 'production') {
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

            assert(Array.isArray(stdoutMessages), 'stdout should have messages');
            assert.strictEqual(stdoutMessages.length, 1, 'stdout should have 1 message');

            assert(Array.isArray(stderrMessages), 'stderr should have messages');
            assert.strictEqual(stderrMessages.length, 2, 'stderr should have exactly 2 messages');
            assert(stderrMessages[0].includes('Error occured: error description'), 'stderr should have exected message but got: ' + stderrMessages[0]);
            assert(stderrMessages[1].includes('Error occured once more'), 'stderr should have exected message');
        });
    });

    it('should use default formatter function by default', () => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`NODE_ENV is invalid for this test: ${process.env.NODE_ENV}`);
            return;
        }

        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false
        });

        return intercept(() => {
            logger.error('Error: %s (%j)', 'error description', {foo: 'bar'});
        }).then(messages => {
            const stderrMessage = messages.get(process.stderr)[0].trim();

            // date differs so it's not necessary to check it
            let expectedMessage = dominoLogger.defaultFormat(null, APP_NAME, 'Error: error description ({"foo":"bar"})');
            const stderrDate = stderrMessage.split('\t')[0];
            expectedMessage = `${stderrDate}${expectedMessage.substr(stderrDate.length)}`;

            assert.strictEqual(stderrMessage, expectedMessage, 'Output message format is invalid');
        });
    });

    it('should use provided format', () => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`NODE_ENV is invalid for this test: ${process.env.NODE_ENV}`);
            return;
        }

        function customFormat(req, namespace, message) {
            return `guid:${req.uuid}\tuid:${req.user.uid}\tlogin:${req.user.login}\t${message}`;
        }

        const reqMock = {
            user: {
                login: 'vasya',
                uid: 100
            },
            uuid: 'a5811c65-4f4f-421f-91a1-ade039b64ccc'
        };

        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false,
            req: reqMock,
            format: customFormat
        });

        return intercept(() => {
            logger.error('Error: %s (%j)', 'error description', {foo: 'bar'});
        }).then(messages => {
            const stderrMessage = messages.get(process.stderr)[0].trim();
            const expectedMessage = customFormat(reqMock, APP_NAME, 'Error: error description ({"foo":"bar"})');

            assert.strictEqual(stderrMessage, expectedMessage, 'Output message format is invalid');
        });
    });
});
