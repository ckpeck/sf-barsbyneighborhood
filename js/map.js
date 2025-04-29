const map = L.map('map').setView([37.7749, -122.4194], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geojson; // will hold the layer
let featureMap = {}; // maps zip codes to layers

// Default style
function style(feature) {
  return {
    color: "#3388ff",
    weight: 2,
    fillColor: "#66ccff",
    fillOpacity: 0.5
  };
}

function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 4,
    color: '#666',
    fillColor: '#ffcc00',
    fillOpacity: 0.7
  });
  layer.bringToFront();
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  const props = feature.properties;
  const zip = props.zip_code || props.ZIP_CODE || props.name || 'Unknown'; // depending on your geojson fields

  if (!zip) return;

  featureMap[zip] = layer;

  layer.bindPopup(`<b>${zip}</b>`);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });

  // Add to sidebar list
  const li = document.createElement('li');
  li.textContent = zip;
  li.addEventListener('click', () => {
    map.fitBounds(layer.getBounds());
    layer.openPopup();
  });
  document.getElementById('zipList').appendChild(li);

  // Add to dropdown
  const option = document.createElement('option');
  option.value = zip;
  option.textContent = zip;
  document.getElementById('zipDropdown').appendChild(option);
}

// Dropdown event listener
document.getElementById('zipDropdown').addEventListener('change', (e) => {
  const selectedZip = e.target.value;
  if (featureMap[selectedZip]) {
    map.fitBounds(featureMap[selectedZip].getBounds());
    featureMap[selectedZip].openPopup();
  }
});

// 🧠 Correct simple fetch for GeoJSON
fetch('data/sfzipcodes.geojson')
  .then(geojsonData => {
    geojson = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);
  })
  .catch(error => console.error('Error loading GeoJSON data:', error));
