export function registerPwa(router) {
  const { serviceWorker } = navigator
  if (!serviceWorker) {
    return
  }
  if (!import.meta.env.PROD) {
    // (the dev server needs the network: no worker left by a production build tried on this address)
    serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()))
    return
  }

  serviceWorker.register('/sw.js').then((registration) => {
    // an installed app stays open for days: it looks for a new build each time it comes back
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {})
      }
    })
  }).catch((error) => console.warn('Service worker:', error))

  // A new build: its pages are loaded at the next change of page (after the guards of the pages, that keep a run), never
  // during a run. (No controller yet: the first install of the worker, nothing new.)
  let controlled = Boolean(serviceWorker.controller)
  let updated = false
  serviceWorker.addEventListener('controllerchange', () => {
    updated = controlled
    controlled = true
  })
  router.beforeResolve((to, from) => {
    if (updated && to.path !== from.path) {
      location.assign(to.fullPath)
      return false
    }
  })
}
