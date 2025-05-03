const map = L.map('map', {
  center: [37.7749, -122.4194],
  zoom: 13,
  minZoom: 11,
  maxZoom: 18
});


L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors'
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
  const zip = props.zip_code || props.ZIPCODE || props.name || 'Unknown';

  if (!zip) return;

  featureMap[zip] = layer;

  layer.bindPopup(`<b>${zip}</b>`);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });

  // Only dropdown logic remains
  const option = document.createElement('option');
  option.value = zip;
  option.textContent = zip;
  document.getElementById('zipDropdown').appendChild(option);
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

// Sidebar toggle button
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-hidden');
});
