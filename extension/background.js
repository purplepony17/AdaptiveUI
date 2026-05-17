// background.js — service worker
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: 'https://your-app.vercel.app' })
  }
})

// Sync profile from web app when it posts a message
chrome.runtime.onMessageExternal.addListener(async (msg, _sender, sendResponse) => {
  if (msg.type === 'GB_PROFILE_UPDATE') {
    await chrome.storage.sync.set({ profile: msg.profile })
    sendResponse({ ok: true })
  }
})
