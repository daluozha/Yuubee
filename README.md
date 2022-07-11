# Yuubee

### setup
`
pnpm i

pnpm run start
`

### Deps
- koa
- puppeteer
- log4js
- cross-env

### Post Body
`
{
    "viewport": {
        "width": 800,
        "height": 800
    },
    "screenshot": {
        "selector": "body",
        "type": "png",
        "quality": 100,
        "urlTimeout": 10000,
        "maxPage": 10
    },
    "browserTimeout": 0,
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
    "url": "http://localhost:3000/screenshot",
    "resultType": "URL"
}
`