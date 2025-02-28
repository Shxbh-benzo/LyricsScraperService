const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../data/logs');
        this.currentDate = new Date().toISOString().split('T')[0];
        this.logFile = path.join(this.logDir, `scraper-${this.currentDate}.log`);
    }

    async initialize() {
        await fs.mkdir(this.logDir, { recursive: true });
    }

    async log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        await fs.appendFile(
            this.logFile,
            JSON.stringify(logEntry) + '\n'
        );

        console[level](message, meta);
    }

    async error(message, meta) {
        await this.log('error', message, meta);
    }

    async info(message, meta) {
        await this.log('info', message, meta);
    }

    async warn(message, meta) {
        await this.log('warn', message, meta);
    }
}

module.exports = new Logger();