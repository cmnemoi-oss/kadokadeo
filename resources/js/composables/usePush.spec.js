import { flushPromises } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'

let client

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/device-1'

// a browser that can receive pushes: its permission, its subscription, what the player answers to the question
function aBrowser({ permission = 'default', subscribed = false, answer = 'granted', supported = true } = {}) {
  const browser = { permission, asked: 0, subscription: null }
  const aSubscription = () => ({
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'key', auth: 'secret' } }),
    unsubscribe: vi.fn(async() => (browser.subscription = null)),
  })
  browser.subscription = subscribed ? aSubscription() : null
  const pushManager = {
    getSubscription: async() => browser.subscription,
    subscribe: vi.fn(async() => (browser.subscription = aSubscription())),
  }
  vi.stubGlobal('Notification', {
    get permission() {
      return browser.permission
    },
    requestPermission: async() => {
      browser.asked++
      browser.permission = answer
      return answer
    },
  })
  vi.stubGlobal('PushManager', supported ? function PushManager() {} : undefined)
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: async() => (supported ? { pushManager } : undefined) } })
  browser.pushManager = pushManager
  return browser
}

async function loadPush({ on = true } = {}) {
  window.Kado = { push_public_key: on ? 'BPublicKeyOfTheServerAA' : null }
  vi.resetModules()
  ;({ client } = await import('./useApi'))
  vi.spyOn(client, 'post').mockResolvedValue({})
  vi.spyOn(client, 'delete').mockResolvedValue({})
  return await import('./usePush')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete window.Kado
})

test('with the pushes off, there is nothing to subscribe', async() => {
  aBrowser()
  const { pushIsOn } = await loadPush({ on: false })

  expect(pushIsOn()).toBe(false)
})

test('a browser without pushes says so', async() => {
  aBrowser({ supported: false })
  const { usePush } = await loadPush()

  const push = usePush()
  await flushPromises()

  expect(push.state.value).toBe('unsupported')
})

test('the permission is not asked before the player clicks', async() => {
  const browser = aBrowser()
  const { usePush } = await loadPush()

  const push = usePush()
  await flushPromises()

  expect(push.state.value).toBe('unsubscribed')
  expect(browser.asked).toBe(0)
})

test('a player who subscribes gives the subscription of his device to the server', async() => {
  const browser = aBrowser()
  const { usePush } = await loadPush()
  const push = usePush()

  await push.subscribe()

  expect(browser.asked).toBe(1)
  expect(browser.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
  expect(client.post).toHaveBeenCalledWith('/push-subscriptions', { endpoint: ENDPOINT, keys: { p256dh: 'key', auth: 'secret' } })
  expect(push.state.value).toBe('subscribed')
})

test('a player who refuses the permission is not subscribed', async() => {
  const browser = aBrowser({ answer: 'denied' })
  const { usePush } = await loadPush()
  const push = usePush()

  await push.subscribe()

  expect(browser.pushManager.subscribe).not.toHaveBeenCalled()
  expect(client.post).not.toHaveBeenCalled()
  expect(push.state.value).toBe('denied')
})

test('a subscription the server refused leaves the device unsubscribed', async() => {
  const browser = aBrowser()
  const { usePush } = await loadPush()
  client.post.mockRejectedValue(new Error('down'))
  const push = usePush()

  await expect(push.subscribe()).rejects.toThrow('down')

  expect(browser.subscription).toBeNull()
  expect(push.state.value).toBe('unsubscribed')
})

test('a player who unsubscribes tells the server first, then his browser', async() => {
  const browser = aBrowser({ permission: 'granted', subscribed: true })
  const { unsubscribe } = browser.subscription
  const { usePush } = await loadPush()
  const push = usePush()

  await push.unsubscribe()

  expect(client.delete).toHaveBeenCalledWith('/push-subscriptions', { data: { endpoint: ENDPOINT } })
  expect(client.delete.mock.invocationCallOrder[0]).toBeLessThan(unsubscribe.mock.invocationCallOrder[0])
  expect(push.state.value).toBe('unsubscribed')
})

test('a player sends a test push to this device and reads what its push service answered', async() => {
  aBrowser({ permission: 'granted', subscribed: true })
  const { usePush } = await loadPush()
  client.post.mockResolvedValue({ data: { data: { outcome: 'delivered' } } })
  const push = usePush()

  expect(await push.sendTest()).toBe('delivered')
  expect(client.post).toHaveBeenCalledWith('/push-subscriptions/test', { endpoint: ENDPOINT })
})

test('a test push to a device gone from its push service shows the device unsubscribed', async() => {
  const browser = aBrowser({ permission: 'granted', subscribed: true })
  const { usePush } = await loadPush()
  client.post.mockResolvedValue({ data: { data: { outcome: 'gone' } } })
  const push = usePush()

  expect(await push.sendTest()).toBe('gone')
  expect(browser.subscription).toBeNull()
  expect(push.state.value).toBe('unsubscribed')
})

test('at each opening, the subscription of the device is given again to the server', async() => {
  aBrowser({ permission: 'granted', subscribed: true })
  const { resyncPush } = await loadPush()

  await resyncPush()

  expect(client.post).toHaveBeenCalledWith('/push-subscriptions', { endpoint: ENDPOINT, keys: { p256dh: 'key', auth: 'secret' } })
})

test('a device not subscribed is not given to the server at the opening', async() => {
  aBrowser({ permission: 'granted' })
  const { resyncPush } = await loadPush()

  await resyncPush()

  expect(client.post).not.toHaveBeenCalled()
})

// a device shared by two players: the next one is not subscribed without his click
test('at the logout, the device leaves the pushes', async() => {
  const browser = aBrowser({ permission: 'granted', subscribed: true })
  const { leavePushAtLogout } = await loadPush()

  const endpoint = await leavePushAtLogout(async(pushEndpoint) => {
    expect(browser.subscription).not.toBeNull()
    return pushEndpoint
  })

  expect(endpoint).toBe(ENDPOINT)
  expect(browser.subscription).toBeNull()
})

test('at the logout, the device leaves the pushes even when they were turned off since', async() => {
  const browser = aBrowser({ permission: 'granted', subscribed: true })
  const { leavePushAtLogout } = await loadPush({ on: false })

  await leavePushAtLogout(async() => {})

  expect(browser.subscription).toBeNull()
})
