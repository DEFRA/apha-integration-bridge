import http from 'node:http'
import net from 'node:net'
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  afterEach
} from '@jest/globals'

import { config } from '../../../config.js'
import { proxyFetch } from './proxy-fetch.js'

const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  )

const close = (server) => new Promise((resolve) => server.close(resolve))

describe('proxyFetch', () => {
  let origin
  let proxy
  let originPort
  let proxyPort
  let proxyHits = 0
  let originHits = 0

  beforeAll(async () => {
    origin = http.createServer((req, res) => {
      originHits++
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, path: req.url }))
    })

    // Minimal forward proxy. undici's ProxyAgent sends http:// origins as
    // absolute-form requests (handled here) and tunnels https:// origins via
    // HTTP CONNECT (handled by the `connect` listener below).
    proxy = http.createServer((req, res) => {
      proxyHits++
      const upstream = http.request(
        req.url,
        { method: req.method, headers: req.headers },
        (upstreamRes) => {
          res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
          upstreamRes.pipe(res)
        }
      )
      upstream.on('error', () => {
        res.writeHead(502)
        res.end()
      })
      req.pipe(upstream)
    })
    proxy.on('connect', (req, clientSocket, head) => {
      proxyHits++
      const [host, port] = req.url.split(':')
      const serverSocket = net.connect(Number(port), host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        serverSocket.write(head)
        serverSocket.pipe(clientSocket)
        clientSocket.pipe(serverSocket)
      })
      serverSocket.on('error', () => clientSocket.destroy())
    })

    originPort = await listen(origin)
    proxyPort = await listen(proxy)
  })

  afterEach(() => {
    config.set('httpProxy', null)
    proxyHits = 0
    originHits = 0
  })

  afterAll(async () => {
    await close(origin)
    await close(proxy)
  })

  test('routes the request through the configured proxy without mixing undici versions', async () => {
    config.set('httpProxy', `http://127.0.0.1:${proxyPort}`)

    const res = await proxyFetch(`http://127.0.0.1:${originPort}/jwks`)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, path: '/jwks' })
    // Proves the request was routed through the proxy AND that undici's own
    // fetch + ProxyAgent are version-compatible. The previous global-fetch +
    // userland-ProxyAgent combination threw at request time with
    // `UND_ERR_INVALID_ARG: invalid onRequestStart method`, so reaching a 200
    // here is the regression guard for that incident.
    expect(proxyHits).toBeGreaterThan(0)
  })

  test('fetches directly when no proxy is configured', async () => {
    config.set('httpProxy', null)

    const res = await proxyFetch(`http://127.0.0.1:${originPort}/direct`)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, path: '/direct' })
    expect(proxyHits).toBe(0)
    expect(originHits).toBeGreaterThan(0)
  })
})
