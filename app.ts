import {Application, Router, helpers, send} from 'https://deno.land/x/oak/mod.ts'
import {exists} from 'https://deno.land/std/fs/mod.ts'
import {DOMParser} from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'
import 'https://deno.land/x/dotenv/load.ts'
import {all} from './src/all.ts'
import {images} from './src/images.ts'

const search = async (params: Record<string, string>) => {
  //TODO: proxy support (maybe use https://proxyscrape.com/free-proxy-list)
  //TODO: maybe use opensearch (ref: https://github.com/benbusby/whoogle-search/blob/a7bf9728e30f53a5cfc3b295b5354dcfbf6440c0/app/routes.py#L138)
  let url = 'https://google.com/search?q=' + params.q
  if (params.page != undefined) url += '&start=' + (parseInt(params.page) - 1) + '0' //Handle page
  //Handle lang
  let lang = 'en-US'
  if ((Deno.env.get('LANG') || params.lang) != undefined) {
    if ((Deno.env.get('LANG') && params.lang) != undefined || params.lang != undefined) lang = params.lang
    else lang = Deno.env.get('LANG')!.toString()
    url += '&hl=' + lang
  }
  if (params.trueSpelling != undefined) url += '&nfpr=' + params.trueSpelling //Handle spelling suggestion

  //Random user agent
  const rdmStr = () => Date.now().toString(36) + Math.random().toString(36).substring(2)
  const OSs = ['Windows NT;', 'Macintosh', 'X11; Linux x86_64', 'X11; Linux i686', 'X11; CrOS i686', 'X11; OpenBSD i386', 'X11; NetBSD']
  const getDoc = async (url: string) =>
    new DOMParser().parseFromString(
      await fetch(url, {
        headers: {
          'user-agent': `Mozilla/5.0 (${OSs[~~(Math.random() * OSs.length)]} ${rdmStr()}) AppleWebKit/${rdmStr()} (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (500 - 50)) + 49} Safari/${rdmStr()} OPR/${rdmStr()}`
        }
      }).then(res => res.text()),
      'text/html'
    )!

  //Handle tabs
  switch (params.tab) {
    case 'images':
      url += '&tbm=isch'
      return images(await getDoc(url), lang)
    case 'videos':
      url += '&tbm=vid'
      //TODO: videos
      break
    case 'news':
      url += '&tbm=nws'
      //TODO: news
      break
    case 'shopping':
      url += '&tbm=shop'
      //TODO: shopping
      break
    case 'books':
      url += '&tbm=bks'
      //TODO: books
      break
    case 'maps':
      //TODO: maps
      break
    case 'flights':
      //TODO: flights
      break
    case 'finance':
      //TODO: finance
      break
    default:
      return all(await getDoc(url), lang)
  }
}

const app = new Application()
const router = new Router()
app.addEventListener('listen', ({secure, hostname, port}) => console.log('Listening on: ' + (secure ? 'https://' : 'http://') + (hostname ?? 'localhost') + ':' + port))
router
  .get('/', async ctx => {
    ctx.response.body = await Deno.readTextFile('./views/index.html')
  })
  .get('/search', async ctx => {
    ctx.response.body = await search(helpers.getQuery(ctx))
  })
  .get('/autocomplete', async ctx => {
    ctx.response.body = await fetch('https://suggestqueries.google.com/complete/search?client=toolbar&q=' + helpers.getQuery(ctx).q)
      .then(res => res.text())
      .then(res => {
        const suggestions = res.split('"').filter((_, b) => b % 2 !== 0)
        suggestions.shift()
        return suggestions
      })
  })
app.use(router.routes())
app.use(router.allowedMethods())
app.use(async ctx => {
  if (await exists('./assets' + ctx.request.url.pathname)) await send(ctx, ctx.request.url.pathname, {root: './assets'})
  else {
    ctx.response.body = 'error 404' //TODO: make a good looking 404 page
    ctx.response.status = 404
  }
})

await app.listen({port: Deno.env.get('PORT') == undefined ? 8080 : parseInt(Deno.env.get('PORT')!)})

//TODO: PWA
//TODO: Deno Deploy support
//TODO: Qovery support
//TODO: VSCode config