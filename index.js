'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const util = require('util');
const debug = require('debug');
const moment = require('moment');
const developDebugFns = new Map();

const IS_PRODUCTION = (process.env.NODE_ENV === 'production');

/**
 * Default formatter function for production environment
 *
 * @param {http.IncomingMessage} req
 * @param {String} namespace
 * @param {String} message
 * @param {Map} [map]
 * @return {String} result string
 */
function formatDefault(req, namespace, message, map) {
    let obj = {};

    if (map instanceof Map) {
        map.forEach((value, key) => {
            obj[key] = value;
        });
    }

    return `${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}\t${namespace}\tpid:${process.pid}\t${message}${obj.length > 0 ? `\t${JSON.stringify(obj)}` : ''}`;
}

function convertMapToObject(map) {
    let obj = {};

    if (map instanceof Map) {
        map.forEach((value, key) => {
            obj[key] = value;
        });
    }

    return obj;
}

class Logger extends EventEmitter {
    constructor({req, appNamespace, namespace, emitErrors = true, format = formatDefault}) {
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
        this._log({
            stream: 'log',
            method: 'info',
            namespace: `${this._namespace}:info`
        }, ...arguments);
    }

    infoNS(namespace, ...args) {
        this._log({
            stream: 'log',
            method: 'info',
            namespace: `${this._appNamespace}:${namespace}`
        }, ...args);
    }

    error() {
        this._log({
            stream: 'error',
            method: 'error',
            namespace: `${this._namespace}:error`
        }, ...arguments);
    }

    errorNS(namespace, ...args) {
        this._log({
            stream: 'error',
            method: 'error',
            namespace: `${this._appNamespace}:${namespace}`
        }, ...args);
    }

    warn() {
        this._log({
            stream: 'error',
            method: 'warn',
            namespace: `${this._namespace}:warn`
        }, ...arguments);
    }

    warnNS(namespace, ...args) {
        this._log({
            stream: 'error',
            method: 'warn',
            namespace: `${this._appNamespace}:${namespace}`
        }, ...args);
    }

    log() {
        this._log({
            stream: 'error',
            method: 'log',
            namespace: `${this._namespace}:log`
        }, ...arguments);
    }

    logNS(namespace, ...args) {
        this._log({
            stream: 'error',
            method: 'log',
            namespace: `${this._appNamespace}:${namespace}`
        }, ...args);
    }

    _splitArguments(...args) {
        // @link https://nodejs.org/api/util.html#util_util_format_format_args
        // Trying to find placeholders in first argument
        // And then calculate all arguments
        // Maybe last one is object, which we should pass to formatter as a separate argument
        let map;

        if (args.length > 1 && typeof args[0] === 'string') {
            const placeholders = args[0].match(/%(s|d|j|%)/ig);
            const hasPlaceholdersWithMap = placeholders && args.length - 1 > placeholders.length;
            const hasNoPlaceholdersWithMap = !placeholders && args.length > 1;
            let lastArgument = args[args.length - 1];

            if ((hasPlaceholdersWithMap || hasNoPlaceholdersWithMap) && (lastArgument instanceof Map)) {
                map = args.pop();
            }
        }

        const message = util.format(...args);

        return {
            map,
            message
        };
    }
}

class ProductionLogger extends Logger {
    /**
     * @override
     */
    _log({stream, namespace, method}, ...args) {
        const {message, map} = this._splitArguments(...args);
        const line = this._format(this._req, namespace, message, map);

        if (method === 'error') {
            this._emitError(namespace, message);
        }

        console[stream](line);
    }
}

class DevelopmentLogger extends Logger {
    /**
     * @override
     */
    _log({stream, namespace, method}, ...args) {
        const {message, map} = this._splitArguments(...args);
        let obj = convertMapToObject(map);
        obj = Object.keys(obj).length ? JSON.stringify(obj) : null;
        const line = [message, obj].filter(Boolean).join(' ');

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
    return function exportsLogger(options = {}) {
        const instanceOptions = Object.assign({
            appNamespace,
            req: null,
            format: undefined,
            namespace: null,
            emitErrors: true
        }, options);

        instanceOptions.namespace = options.namespace
            ? `${appNamespace}:${options.namespace.toLowerCase()}`
            : appNamespace;

        return IS_PRODUCTION
            ? new ProductionLogger(instanceOptions)
            : new DevelopmentLogger(instanceOptions);
    }
};

// also export default format function for tests
module.exports.defaultFormat = formatDefault;
