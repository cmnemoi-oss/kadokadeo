import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test, vi } from 'vitest'

import { createAppI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

import LanguageFlags from './LanguageFlags.vue'

const save = vi.fn()
const reload = vi.fn()

vi.mock('@/composables/useAccount', () => ({
  useAccount: () => ({ error: { value: null }, saveLocale: save }),
}))
vi.mock('@/i18n/reload', () => ({ reloadPage: () => reload() }))

const TEXTS = { language: { fr: 'Français', en: 'English (beta)' } }

function renderFlags({ enabled = true, loggedIn = true, pageLocale = 'fr' } = {}) {
  window.evts = new EventTarget()
  window.Kado = { i18n_enabled: enabled, locale: pageLocale }
  const pinia = createPinia()
  setActivePinia(pinia)
  if (loggedIn) {
    useAuthStore().user = { id: 1, locale: 'auto' }
  }
  return render(LanguageFlags, { global: { plugins: [pinia, createAppI18n('fr', { fr: TEXTS })] } })
}

beforeEach(() => {
  save.mockReset().mockResolvedValue()
  reload.mockReset()
})

test('with the languages off, there is no flag', () => {
  renderFlags({ enabled: false })

  expect(screen.queryAllByRole('button')).toEqual([])
})

test('a visitor has no flag: the browser chooses for him', () => {
  renderFlags({ loggedIn: false })

  expect(screen.queryAllByRole('button')).toEqual([])
})

test('a player sees one flag by language, the one of the page pressed', () => {
  renderFlags()

  expect(screen.getAllByRole('img').map((flag) => flag.alt)).toEqual(['English (beta)', 'Français'])
  expect(screen.getByRole('button', { pressed: true }).title).toBe('Français')
})

test('a player who clicks a flag saves its language and reloads the page in it', async() => {
  renderFlags()

  await fireEvent.click(screen.getByTitle('English (beta)'))
  await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())

  expect(save).toHaveBeenCalledWith('en')
})

test('the flag of the page changes nothing', async() => {
  renderFlags()

  await fireEvent.click(screen.getByTitle('Français'))

  expect(save).not.toHaveBeenCalled()
})

test('a choice the server refused keeps the page', async() => {
  save.mockRejectedValue(new Error('down'))
  renderFlags()

  await fireEvent.click(screen.getByTitle('English (beta)'))
  await vi.waitFor(() => expect(save).toHaveBeenCalled())

  expect(reload).not.toHaveBeenCalled()
})
