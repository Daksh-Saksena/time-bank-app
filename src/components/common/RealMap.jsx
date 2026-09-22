import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SERVICE_LABELS, SERVICE_ICONS, URGENCY } from '../../constants';
import { useApp } from '../../context/AppContext';
import { getCoordinatesForPincode, getDeviceCoordinates } from '../../lib/geo';
import { Locate, Compass } from 'lucide-react';

// Fix default leaflet marker asset paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RealMap({ requests = [], onAccept, role = 'volunteer' }) {
  const { currentUser } = useApp();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function init() {
      // 1. Determine user center: GPS -> currentUser.pincode -> Default (Delhi)
      let center = [28.6139, 77.2090]; // Default New Delhi
      if (currentUser?.pincode) {
        center = await getCoordinatesForPincode(currentUser.pincode);
      }

      // Check if user has GPS already available
      const deviceCoords = await getDeviceCoordinates();
      if (deviceCoords) {
        center = deviceCoords;
      }

      if (!isMounted) return;
      setMapCenter(center);

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom: 14,
          zoomControl: true,
        });

        // OpenStreetMap Tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      map.setView(center, 14);

      // User location pulse marker
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
      }

      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            width: 18px;
            height: 18px;
            background: #2563EB;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(37,99,235,0.8);
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const userLabel = currentUser?.area
        ? `${currentUser.area} (${currentUser?.pincode || ''})`
        : currentUser?.pincode
        ? `Pincode ${currentUser.pincode}`
        : 'Your Location';

      userMarkerRef.current = L.marker(center, { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Your Location</b><br>${userLabel}`);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.pincode, currentUser?.area]);

  // Update request markers when requests change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    let isMounted = true;

    async function updateMarkers() {
      // Clear old request markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const baseCenter = mapCenter || [28.6139, 77.2090];
      const bounds = L.latLngBounds([baseCenter]);

      for (let idx = 0; idx < requests.length; idx++) {
        const req = requests[idx];
        let reqBase = baseCenter;

        if (req.pincode && req.pincode !== currentUser?.pincode) {
          reqBase = await getCoordinatesForPincode(req.pincode);
        }

        // Pseudo-random offset based on req.id or idx so markers in the same area don't overlap exactly
        const seed = (req.id ? req.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : idx * 17);
        const latOffset = (((seed % 7) - 3) * 0.0035);
        const lngOffset = ((((seed * 3) % 7) - 3) * 0.0035);

        const lat = req.lat || reqBase[0] + latOffset;
        const lng = req.lng || reqBase[1] + lngOffset;

        bounds.extend([lat, lng]);

        const isUrgent = req.urgency === URGENCY.HIGH;
        const color = isUrgent ? '#DC2626' : '#2563EB';

        const customIcon = L.divIcon({
          className: 'custom-req-marker',
          html: `
            <div style="
              background: ${color};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              <span>${SERVICE_ICONS[req.serviceType] || '🤝'}</span>
              <span>${SERVICE_LABELS[req.serviceType]?.split(' ')[0] || req.serviceType}</span>
              ${isUrgent ? '<span style="color:#FEF08A;font-size:9px;">(Urgent)</span>' : ''}
            </div>
          `,
          iconSize: [88, 26],
          iconAnchor: [44, 13],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: system-ui; padding: 6px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 16px;">${SERVICE_ICONS[req.serviceType] || '🤝'}</span>
              <h4 style="margin: 0; font-size: 13px; font-weight: 800;">${SERVICE_LABELS[req.serviceType] || req.serviceType}</h4>
            </div>
            <p style="margin: 0 0 6px; font-size: 11px; color: #4B5563; line-height: 1.4;">${req.description || 'मदद चाहिए'}</p>
            <div style="font-size: 10px; color: #6B7280; margin-bottom: 6px;">
              📍 ${req.location || 'Local Area'} ${req.pincode ? `(${req.pincode})` : ''}
            </div>
            ${
              role === 'volunteer' && (req.status === 'open' || req.status === 'notified_trusted')
                ? `<button id="map-accept-btn-${req.id}" style="
                    background: #2563EB;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 11px;
                    width: 100%;
                  ">स्वीकार करें (Accept)</button>`
                : `<div style="font-size: 10px; color: #059669; font-weight: 700;">स्थिति: ${req.status}</div>`
            }
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`map-accept-btn-${req.id}`);
          if (btn && onAccept) {
            btn.onclick = () => {
              onAccept(req);
              marker.closePopup();
            };
          }
        });

        markersRef.current.push(marker);
      }

      if (!isMounted) return;

      // If multiple requests, fit view to show all
      if (requests.length > 0 && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 200);
    }

    updateMarkers();

    return () => {
      isMounted = false;
    };
  }, [requests, onAccept, role, mapCenter, currentUser?.pincode]);

  // Handler for Locate Me button
  async function handleLocateMe() {
    if (!mapInstanceRef.current) return;
    setLocating(true);
    const coords = await getDeviceCoordinates();
    setLocating(false);

    if (coords) {
      mapInstanceRef.current.flyTo(coords, 15, { animate: true, duration: 1 });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(coords);
        userMarkerRef.current.bindPopup('<b>Current Device Location</b>').openPopup();
      }
    } else {
      alert('Could not access device GPS. Please allow location permissions in your browser.');
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '340px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        border: '1.5px solid var(--color-border)',
        zIndex: 1,
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating GPS button */}
      <button
        type="button"
        onClick={handleLocateMe}
        title="Locate my position"
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          zIndex: 400,
          background: 'white',
          border: '1.5px solid var(--color-border)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: locating ? 'var(--color-primary)' : 'var(--color-text-primary)',
        }}
      >
        <Locate size={20} className={locating ? 'spin' : ''} />
      </button>
    </div>
  );
}
