import { fireEvent, render, screen } from '@testing-library/vue'
import { beforeEach, expect, test, vi } from 'vitest'
import { shallowRef } from 'vue'

import { createAppI18n } from '@/i18n'

import PushDevice from './PushDevice.vue'

const push = { state: shallowRef('unsubscribed'), subscribe: vi.fn(), unsubscribe: vi.fn() }
let isOn = true

vi.mock('@/composables/usePush', () => ({
  pushIsOn: () => isOn,
  usePush: () => push,
}))

const TEXTS = {
  push: {
    title: 'Sur cet appareil',
    receive: 'Recevoir',
    unsupported: 'Pas de notifications ici',
    denied: 'Notifications bloquées',
    failed: 'Échec',
  },
}

function renderPushDevice({ on = true, state = 'unsubscribed' } = {}) {
  isOn = on
  push.state.value = state
  return render(PushDevice, { global: { plugins: [createAppI18n('fr', { fr: TEXTS })] } })
}

beforeEach(() => {
  push.subscribe.mockReset().mockResolvedValue()
  push.unsubscribe.mockReset().mockResolvedValue()
})

test('with the pushes off, there is nothing to choose', () => {
  renderPushDevice({ on: false })

  expect(screen.queryByText('Sur cet appareil')).toBeNull()
})

test('a player subscribes this device with a click', async() => {
  renderPushDevice()

  await fireEvent.click(screen.getByLabelText('Recevoir'))

  expect(push.subscribe).toHaveBeenCalledOnce()
})

test('a player unsubscribes this device with a click', async() => {
  renderPushDevice({ state: 'subscribed' })

  await fireEvent.click(screen.getByLabelText('Recevoir'))

  expect(push.unsubscribe).toHaveBeenCalledOnce()
})

test('a browser without pushes says so, without a box to check', () => {
  renderPushDevice({ state: 'unsupported' })

  expect(screen.getByText('Pas de notifications ici')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
})

test('a permission refused says so, without a box to check', () => {
  renderPushDevice({ state: 'denied' })

  expect(screen.getByText('Notifications bloquées')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
})

test('a subscription that failed says so', async() => {
  push.subscribe.mockRejectedValue(new Error('down'))
  renderPushDevice()

  await fireEvent.click(screen.getByLabelText('Recevoir'))

  expect(await screen.findByText('Échec')).toBeTruthy()
})
