<script setup>
// the flags beside the logo, as on KadoKado: the language of the account (the same choice as account/LanguageSelector),
// only when the languages are on (App\Settings\SiteSettings::$i18n_enabled) and for a player (a visitor has the
// language of the browser: nothing to save it on)
import { useI18n } from 'vue-i18n'

import { chooseLocale, pageLocale } from '@/i18n/locale'
import { reloadPage } from '@/i18n/reload'

// the languages of the site (App\Enums\LocalePreference) and their flags of KadoKado
const FLAGS = [
  { locale: 'en', src: '/gfx/langEnglish.gif' },
  { locale: 'fr', src: '/gfx/langFrench.gif' },
]

const authStore = useAuthStore()
const { saveLocale } = useAccount()
const { t } = useI18n()

const isShown = computed(() => window.Kado?.i18n_enabled && authStore.isAuthenticated)
// literal keys: scripts/lint-i18n.mjs checks them against the catalog
const nameOf = (flag) => ({ en: t('language.en'), fr: t('language.fr') })[flag.locale]
const isLanguageOfThePage = (flag) => flag.locale === pageLocale()

// a refused choice keeps the page as it is
function choose(flag) {
  if (!isLanguageOfThePage(flag)) {
    chooseLocale(flag.locale, { save: saveLocale, reload: reloadPage }).catch(() => {})
  }
}
</script>

<template>
  <ul v-if="isShown" class="flex w-max flex-col gap-0.5">
    <li v-for="flag in FLAGS" :key="flag.locale">
      <button type="button"
              class="block"
              :class="isLanguageOfThePage(flag) ? 'cursor-default' : 'cursor-pointer opacity-60 hover:opacity-100'"
              :title="nameOf(flag)"
              :aria-pressed="isLanguageOfThePage(flag)"
              @click="choose(flag)">
        <img :src="flag.src"
             :alt="nameOf(flag)"
             width="29"
             height="22" />
      </button>
    </li>
  </ul>
</template>
