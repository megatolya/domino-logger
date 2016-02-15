## 2.0.2

 * fix: same for development environment (2.0.1)

## 2.0.1

 * fix: only error/errorNS methods emit errors

## 2.0.0

 * 100% compatibility with current domino logs: all methods logs fall into their own namespaces (not synonyms), log falls into stderr in `NODE_ENV=production` environment

## 1.1.1

 * `req` property is exposed in error events

## 1.1.0

 * **new**: `log/logNS` methods - synonyms to `info/infoNS`
 * **new**: `warn/warnNS` methods - synonyms to `error/errorNS`

## 1.0.1

 * build code suitable for nodejs-4 running apps with Babel

## 1.0.0

 * first release :smiley:
