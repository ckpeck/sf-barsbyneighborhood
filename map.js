const map = L.map('map').setView([37.7749, -122.4194], 13); // SF example

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

L.marker([37.7749, -122.4194]).addTo(map)
  .bindPopup('San Francisco')
  .openPopup();