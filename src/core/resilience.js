const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class ResilienceManager extends EventEmitter {
    constructor() {
        super();
        this.checkpointDir = path.join(__dirname, '../../data/checkpoints');
        this.stats = {
            processed: 0,
            failed: 0,
            retries: 0, 
            startTime: Date.now(),
            lastCheckpoint: null
        };
        this.processedSongs = new Set();
        this.processedTasks = new Set()
    }

    async initialize() {
        await fs.mkdir(this.checkpointDir, { recursive: true });
        await this.loadLastCheckpoint();
    }

    async createCheckpoint(processedSongs, failedSongs) {
        const timestamp = new Date().toISOString();
        const checkpoint = {
            timestamp,
            processed: processedSongs,
            failed: failedSongs,
            stats: {
                ...this.stats,
                actualProcessed: this.processedSongs.size,
                totalTasks: this.processedTasks.size
            }
        };

        const filename = `checkpoint-${timestamp.replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(
            path.join(this.checkpointDir, filename),
            JSON.stringify(checkpoint, null, 2)
        );

        this.stats.lastCheckpoint = timestamp;
        await logger.info('Checkpoint created', { checkpoint });
        this.emit('checkpoint:created', checkpoint);
    }

    async loadLastCheckpoint() {
        try {
            const files = await fs.readdir(this.checkpointDir);
            const checkpoints = files.filter(f => f.startsWith('checkpoint-'));
            
            if (checkpoints.length === 0) return null;

            const lastCheckpoint = checkpoints.sort().pop();
            const data = await fs.readFile(
                path.join(this.checkpointDir, lastCheckpoint),
                'utf8'
            );

            return JSON.parse(data);
        } catch (error) {
            await logger.error('Failed to load checkpoint', { error });
            return null;
        }
    }

    updateStats(success, songId, taskId) {
        this.processedTasks.add(taskId);
        if (success && !this.processedSongs.has(songId)) {
            this.processedSongs.add(songId);
            this.stats.processed = this.processedSongs.size;
        } else if (!success) {
            this.stats.failed++;
        }
        
        this.emit('stats:updated', this.getStats());
    }

    getStats() {
        return {
            ...this.stats,
            runtime: Date.now() - this.stats.startTime,
            successRate: (this.stats.processed / (this.stats.processed + this.stats.failed)) * 100,
            uniqueSongs: this.processedSongs.size,
            totalTasks: this.processedTasks.size
        };
    }
}

module.exports = new ResilienceManager();