const express        = require('express');
const bodyParser     = require('body-parser');
const Crawler        = require('crawler');
const fs             = require('fs');

const app            = express();


const port = 8080;
const url  = 'https://www.olx.ba/pretraga?vrsta=samoprodaja&kategorija=23&do=400000&kanton=9&grad%5B0%5D=0&kvadrata_min=40&stranica=';
const urlOffice = 'https://www.olx.ba/pretraga?kategorija=25&vrsta=samoprodaja&od=&do=&kanton=9&grad%5B%5D=0&kvadrata_min=&kvadrata_max=&stranica=';

let total = 0;
let ids = [];
let pages = 0;

let totalOffice = 0;
let idsOffice = [];
let pagesOffice = 0;

app.listen(port, () => {
  console.log('We are live on ' + port);
});

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const crawleApartment = () => {
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

const crawleOffice = () => {
    const crawler = new Crawler({
        maxConnections : 10,
        callback : function (error, res, done) {
            if (error) {
                console.log(error);
            } else {
                const $ = res.$;

                const totalString = $('.brojrezultata > span').text();
                totalOffice = parseInt(totalString.replace(/\./g, ''));

                const articles = $('#rezultatipretrage .obicniArtikal');

                const perPage = articles.length - 2; // because of ads

                for (let i = 0; i < articles.length; i++) {
                    if (articles[i].attribs.id && articles[i].attribs.id.indexOf('art_') !== -1) {
                        idsOffice.push(articles[i].attribs.id);
                    }
                }

                if (pagesOffice === 0) {
                    pagesOffice = Math.ceil(totalOffice / perPage);

                    for (let i = 2; i < pagesOffice; i++) {
                        crawler.queue(`${urlOffice}${i}`);
                    }
                }
            }

            done();
        }
    });

    crawler.queue(`${urlOffice}1`);
};

app.get('/stanovi', (req, res) => {
    crawleApartment();

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

app.get('/poslovni', (req, res) => {
    crawleOffice();

    setTimeout(() => {
        let newIds;

        try {
            const jsonString = fs.readFileSync('./ids-office.json');
            const oldIds = JSON.parse(jsonString);

            newIds = idsOffice.filter((item) => { return oldIds.indexOf(item) === -1; });
        } catch(err) {
            console.log(err);
        }

        fs.writeFile(
          './ids-office.json',
          JSON.stringify(idsOffice),
          function (err) {
              if (err) {
                  console.error('Crap happens');
              }
          }
        );

        res.send('New IDs: ' + newIds.map(item => (`<p><a href="https://www.olx.ba/artikal/${item.substring(4)}/">${item}</a></p>`)));
    }, 10000);
});
