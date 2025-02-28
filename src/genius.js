const queue = require('./queue');
const database = require('./database');
const path = require('path');
const fs = require('fs').promises;

// just a test to run the scraper
const songsToScrape = [
    { title: "Magnolia", artist: "Playboi Carti" },
    { title: "Shoota", artist: "Playboi Carti" },
    { title: "Sky", artist: "Playboi Carti" },
    { title: "Stop Breathing", artist: "Playboi Carti" },
    { title: "wokeuplikethis*", artist: "Playboi Carti" },
    { title: "New Tank", artist: "Playboi Carti" },
    { title: "Long Time", artist: "Playboi Carti" },
    { title: "R.I.P.", artist: "Playboi Carti" },
    { title: "Fell in Luv", artist: "Playboi Carti" },
    { title: "ILoveUIHateU", artist: "Playboi Carti" },
    { title: "Vamp Anthem", artist: "Playboi Carti" },
    { title: "New N3on", artist: "Playboi Carti" },
    { title: "Teen X", artist: "Playboi Carti" },
    { title: "On That Time", artist: "Playboi Carti" },
    { title: "dothatshit!", artist: "Playboi Carti" },
    { title: "Location", artist: "Playboi Carti" },
    { title: "Flex", artist: "Playboi Carti" },
    { title: "Let It Go", artist: "Playboi Carti" },
    { title: "Foreign", artist: "Playboi Carti" },
    { title: "Rockstar Made", artist: "Playboi Carti" }
];

async function processSongs() {
    try {
        console.log(`Starting to scrape ${songsToScrape.length} songs`);

        const promises = songsToScrape.map(song => queue.addSong(song));
        let completed = 0;
        const results = await Promise.allSettled(promises);

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                await database.saveLyrics(result.value.data);
                completed++;
                
                if (completed % 10 === 0) {
                    console.log(`Progress: ${completed}/${songsToScrape.length} songs processed`);
                }
            }
        }

        console.log(`Completed scraping ${completed} songs`);
    } catch (error) {
        console.error('Main process failed:', error);
    } finally {
        await queue.shutdown();
        process.exit(0);
    }
}

process.on('SIGINT', async () => {
    console.log('\n Gracefully shutting down...');
    await queue.shutdown();
    process.exit(0);
});

processSongs();