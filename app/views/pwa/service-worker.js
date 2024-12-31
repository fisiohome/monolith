// Add a service worker for processing Web Push notifications:

// The install event is fired when the service worker is first installed
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

// The activate event is fired after the install event when the service worker is actually controlling the page
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener("push", async (event) => {
  /**
   * Extracts the title and options from the event data.
   *
   * @param {Event} event - The event object containing the data.
   * @returns {Promise<{title: string, options: Object}>} A promise that resolves to an object containing the title and options.
   */
  console.log(await event.data)
  const { title, options } = await event.data.json()
  event.waitUntil(self.registration.showNotification(title, options))
})

// self.addEventListener("notificationclick", function (event) {
//   event.notification.close()
//   event.waitUntil(
//     clients.matchAll({ type: "window" }).then((clientList) => {
//       for (let i = 0; i < clientList.length; i++) {
//         let client = clientList[i]
//         let clientPath = (new URL(client.url)).pathname

//         if (clientPath == event.notification.data.path && "focus" in client) {
//           return client.focus()
//         }
//       }

//       if (clients.openWindow) {
//         return clients.openWindow(event.notification.data.path)
//       }
//     })
//   )
// })
