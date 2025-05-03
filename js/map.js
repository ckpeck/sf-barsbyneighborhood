const map = L.map('map', {
  center: [37.7749, -122.4194],
  zoom: 12,
  minZoom: 10,
  maxZoom: 18
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
  subdomains: 'abcd',
}).addTo(map);

let geojson;
let featureMap = {};
let allZips = [];

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
  allZips.push(zip);

  layer.bindPopup(`<b>${zip}</b>`);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });

  // Add to dropdown only
  const option = document.createElement('option');
  option.value = zip;
  option.textContent = zip;
  document.getElementById('zipDropdown').appendChild(option);
}

// Populate dropdown (sorted ZIPs)
function populateDropdown() {
  const dropdown = document.getElementById('zipDropdown');
  const sortedZips = allZips.sort((a, b) => a.localeCompare(b));
  
  for (const zip of sortedZips) {
    const option = document.createElement('option');
    option.value = zip;
    option.textContent = zip;
    dropdown.appendChild(option);
  }
}

// Dropdown interaction
document.getElementById('zipDropdown').addEventListener('change', (e) => {
  const selectedZip = e.target.value;
  if (featureMap[selectedZip]) {
    map.fitBounds(featureMap[selectedZip].getBounds());
    featureMap[selectedZip].openPopup();
  } else {
    map.setView([37.7749, -122.4194], 12); // Reset view
  }
});
// Load external attributes from Google Sheets using PapaParse
Papa.parse("https://docs.google.com/spreadsheets/d/e/2PACX-1vQfR6CgMCiafL-VEP3oSbIqTDmfHXkPF4VgZfLKe0ZW_Zt3DI56JuulaSEPnHLDSHsgLisTRPxmq1AG/pub?output=csv", {
  download: true,
  header: true,
  complete: function(results) {
    const attributeData = results.data;

    // Load GeoJSON points
    fetch("data/sfbars_coordsandneighborhoods_20250502.geojson")
      .then(res => res.json())
      .then(pointGeojson => {
        // Match by barid
        pointGeojson.features.forEach(feature => {
          const barid = feature.properties.barid;
          const match = attributeData.find(row => row.barid === barid);

          if (match) {
            feature.properties = { ...feature.properties, ...match };
          }
        });

        // Add updated points to the map
        L.geoJSON(pointGeojson, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties;
            const marker = L.circleMarker(latlng, {
              radius: 6,
              color: '#222',
              fillColor: '#0088cc',
              fillOpacity: 0.8,
              weight: 1
            });

            const popupContent = `
              <b>${props.name || "Unnamed Bar"}</b><br>
              Status: ${props.status || "N/A"}<br>
              Neighborhood: ${props.neighborhood || "N/A"}<br>
              Notes: ${props.notes || ""}
            `;
            marker.bindPopup(popupContent);
            return marker;
          }
        }).addTo(map);
      });
  }
});

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-hidden');
});

// Load GeoJSON
fetch('data/sfzipcodes.geojson')
  .then(response => response.json())
  .then(geojsonData => {
    geojson = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    populateDropdown();
  })
  .catch(error => console.error('Error loading GeoJSON data:', error));
