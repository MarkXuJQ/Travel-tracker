<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import 'leaflet/dist/leaflet.css';
  import { loadWorldData } from '$lib/utils/mapUtils';
  import { travelConfig } from '$lib/data/travelConfig';
  import { CHINA_PROVINCES } from '$lib/data/chinaData';
  import { journeyStore } from '$lib/utils/journeyStore';

  let mapElement: HTMLElement;
  let map: any;
  let geoJsonLayer: any;
  let chinaLayer: any;
  let journeyLayerGroup: any;
  let L: any;

  // Layer state
  let activeLayerName: 'osm' | 'satellite' = 'osm';
  let tileLayers: Record<string, any> = {};

  // Subscribe to journey store to update markers
  $: if (map && $journeyStore) {
    updateJourneyMarkers();
  }

  async function initMap() {
    if (!browser) return;
    
    // Dynamic import to avoid SSR issues
    const leafletModule = await import('leaflet');
    L = leafletModule.default;

    // Define layers
    tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        noWrap: false // Allow wrapping to show extra width
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        noWrap: false // Allow wrapping to show extra width
      })
    };

    // Define bounds: expand by 50% on each side (total width = 2 * 360 = 720 degrees)
    // Left: -180 - 180 = -360, Right: 180 + 180 = 360
    const southWest = L.latLng(-90, -360);
    const northEast = L.latLng(90, 360);
    const bounds = L.latLngBounds(southWest, northEast);

    map = L.map(mapElement, {
      maxBounds: bounds,
      maxBoundsViscosity: 1.0, // Fully sticky to prevent going out of bounds
      minZoom: 1.5,
      worldCopyJump: false
    }).setView([35, 105], 4); 
    
    tileLayers[activeLayerName].addTo(map);

    journeyLayerGroup = L.layerGroup().addTo(map);

    // Load World GeoJSON
    try {
      const worldData = await loadWorldData('/world-atlas.json');
      
      geoJsonLayer = L.geoJSON(worldData, {
        style: worldStyle,
        onEachFeature: onEachFeature
      }).addTo(map);
    } catch (error) {
      console.error("Failed to load world data:", error);
    }

    // Load China GeoJSON
    try {
      const chinaData = await loadWorldData('/china-provinces.json');
      
      chinaLayer = L.geoJSON(chinaData, {
        style: chinaStyle,
        onEachFeature: onEachFeature
      }).addTo(map);
    } catch (error) {
      console.error("Failed to load China data:", error);
    }

    // Add City Markers
    addCityMarkers();
    // Add Journey Markers
    updateJourneyMarkers();
  }

  function updateJourneyMarkers() {
    if (!map || !L || !journeyLayerGroup) return;
    
    journeyLayerGroup.clearLayers();

    const journeyIcon = L.divIcon({
      className: 'journey-marker',
      html: `<div class="animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 drop-shadow-md" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    $journeyStore.forEach(journey => {
      // If coordinates are missing, try to find them in chinaData by location name
      let coords = journey.coordinates;
      if (!coords) {
        const province = CHINA_PROVINCES.find(p => p.name === journey.location || p.cities.some(c => c.name === journey.location));
        if (province) {
          const city = province.cities.find(c => c.name === journey.location);
          if (city) coords = [city.lat, city.lng];
          else coords = [province.lat, province.lng];
        }
      }

      if (coords) {
        L.marker(coords, { icon: journeyIcon })
          .bindPopup(`
            <div class="p-2 min-w-[150px]">
              <h3 class="font-bold text-base text-blue-700">${journey.title}</h3>
              <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                <span>📅 ${journey.date}</span>
                <span>📍 ${journey.location}</span>
              </div>
              <p class="text-sm mt-2 text-gray-600 border-t pt-2">${journey.description}</p>
            </div>
          `)
          .addTo(journeyLayerGroup);
      }
    });
  }

  function addCityMarkers() {
    const cityIcon = L.divIcon({
      className: 'custom-city-marker',
      html: '<div style="width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; border: 1px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    CHINA_PROVINCES.forEach(province => {
      province.cities.forEach(city => {
        if (travelConfig.visitedChinaCities.includes(city.name)) {
          L.marker([city.lat, city.lng], { icon: cityIcon })
            .bindPopup(`<b>${city.name}</b><br>${province.name}`)
            .addTo(map);
        }
      });
    });
  }

  function worldStyle(feature: any) {
    const countryName = feature.properties.name;
    // Special case for China: we don't highlight the whole country in the world layer
    // because we have a dedicated chinaLayer for province-level highlighting.
    const isVisited = countryName !== 'China' && travelConfig.visitedCountries.includes(countryName);
    
    return {
      fillColor: isVisited ? '#4ade80' : '#e5e7eb',
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: isVisited ? 0.6 : 0.3
    };
  }

  function chinaStyle(feature: any) {
    const provinceName = feature.properties.name;
    const isVisited = travelConfig.visitedChinaProvinces.some(p => provinceName.includes(p));
    
    return {
      fillColor: isVisited ? '#facc15' : 'transparent',
      weight: 1,
      opacity: 1,
      color: '#9ca3af',
      dashArray: '1',
      fillOpacity: isVisited ? 0.5 : 0
    };
  }

  function onEachFeature(feature: any, layer: any) {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(feature.properties.name);
      
      layer.on({
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.8
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
          }
        },
        mouseout: (e: any) => {
          // Determine which style to reset to based on the layer
          // This is a bit tricky since we share this handler.
          // Simple fix: just reset to default style of the layer
          if (chinaLayer && chinaLayer.hasLayer(layer)) {
            chinaLayer.resetStyle(layer);
          } else if (geoJsonLayer && geoJsonLayer.hasLayer(layer)) {
            geoJsonLayer.resetStyle(layer);
          }
        },
        click: (e: any) => {
          map.fitBounds(e.target.getBounds());
        }
      });
    }
  }

  function switchLayer(layerKey: 'osm' | 'satellite') {
    if (map && tileLayers[layerKey]) {
      map.removeLayer(tileLayers[activeLayerName]);
      activeLayerName = layerKey;
      tileLayers[activeLayerName].addTo(map);
    }
  }

  onMount(() => {
    initMap();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div class="w-full h-full relative">
  <div bind:this={mapElement} class="w-full h-full z-0 bg-gray-100"></div>

  <!-- Layer Control -->
  <div class="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow-md flex flex-col gap-2 border border-gray-200">
    <button 
      class="px-3 py-1 text-sm font-medium rounded transition-colors {activeLayerName === 'osm' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}"
      on:click={() => switchLayer('osm')}
    >
      Street Map
    </button>
    <button 
      class="px-3 py-1 text-sm font-medium rounded transition-colors {activeLayerName === 'satellite' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}"
      on:click={() => switchLayer('satellite')}
    >
      Satellite
    </button>
  </div>
</div>
