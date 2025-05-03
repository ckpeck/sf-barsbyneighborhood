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
          const barid = String(feature.properties.barid).trim().toLowerCase();
          const match = attributeData.find(row => String(row.barid).trim().toLowerCase() === barid);

           if (!match) {
             console.warn(`❌ No match for barid: ${barid}`);
           } else {
             console.log(`✅ Joined barid: ${barid}`, match);
             feature.properties = { ...feature.properties, ...match };
          }
        });

        // Add updated points to the map
        L.geoJSON(pointGeojson, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties;
            const count = parseFloat(props.countofattendees) || 0;

      // Define a color scale based on count
            function getColor(val) {
              return val > 5 ? '#800026' :
                     val > 4 ? '#BD0026' :
                     val > 3 ? '#E31A1C' :
                     val > 2 ? '#FC4E2A' :
                     val > 1 ? '#FD8D3C' :
                     val > 0 ? '#FEB24C' :
                       '#FFEDA0'; // lightest for 0
            }
            
            const marker = L.circleMarker(latlng, {
              radius: 6,
              color: '#222',
              fillColor: getColor(count),
              fillOpacity: 0.85,
              weight: 1
            });

    // Show all relevant joined data in popup
            const popupContent = `
            <b>${props.name || "Unnamed Bar"}</b><br>
            <b>Status:</b> ${props.status || "N/A"}<br>
            <b>Neighborhood:</b> ${props.neighborhood || "N/A"}<br>
            <b>Attendees:</b> ${props.countofattendees || "0"}<br>
            <b>Type:</b> ${props.type || "N/A"}<br>
            <b>Notes:</b> ${props.notes || ""}
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
