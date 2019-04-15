const express        = require('express');
const bodyParser     = require('body-parser');
const Crawler        = require('simplecrawler');
const Parser         = require('node-html-parser');
const fs             = require('fs');

const app            = express();


const port = 8080;
const url  = 'https://www.olx.ba/pretraga?vrsta=samoprodaja&kanton=9&do=200000&kategorija=23&kvadrata_min=40&broj-soba_select_jednoiposoban-1-5=Jednoiposoban+%281.5%29&broj-soba_select_dvosoban-2=Dvosoban+%282%29&broj-soba_select_trosoban-3=+Trosoban+%283%29&grad%5B0%5D=3812&grad%5B1%5D=3969&grad%5B2%5D=5896&stranica=';

let total = 0;
let ids = [];
let pages = 0;

app.listen(port, () => {
  console.log('We are live on ' + port);
});

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const crawleFirstPage = () => {
    const crawler = new Crawler(`${url}1`);

    crawler.interval = 10000;
    crawler.maxConcurrency = 3;
    crawler.maxDepth = 1;
    crawler.decodeResponses = true;

    crawler.on('fetchcomplete', (queueItem, responseBody) => {
        const root = Parser.parse(responseBody);

        total = root.querySelector('.brojrezultata').querySelector('span').innerHTML;

        const results = root.querySelector('#rezultatipretrage');

        const articles = results.querySelectorAll('.obicniArtikal');

        const perPage = articles.length - 2; // because of ads

        for (let i = 0; i < articles.length; i++) {
            if (articles[i].id && articles[i].id.indexOf('art_') !== -1) {
                ids.push(articles[i].id);
            }
        }

        pages = Math.ceil(total / perPage);

        // loop through other pages
        for (let i = 1; i < pages; i++) {
            crawlePage(i);
        }
    });

    crawler.start();
};

const crawlePage = (page) => {
    const crawler = new Crawler(`${url}${page + 1}`);

    crawler.interval = 10000;
    crawler.maxConcurrency = 3;
    crawler.maxDepth = 1;
    crawler.decodeResponses = true;

    crawler.on('fetchcomplete', (queueItem, responseBody) => {
        const root = Parser.parse(responseBody);

        const results = root.querySelector('#rezultatipretrage');

        const articles = results.querySelectorAll('.obicniArtikal');

        for (let i = 0; i < articles.length; i++) {
            if (articles[i].id && articles[i].id.indexOf('art_') !== -1) {
                ids.push(articles[i].id);
            }
        }
    });

    crawler.start();
};

app.get('/new-app', (req, res) => {
    crawleFirstPage();

    setTimeout(() => {
        let newIds;

        try {
            const jsonString = fs.readFileSync('./ids.json');
            const oldIds = JSON.parse(jsonString);

            newIds = ids.filter((item) => { return oldIds.indexOf(item) === -1; });
        } catch(err) {
            console.log(err);
        }

        fs.writeFile(
            './ids.json',
            JSON.stringify(ids),
            function (err) {
                if (err) {
                    console.error('Crap happens');
                }
            }
        );

        res.send('New IDs: ' + newIds);
    }, 10000);
});
