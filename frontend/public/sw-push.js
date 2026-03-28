/* eslint-disable no-restricted-globals */

// Pigma Push Notification Service Worker

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Pigma", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/logo192.png",
    badge: "/logo192.png",
    tag: data.tag || "pigma-notification",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "Shop Now" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Pigma", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  if (event.action === "close") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
