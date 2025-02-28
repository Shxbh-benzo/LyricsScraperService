const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(
            path.join(__dirname, '../data/lyrics.sqlite')
        );
        this.init();
    }

    async init() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS lyrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                artist TEXT,
                url TEXT,
                lyrics TEXT,
                timestamp TEXT,
                UNIQUE(title, artist)
            )
        `);
    }

    async saveLyrics(song) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO lyrics (title, artist, url, lyrics, timestamp)
                 VALUES (?, ?, ?, ?, ?)`,
                [song.title, song.artist, song.url, song.lyrics, song.timestamp],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
}

module.exports = new Database();