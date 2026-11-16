<script setup>
import { pushIsOn, usePush } from '@/composables/usePush'

// the pushes on this device (resources/js/composables/usePush.js): the permission of the browser is asked at the click
const isShown = pushIsOn()
const { state, subscribe, unsubscribe } = usePush()
const isBusy = ref(false)
const failed = ref(false)

const choose = async(receive) => {
  isBusy.value = true
  failed.value = false
  try {
    await (receive ? subscribe() : unsubscribe())
  } catch {
    failed.value = true
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section v-if="isShown" class="space-y-2">
    <h2 class="normal-case">{{ $t('push.title') }}</h2>
    <p v-if="state === 'unsupported'" class="mx-0 text-sm">{{ $t('push.unsupported') }}</p>
    <p v-else-if="state === 'denied'" class="mx-0 text-sm">{{ $t('push.denied') }}</p>
    <FormCheckbox v-else
                  :model-value="state === 'subscribed'"
                  :disabled="isBusy"
                  @update:model-value="choose">
      {{ $t('push.receive') }}
    </FormCheckbox>
    <MessageError v-if="failed">{{ $t('push.failed') }}</MessageError>
  </section>
</template>
