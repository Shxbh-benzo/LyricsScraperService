const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
    path.join(__dirname, '../data/lyrics.sqlite'),
    sqlite3.OPEN_READONLY
);

async function showStats() {
    console.log('Database Statistics:\n');
    
    db.get(`SELECT COUNT(*) as total FROM lyrics`, (err, row) => {
        console.log(`Total songs: ${row.total}`);
    });

    db.all(`
        SELECT artist, COUNT(*) as count 
        FROM lyrics 
        GROUP BY artist 
        ORDER BY count DESC
    `, (err, rows) => {
        console.log('\nSongs per artist:');
        rows.forEach(row => {
            console.log(`${row.artist}: ${row.count} songs`);
        });
    });

    db.get(`
        SELECT title, artist, substr(lyrics, 1, 2000) as sample 
        FROM lyrics 
        ORDER BY RANDOM() 
        LIMIT 1
    `, (err, row) => {
        console.log('\nRandom lyrics sample:');
        console.log(`${row.title} - ${row.artist}`);
        console.log(row.sample + '...');
    });
}

showStats();