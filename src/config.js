module.exports = {
    GENIUS_API_KEY: 'RemovedForNow',
    WORKER_COUNT: 4,
    RATE_LIMIT: {
        maxRequests: 10,
        perMilliseconds: 60000
    },
    BATCH_SIZE: 5,
    DELAYS: {
        BETWEEN_SONGS: 2000,
        BETWEEN_BATCHES: 30000
    },
    RESILIENCE: {
        checkpointInterval: 10,
        maxRetries: 3,
        retryDelay: 5000,
        errorThreshold: 0.1
    }
};