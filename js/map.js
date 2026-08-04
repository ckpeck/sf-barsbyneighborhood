// --- Map setup ---
const map = L.map('map', {
  center: [37.7749, -122.4194],
  zoom: 12,
  minZoom: 11,
  maxZoom: 18
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
  subdomains: 'abcd',
}).addTo(map);

// --- Global variables ---
let geojson;                  // ZIP code polygons
let featureMap = {};          // For ZIP dropdown zooming
let allZips = [];             // ZIP dropdown list
let allPointsGeoJSON = null;  // Full unfiltered point data
let pointLayer = null;        // Current visible point layer

// --- ZIP polygon styling ---
function style(feature) {
  return {
    color: "#3388ff",
    weight: 2,
    fillColor: "#66ccff",
    fillOpacity: 0.5
  };
}

// --- ZIP polygon styling (borders only, no fill) ---
function style(feature) {
  return {
    color: "#3388ff",
    weight: 1.5,
    fillOpacity: 0
  };
}

// --- ZIP feature setup (no hover/click, just labels) ---
function onEachFeature(feature, layer) {
  const props = feature.properties;
  const zip = props.zip_code || props.ZIPCODE || props.name || 'Unknown';
  if (!zip) return;

  featureMap[zip] = layer;
  allZips.push(zip);

  // Add permanent label (hidden until zoom >= 13)
  layer.bindTooltip(zip, {
    permanent: true,
    direction: "center",
    className: "zip-label",
    opacity: 0.8
  }).openTooltip();

  // Add to dropdown
  const option = document.createElement('option');
  option.value = zip;
  option.textContent = zip;
  document.getElementById('zipDropdown').appendChild(option);
}

// --- Control label visibility by zoom ---
map.on("zoomend", () => {
  const visible = map.getZoom() >= 13;
  document.querySelectorAll('.zip-label').forEach(el => {
    el.style.display = visible ? 'block' : 'none';
  });
});

// --- Populate ZIP dropdown ---
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

// --- ZIP dropdown change event ---
document.getElementById('zipDropdown').addEventListener('change', (e) => {
  const selectedZip = e.target.value;
  if (featureMap[selectedZip]) {
    map.fitBounds(featureMap[selectedZip].getBounds());
  } else {
    map.setView([37.7749, -122.4194], 12);
  }
});

// --- Sidebar toggle (button text is set in HTML to "Menu") ---
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-hidden');
});

// --- Populate Style filter dropdown ---
function populateStyleFilter(features) {
  const styleSet = new Set();
  features.forEach(f => {
    const s = f.properties.Style;
    if (s) styleSet.add(s);
  });

  const styleSelect = document.getElementById('styleFilter');
  [...styleSet].sort().forEach(style => {
    const opt = document.createElement('option');
    opt.value = style;
    opt.textContent = style;
    styleSelect.appendChild(opt);
  });
}

// --- Render Points Layer with Filtered Results ---
function renderPoints() {
  if (pointLayer) {
    map.removeLayer(pointLayer);
  }

  const selectedVisited = document.getElementById('attendeeFilter').value;
  const selectedStyle = document.getElementById('styleFilter').value;
  const searchText = document.getElementById('nameSearch').value.trim().toLowerCase();

  const stats = {
  bars: 0,
  people: {
    Allison: { yes: 0, no: 0 },
    Ben: { yes: 0, no: 0 },
    Christina: { yes: 0, no: 0 },
    Brian: { yes: 0, no: 0 },
    Kyle: { yes: 0, no: 0 }
  },
  group: [0,0,0,0,0,0]
};

  pointLayer = L.geoJSON(allPointsGeoJSON, {
    filter: feature => {
      const props = feature.properties;
      const visitedCount = parseInt(props.VisitedByCount) || 0;
      const style = (props.Style || "").toLowerCase();
      const name = (props["Bar Name"] || "").toLowerCase();

       const visitedMatch =
        selectedVisited === ""
            ? true
            : visitedCount === parseInt(selectedVisited);

    return (
        visitedMatch &&
        (selectedStyle === "" || style === selectedStyle.toLowerCase()) &&
        (searchText === "" || name.includes(searchText))
      );
    },
    pointToLayer: (feature, latlng) => {
      const props = feature.properties;
      const count = parseFloat(props.VisitedByCount) || 0;

      function getColor(val) {
        return val > 5 ? '#6B0C09' :
               val > 4 ? '#10540B' :
               val > 3 ? '#090C54' :
               val > 2 ? '#8C1278' :
               val > 1 ? '#224775' :
               val > 0 ? '#A230B3' :
                         '#F7F4bA';
      }

      const marker = L.circleMarker(latlng, {
        radius: 6,
        color: '#222',
        fillColor: getColor(count),
        fillOpacity: 0.85,
        weight: 1
      });
      stats.bars++;

["Allison","Ben","Christina","Brian","Kyle"].forEach(person => {

    if ((props[person] || "").toLowerCase() === "yes") {
        stats.people[person].yes++;
    } else {
        stats.people[person].no++;
    }

});

if (count >= 0 && count <= 5) {
    stats.group[count]++;
}

      const popupContent = `
        <b>${props["Bar Name"] || "Unnamed Bar"}</b><br>
        <b>Address:</b> ${props["St Address"] || "No address in sheet"}<br>
        <b>Neighborhood:</b> ${props["Neighborhood"] || "Add neighborhood to sheet"}<br>
        <b>Happy Hour:</b> ${props["Happy Hour"] || "None"}<br>
        <b>Style:</b> ${props["Style"] || "N/A"}<br>
        <b>Allison:</b> ${props["Allison"] || "no"}<br>
        <b>Ben:</b> ${props["Ben"] || "no"}<br>
        <b>Kyle:</b> ${props["Kyle"] || "no"}<br>
        <b>Christina:</b> ${props["Christina"] || "no"}<br>
        <b>Brian:</b> ${props["Brian"] || "no"}<br>
        <b>Comments:</b> ${props["Comments"] || ""}
      `;
      marker.bindPopup(popupContent);
      return marker;
    }
  }).addTo(map);
  
  updateDashboard(stats);

  // If search by name, zoom to first matching bar
  if (searchText) {
    const matches = pointLayer.getLayers();
    if (matches.length > 0) {
      const first = matches[0].getLatLng();
      map.setView(first, 16); // zoom in around 3500m equivalent (~16 in SF)
    }
  }
}

// --- Clear Filters function ---
function clearFilters() {
  document.getElementById('attendeeFilter').value = "";
  document.getElementById('styleFilter').value = "";
  document.getElementById('nameSearch').value = "";
  renderPoints();
  map.setView([37.7749, -122.4194], 12);
}

// --- Hook up filter inputs ---
["attendeeFilter", "styleFilter", "nameSearch"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderPoints);
});

// --- Load ZIP Layer First ---
fetch('data/sfzipcodes.geojson')
  .then(response => response.json())
  .then(geojsonData => {
    geojson = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    populateDropdown();
  })
  .catch(error => console.error('Error loading ZIP layer:', error));

// --- Load Google Sheet + Point GeoJSON + Join Data ---
Papa.parse("https://docs.google.com/spreadsheets/d/e/2PACX-1vQfR6CgMCiafL-VEP3oSbIqTDmfHXkPF4VgZfLKe0ZW_Zt3DI56JuulaSEPnHLDSHsgLisTRPxmq1AG/pub?output=csv", {
  download: true,
  header: true,
  complete: function(results) {
    const attributeData = results.data;

    fetch("data/sfbars_coordsandneighborhoods_20251111.geojson")
      .then(res => res.json())
      .then(pointGeojson => {
        pointGeojson.features.forEach(feature => {
          const barid = String(feature.properties.barid).trim().toLowerCase();
          const match = attributeData.find(row =>
            String(row.barid).trim().toLowerCase() === barid
          );

          if (match) {
            feature.properties = { ...feature.properties, ...match };
          }
        });

        allPointsGeoJSON = pointGeojson;
        populateStyleFilter(pointGeojson.features);
        renderPoints();
      });
  }
});
