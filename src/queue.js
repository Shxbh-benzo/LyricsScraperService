const Queue = require('better-queue');
const SQLiteStore = require('better-queue-sqlite');
const path = require('path');
const { Worker } = require('worker_threads');
const config = require('./config');
const resilience = require('./core/resilience');
const logger = require('./utils/logger');
const { ScrapingError } = require('./core/errors');

class LyricsQueue {
    constructor() {
        this.workers = new Map();
        this.activeWorkers = 0;
        this.failedTasks = new Set();
        this.runningTasks = new Set();
        
        this.queue = new Queue(this.processTask.bind(this), {
            store: new SQLiteStore({
                path: path.join(__dirname, '../data/queue.sqlite')
            }),
            concurrent: config.WORKER_COUNT,
            maxRetries: config.RESILIENCE.maxRetries || 3,
            retryDelay: config.RESILIENCE.retryDelay || 5000
        });

        this.initialize();
    }

    async initialize() {
        await resilience.initialize();
        await logger.initialize();
        this.setupQueueEvents();
        await logger.info('Queue system initialized');

        // recover from last checkpoint
        const checkpoint = await resilience.loadLastCheckpoint();
        if (checkpoint) {
            await logger.info('Recovered from checkpoint', { checkpoint });
        }
    }

    setupQueueEvents() {
        this.queue.on('task_finish', async (taskId, result) => {
            this.activeWorkers--;
            this.runningTasks.delete(taskId);
            
            const songId = `${result.data.artist}-${result.data.title}`.replace(/\s+/g, '_');
            resilience.updateStats(true, songId, taskId);
            
            await logger.info(`Task completed`, { 
                taskId, 
                song: result.data,
                stats: resilience.getStats()
            });
    
            const stats = resilience.getStats();
            if (stats.uniqueSongs % 10 === 0) {
                console.log(`📊 Progress: ${stats.uniqueSongs}/20 songs processed`);
            }
        });

        this.queue.on('task_failed', async (taskId, err) => {
            this.activeWorkers--;
            resilience.updateStats(false);
            this.failedTasks.add(taskId);
            await logger.error(`Task failed`, { 
                taskId, 
                error: err,
                stats: resilience.getStats()
            });
        });

        this.queue.on('task_retry', async (taskId, err) => {
            await logger.warn(`Retrying task`, { taskId, error: err });
        });

        ['SIGINT', 'SIGTERM'].forEach(signal => {
            process.on(signal, async () => {
                await logger.info('Shutdown signal received');
                await this.shutdown();
                process.exit(0);
            });
        });

        setInterval(() => {
            const stats = resilience.getStats();
            if (stats.successRate < (1 - config.RESILIENCE.errorThreshold) * 100) {
                logger.warn('High error rate detected', { stats });
            }
        }, 60000);
    }

    async processTask(song, cb) {
        try {
            let workerId = this.getFreeWorkerId();
            if (!workerId) {
                workerId = await this.createWorker();
            }

            const worker = this.workers.get(workerId);
            const taskId = `${song.artist}-${song.title}`.replace(/\s+/g, '_');
            this.runningTasks.add(taskId);
            
            worker.once('message', async (result) => {
                if (!result.success) {
                    const error = new ScrapingError(song, result.error);
                    await logger.error('Worker error', { error });
                    this.runningTasks.delete(taskId);
                    cb(error);
                    return;
                }
                cb(null, result);
            });

            worker.postMessage(song);
            this.activeWorkers++;
            
        } catch (error) {
            await logger.error('Task processing error', { error, song });
            cb(error);
        }
    }

    getFreeWorkerId() {
        for (const [id, worker] of this.workers.entries()) {
            if (worker.activeCount === 0) return id;
        }
        return null;
    }

    async createWorker() {
        const workerId = this.workers.size + 1;
        const worker = new Worker(path.join(__dirname, 'worker.js'));
        this.workers.set(workerId, worker);
        await logger.info('Created new worker', { workerId });
        return workerId;
    }

    addSong(song) {
        return new Promise((resolve, reject) => {
            this.queue.push(song, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    async shutdown() {
        await logger.info('Starting graceful shutdown');
        
        await resilience.createCheckpoint(
            Array.from(this.runningTasks),
            Array.from(this.failedTasks)
        );
    
        if (this.activeWorkers > 0) {
            await logger.info(`Waiting for ${this.activeWorkers} active workers to finish`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    
        for (const worker of this.workers.values()) {
            worker.terminate();
        }
    
        await logger.info('Shutdown complete');
        return new Promise(resolve => this.queue.destroy(resolve));
    }
}

module.exports = new LyricsQueue();