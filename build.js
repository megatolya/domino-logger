'use strict';

const EventEmitter = require('events');
const util = require('util');
const debug = require('debug');
const moment = require('moment');
const developDebugFns = new Map();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Default formatter function for production environment
 *
 * @param {http.IncomingMessage} req
 * @param {String} namespace
 * @param {String} message
 * @param {Object} [extra]
 * @return {String} result string
 */
function formatDefault(req, namespace, message, extra) {
    return `${ moment().format('YYYY-MM-DD HH:mm:ss.SSS') }\t${ namespace }\tpid:${ process.pid }\t${ message }${ extra && Object.keys(extra).length > 0 ? `\t${ JSON.stringify(extra) }` : '' }`;
}

class Logger extends EventEmitter {
    constructor(_ref) {
        let req = _ref.req;
        let appNamespace = _ref.appNamespace;
        let namespace = _ref.namespace;
        var _ref$emitErrors = _ref.emitErrors;
        let emitErrors = _ref$emitErrors === undefined ? true : _ref$emitErrors;
        var _ref$format = _ref.format;
        let format = _ref$format === undefined ? formatDefault : _ref$format;

        super();

        this._req = req;
        this._format = typeof format === 'function' ? format : f => f;
        this._appNamespace = appNamespace;
        this._namespace = namespace || '';
        this._emitErrors = emitErrors;
    }

    _emitError(namespace, message) {
        if (this._emitErrors) {
            this.emit('error', {
                namespace,
                req: this._req,
                message
            });
        }
    }

    info() {
        this._log.apply(this, [{
            stream: 'log',
            method: 'info',
            namespace: `${ this._namespace }:info`
        }].concat(Array.prototype.slice.call(arguments)));
    }

    infoNS(namespace) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
        }

        this._log.apply(this, [{
            stream: 'log',
            method: 'info',
            namespace: `${ this._appNamespace }:${ namespace }`
        }].concat(args));
    }

    error() {
        this._log.apply(this, [{
            stream: 'error',
            method: 'error',
            namespace: `${ this._namespace }:error`
        }].concat(Array.prototype.slice.call(arguments)));
    }

    errorNS(namespace) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
        }

        this._log.apply(this, [{
            stream: 'error',
            method: 'error',
            namespace: `${ this._appNamespace }:${ namespace }`
        }].concat(args));
    }

    warn() {
        this._log.apply(this, [{
            stream: 'error',
            method: 'warn',
            namespace: `${ this._namespace }:warn`
        }].concat(Array.prototype.slice.call(arguments)));
    }

    warnNS(namespace) {
        for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
            args[_key3 - 1] = arguments[_key3];
        }

        this._log.apply(this, [{
            stream: 'error',
            method: 'warn',
            namespace: `${ this._appNamespace }:${ namespace }`
        }].concat(args));
    }

    log() {
        this._log.apply(this, [{
            stream: 'error',
            method: 'log',
            namespace: `${ this._namespace }:log`
        }].concat(Array.prototype.slice.call(arguments)));
    }

    logNS(namespace) {
        for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
            args[_key4 - 1] = arguments[_key4];
        }

        this._log.apply(this, [{
            stream: 'error',
            method: 'log',
            namespace: `${ this._appNamespace }:${ namespace }`
        }].concat(args));
    }

    _splitArguments() {
        // @link https://nodejs.org/api/util.html#util_util_format_format_args
        // Trying to find placeholders in first argument
        // And then calculate all arguments
        // Maybe last one is object, which we should pass to formatter as a separate argument
        let extra;

        for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
            args[_key5] = arguments[_key5];
        }

        if (args.length > 1) {
            let placeholders;

            if (typeof args[0] === 'string') {
                placeholders = args[0].match(/%(s|d|j|%)/ig);
            }

            const hasPlaceholdersWithMap = placeholders && args.length - 1 > placeholders.length;
            const hasNoPlaceholdersWithMap = !placeholders && args.length > 1;
            const lastArgument = args[args.length - 1];

            if ((hasPlaceholdersWithMap || hasNoPlaceholdersWithMap) && typeof lastArgument === 'object' && lastArgument !== null) {
                extra = args.pop();
            }
        }

        const message = util.format.apply(util, args);

        return {
            extra,
            message
        };
    }

    logRequest() {}

    fields() {}
}

class ProductionLogger extends Logger {
    /**
     * @override
     */
    _log(_ref2) {
        let stream = _ref2.stream;
        let namespace = _ref2.namespace;
        let method = _ref2.method;

        for (var _len6 = arguments.length, args = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
            args[_key6 - 1] = arguments[_key6];
        }

        var _splitArguments = this._splitArguments.apply(this, args);

        const message = _splitArguments.message;
        const extra = _splitArguments.extra;

        const line = this._format(this._req, namespace, message, extra);

        if (method === 'error') {
            this._emitError(namespace, message);
        }

        this._logLine(stream, line);
    }

    _logLine(method, line) {
        /* eslint-disable no-console */
        console[method](line);
        /* eslint-enable no-console */
    }
}

class QloudLogger extends ProductionLogger {
    fields(fields) {
        this._req._logFields = this._req._logFields || {};
        Object.assign(this._req._logFields, fields);
    }

    logRequest() {
        const logs = this._req && this._req._logs;

        if (!logs) {
            return;
        }

        /* eslint-disable no-console */
        console.log(JSON.stringify({
            message: logs.join('\n'),
            '@fields': this._req._logFields
        }));
        /* eslint-enable no-console */

        this._req._logs = [];
    }

    _logLine(method, line) {
        if (this._req) {
            const logs = this._req._logs = this._req._logs || [];
            logs.push(line);
        } else {
            super._logLine(method, line);
        }
    }
}

class DevelopmentLogger extends Logger {
    /**
     * @override
     */
    _log(_ref3) {
        let stream = _ref3.stream;
        let namespace = _ref3.namespace;
        let method = _ref3.method;

        for (var _len7 = arguments.length, args = Array(_len7 > 1 ? _len7 - 1 : 0), _key7 = 1; _key7 < _len7; _key7++) {
            args[_key7 - 1] = arguments[_key7];
        }

        var _splitArguments2 = this._splitArguments.apply(this, args);

        let message = _splitArguments2.message;
        let extra = _splitArguments2.extra;

        extra = extra && Object.keys(extra).length ? JSON.stringify(extra) : null;
        const line = [message, extra].filter(Boolean).join(' ');

        if (!developDebugFns.has(namespace)) {
            developDebugFns.set(namespace, debug(namespace));
        }

        if (method === 'error') {
            this._emitError(namespace, line);
        }

        const logFn = developDebugFns.get(namespace);

        logFn(line);
    }
}

module.exports = function (appNamespace) {
    /**
     * Create new instance of Logger
     *
     * @param {Object} [options]
     *   @param {http.IncomingMessage} [options.req = null] incoming request
     *   @param {Function} [options.format = null] formatting log function (used only in production environment)
     *   @param {String} [options.namespace = null] namespace for logs
     *   @param {Boolean} [options.emitErrors = true] emit errors when logger.error is called
     * @return {Logger}
     */
    return function exportsLogger() {
        let options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        const instanceOptions = Object.assign({
            appNamespace,
            req: null,
            format: undefined,
            namespace: null,
            emitErrors: true,
            qloud: false
        }, options);

        instanceOptions.namespace = options.namespace ? `${ appNamespace }:${ options.namespace.toLowerCase() }` : appNamespace;

        if (instanceOptions.qloud) {
            return new QloudLogger(instanceOptions);
        }

        return IS_PRODUCTION ? new ProductionLogger(instanceOptions) : new DevelopmentLogger(instanceOptions);
    };
};

// also export default format function for tests
module.exports.defaultFormat = formatDefault;
