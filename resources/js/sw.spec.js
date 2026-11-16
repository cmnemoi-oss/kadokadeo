import { afterEach, expect, test, vi } from 'vitest'

const SITE = 'http://kadokadeo.localhost'

// the real sw.js in a fake service worker: the windows of the site it sees, what it shows and opens
async function aServiceWorker({ windows = [] } = {}) {
  const listeners = {}
  const shown = []
  const opened = []
  const scope = {
    location: new URL(SITE),
    addEventListener: (type, listener) => (listeners[type] = listener),
    registration: { showNotification: async(title, options) => shown.push({ title, ...options }) },
    clients: {
      matchAll: async() => windows,
      openWindow: async(url) => opened.push(url),
    },
  }
  vi.stubGlobal('self', scope)
  vi.stubGlobal('location', scope.location)
  vi.resetModules()
  await import('./sw.js')

  async function dispatch(type, event) {
    const pending = []
    listeners[type]({ ...event, waitUntil: (promise) => pending.push(promise) })
    await Promise.all(pending)
  }

  return {
    shown,
    opened,
    push: (payload) => dispatch('push', { data: payload === undefined ? null : { json: () => JSON.parse(payload) } }),
    click: (data) => dispatch('notificationclick', { notification: { data, close: vi.fn() } }),
  }
}

function aWindow({ focused = false } = {}) {
  return { focused, focus: vi.fn().mockResolvedValue(), navigate: vi.fn().mockResolvedValue() }
}

const aPush = JSON.stringify({ title: 'A comment', body: 'on your replay', url: '/replays/1', tag: 'notification:1' })

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a push is shown when no window of the site has the focus', async() => {
  const worker = await aServiceWorker({ windows: [aWindow()] })

  await worker.push(aPush)

  expect(worker.shown).toEqual([expect.objectContaining({ title: 'A comment', body: 'on your replay', tag: 'notification:1', data: { url: '/replays/1' } })])
})

test('a push is not shown when a window of the site has the focus: its toast is enough', async() => {
  const worker = await aServiceWorker({ windows: [aWindow(), aWindow({ focused: true })] })

  await worker.push(aPush)

  expect(worker.shown).toEqual([])
})

test.each([
  ['no payload', undefined],
  ['a payload that is not JSON', 'not json'],
  ['a payload without a title', JSON.stringify({ body: 'on your replay' })],
])('a push with %s shows nothing', async(_, payload) => {
  const worker = await aServiceWorker()

  await worker.push(payload)

  expect(worker.shown).toEqual([])
})

test('a click on a push brings a window of the site to its page', async() => {
  const window = aWindow()
  const worker = await aServiceWorker({ windows: [window] })

  await worker.click({ url: '/replays/1' })

  expect(window.focus).toHaveBeenCalledOnce()
  expect(window.navigate).toHaveBeenCalledWith(`${SITE}/replays/1`)
  expect(worker.opened).toEqual([])
})

test('a click on a push opens its page when no window of the site is open', async() => {
  const worker = await aServiceWorker()

  await worker.click({ url: '/replays/1' })

  expect(worker.opened).toEqual([`${SITE}/replays/1`])
})

test('a click on a push never leaves the site', async() => {
  const worker = await aServiceWorker()

  await worker.click({ url: 'https://elsewhere.example/phishing' })

  expect(worker.opened).toEqual([`${SITE}/`])
})
