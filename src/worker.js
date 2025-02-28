const { parentPort } = require('worker_threads');
const { getSong } = require('genius-lyrics-api');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('axios-rate-limit');
const config = require('./config');
const { RateLimitError } = require('./core/errors');

const http = rateLimit(axios.create(), config.RATE_LIMIT);

// actual scraping function
async function getCustomLyrics(url) {
    try {
        const { data } = await http.get(url);
        const $ = cheerio.load(data);
        
        let lyrics = '';
        $('div[data-lyrics-container="true"]').each((i, elem) => {
            lyrics += $(elem)
                .html()
                .replace(/<br>/g, '\n')
                .replace(/<(?!\s*br\s*\/?)[^>]+>/gi, '')
                + '\n\n';
        });

        return lyrics.trim() || null;
    } catch (error) {
        if (error.response?.status === 429) {
            throw new RateLimitError(error.response.headers['retry-after']);
        }
        throw error;
    }
}

parentPort.on('message', async (song) => {
    try {
        const options = {
            apiKey: config.GENIUS_API_KEY,
            title: song.title,
            artist: song.artist,
            optimizeQuery: true
        };

        const songData = await getSong(options);
        if (!songData?.url) {
            throw new Error('No song URL found');
        }

        const lyrics = await getCustomLyrics(songData.url);
        if (!lyrics) {
            throw new Error('No lyrics found');
        }

        parentPort.postMessage({
            success: true,
            data: {
                title: song.title,
                artist: song.artist,
                url: songData.url,
                lyrics: lyrics,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message,
            details: {
                code: error.code,
                song: song
            }
        });
    }
});