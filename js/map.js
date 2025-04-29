const map = L.map('map').setView([37.7749, -122.4194], 12);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
}).addTo(map);

let geojson; 
let featureMap = {}; 
let allZips = []; // list of zip codes

// Styles
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
  const zip = props.zip_code || props.ZIPCODE || props.name || 'Unknown'; // Adjust field name if needed

  if (!zip) return;

  featureMap[zip] = layer;
  allZips.push(zip); // store all ZIPs

  layer.bindPopup(`<b>${zip}</b>`);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });

  // Sidebar List
  const li = document.createElement('li');
  li.textContent = zip;
  li.setAttribute('data-zip', zip); // easier to filter later
  li.addEventListener('click', () => {
    map.fitBounds(layer.getBounds());
    layer.openPopup();
  });
  document.getElementById('zipList').appendChild(li);
}

// Populate dropdown AFTER loading all ZIPs
function populateDropdown() {
  const dropdown = document.getElementById('zipDropdown');
  
  // Sort ZIPs numerically
  const sortedZips = allZips.sort((a, b) => a.localeCompare(b));
  
  for (const zip of sortedZips) {
    const option = document.createElement('option');
    option.value = zip;
    option.textContent = zip;
    dropdown.appendChild(option);
  }
}

// Dropdown Change
document.getElementById('zipDropdown').addEventListener('change', (e) => {
  const selectedZip = e.target.value;
  
  if (selectedZip && featureMap[selectedZip]) {
    map.fitBounds(featureMap[selectedZip].getBounds());
    featureMap[selectedZip].openPopup();
  } else {
    // Reset view to full San Francisco
    map.setView([37.7749, -122.4194], 12);
  }
});

// Live Sidebar Search
document.getElementById('searchBox').addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  const listItems = document.querySelectorAll('#zipList li');

  listItems.forEach(li => {
    const zip = li.getAttribute('data-zip');
    if (zip.toLowerCase().includes(query)) {
      li.style.display = '';
    } else {
      li.style.display = 'none';
    }
  });
});

// Fetch the GeoJSON
fetch('data/sfzipcodes.geojson')
  .then(response => response.json())
  .then(geojsonData => {
    geojson = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    populateDropdown(); // fill dropdown once features are loaded
  })
  .catch(error => console.error('Error loading GeoJSON data:', error));
