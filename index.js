'use strict';

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
 * @return {String} result string
 */
function formatDefault(req, namespace, message) {
    return `${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}\t${namespace}\tpid:${process.pid}\t${message}`;
}

class Logger extends EventEmitter {
    constructor({req, appNamespace, namespace, emitErrors = true, format = formatDefault}) {
        super();

        this._req = req;
        this._format = format;
        this._appNamespace = appNamespace;
        this._namespace = namespace || '';
        this._emitErrors = emitErrors;
    }

    _emitError(namespace, ...args) {
        if (this._emitErrors) {
            this.emit('error', {
                namespace,
                req: this._req,
                message: util.format(...args)
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
}

class ProductionLogger extends Logger {
    _log({stream, namespace, method}, ...args) {
        if (method === 'error') {
            this._emitError(namespace, ...args);
        }

        const line = this._format(this._req, namespace, util.format(...args));
        console[stream](line);
    }
}

class DevelopmentLogger extends Logger {
    _log({stream, namespace, method}, ...args) {
        if (!developDebugFns.has(namespace)) {
            developDebugFns.set(namespace, debug(namespace));
        }

        if (method === 'error') {
            this._emitError(namespace, ...args);
        }

        const logFn = developDebugFns.get(namespace);
        logFn(...args);
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
