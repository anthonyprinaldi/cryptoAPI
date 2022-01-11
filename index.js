const PORT = process.env.PORT || 8000
const express = require("express")
const cheerio = require("cheerio")
const axios = require('axios')
const app = express()

var masterArticles = []

const header = {
    "Connection": "keep-alive",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
}

const sources = [
    {
        "name": 'CoinTelegraph',
        "base_url": 'https://cointelegraph.com/',
        "selector": ".main-news-controls__link",
    },
    {
        "name": "BitcoinMagazine",
        "base_url": "https://bitcoinmagazine.com/articles",
        "selector": "a[phx-track-id='Title']",
    },
    {
        "name": "CoinDesk",
        "base_url": "https://www.coindesk.com/",
        "selector": "a.headline[href]",
    },
    {
        "name": "bitcoinist",
        "base_url": "https://bitcoinist.com/",
        "selector": "h3.jeg_post_title > a[href]",
    },
    {
        "name": "newsbtc",
        "base_url": "https://www.newsbtc.com/news/",
        "selector": ".jeg_post_title > a[href]",
    },
    {
        "name": "Forbes",
        "base_url": "https://www.forbes.com/crypto-blockchain/",
        "selector": "a.stream-item__title[href]",
    },
    {
        "name": "dailycoin",
        "base_url": "https://dailycoin.com/",
        "selector": "a.mkd-pt-title-link[href]",
    },
]

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function getArticlesOneSource(source, callback) {
    const tempArticles = []
    axios.get(source.base_url, {
        headers: header
    })
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);

            $(source.selector, html).each(function (idx, elem) {
                const href = $(elem).attr('href')
                const url = ((!href.includes(source.base_url)) ? source.base_url + href : href)
                const title = $(elem).text().trim()
                const sourceName = source.name
                tempArticles.push({
                    url,
                    title,
                    sourceName
                })
            })
            console.log(`${source.name} with ${tempArticles.length} articles`)

            callback(tempArticles)
        })
        .catch(err => console.log(err))
}

async function getAllArticles(sources, callback) {
    const articles = []
    let counter = 0
    for (let i = 0; i < sources.length; i++) {
        getArticlesOneSource(sources[i], currArticles => {
            articles.push.apply(articles, currArticles)
            counter++
            if (counter == sources.length) {
                callback(articles)
            }
        });
    }

    // const promises = sources.map(source => {
    //     getArticlesOneSource(source, res => {
    //         return res
    //     })
    // })
    // Promise.all(promises).then(res => [].concat.apply([], res)).then(res => callback(res))
}



async function updateMasterArticles(sources) {
    while (true) {
        getAllArticles(sources, res => {
            masterArticles = res
        })
        console.log('Sleeping 15 min ...')
        await sleep(900000)
        console.log('Done sleep')
    }
}

updateMasterArticles(sources)


app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`))

app.get('/', (req, res) => {
    res.json('Crypto News API base url')
})

app.get('/news', (req, res) => {
    // const articles = []
    // sources.forEach(source => {
    //     axios.get(source.base_url, {
    //         headers: header
    //     })
    //         .then(response => {
    //             const html = response.data;
    //             const $ = cheerio.load(html);

    //             $(source.selector, html).each(function (idx, elem) {
    //                 const url = $(elem).attr('href')
    //                 articles.push({
    //                     "url": ((!url.includes(source.base_url)) ? source.base_url + url : url),
    //                     "title": $(elem).text().trim(),
    //                     'source': source.name
    //                 })
    //             })
    //             console.log(`${source.name} with ${articles.length} articles`)
    //         }).catch(err => console.log(err))
    // })




    // getAllArticles(sources, articles => {
    //     res.json(articles)
    // })

    res.json(masterArticles)
})

app.get('/news/:newsId', (req, res) => {
    const newsSource = req.params.newsId.toLowerCase()
    const sourceObject = sources.find(source => source.name.toLowerCase() === newsSource)
    if (sourceObject) {
        const selectedArticles = masterArticles.filter(article => article.sourceName.toLowerCase() == sourceObject.name.toLowerCase())
        res.json(selectedArticles)
    } else {
        res.json('No matching news source')
    }
})

app.get('/news/search/:keyword', (req, res) => {
    const searchWord = req.params.keyword.toLowerCase()
    const searchArticles = masterArticles.filter(articles => articles.title.toLowerCase().includes(searchWord))
    if (searchArticles.length > 0) {
        res.json(searchArticles)
    } else {
        res.json('No matching articles')
    }


})
