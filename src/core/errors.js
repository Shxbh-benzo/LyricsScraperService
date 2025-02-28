class LyricsScraperError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

class RateLimitError extends LyricsScraperError {
    constructor(retryAfter) {
        super('Rate limit exceeded', 'RATE_LIMIT_ERROR', { retryAfter });
    }
}

class ScrapingError extends LyricsScraperError {
    constructor(songDetails, reason) {
        super('Failed to scrape lyrics', 'SCRAPING_ERROR', { songDetails, reason });
    }
}

module.exports = {
    LyricsScraperError,
    RateLimitError,
    ScrapingError
};