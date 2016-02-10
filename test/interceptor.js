'use strict';

module.exports = function intercept(callback) {
    const streams = ['stderr', 'stdout'];
    const originalWrites = new Map;
    const interceptedData = new Map;

    for (let streamName of streams) {
        const stream = process[streamName];

        originalWrites.set(stream, stream.write.bind(stream));
        interceptedData.set(stream, []);

        stream.write = function () {
            interceptedData.get(stream).push(arguments[0]);
            return stream;
        };
    }

    return new Promise(resolve => {
        callback();

        process.nextTick(() => {
            // restore original write functions
            for (let streamName of streams) {
                const stream = process[streamName];
                stream.write = originalWrites.get(stream);
            }

            resolve(interceptedData);
        });
    });
};
