const express        = require('express');
const bodyParser     = require('body-parser');
const Crawler        = require('crawler');
const fs             = require('fs');

const app            = express();


const port = 8080;
const url  = 'https://www.olx.ba/pretraga?vrsta=samoprodaja&kategorija=23&do=400000&kanton=9&grad%5B0%5D=0&kvadrata_min=40&stranica=';

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
    const crawler = new Crawler({
        maxConnections : 10,
        callback : function (error, res, done) {
            if (error) {
                console.log(error);
            } else {
                const $ = res.$;

                const totalString = $('.brojrezultata > span').text();
                total = parseInt(totalString.replace(/\./g, ''));

                const articles = $('#rezultatipretrage .obicniArtikal');

                const perPage = articles.length - 2; // because of ads

                for (let i = 0; i < articles.length; i++) {
                    if (articles[i].attribs.id && articles[i].attribs.id.indexOf('art_') !== -1) {
                        ids.push(articles[i].attribs.id);
                    }
                }

                if (pages === 0) {
                    pages = Math.ceil(total / perPage);

                    for (let i = 2; i < pages; i++) {
                        crawler.queue(`${url}${i}`);
                    }
                }
            }

            done();
        }
    });

    crawler.queue(`${url}1`);
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

        res.send('New IDs: ' + newIds.map(item => (`<p><a href="https://www.olx.ba/artikal/${item.substring(4)}/">${item}</a></p>`)));
    }, 10000);
});
