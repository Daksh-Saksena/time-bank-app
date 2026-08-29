import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SERVICE_LABELS, URGENCY } from '../../constants';

// Fix default leaflet marker asset paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RealMap({ requests = [], onAccept, role = 'volunteer' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Base center: Mumbai (Colaba)
  const defaultCenter = [18.9220, 72.8347];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // User location pulse marker
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            width: 16px;
            height: 16px;
            background: #2E86AB;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(46,134,171,0.8);
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker(defaultCenter, { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Your Location</b><br>Colaba, Mumbai');

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old request markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Add markers for requests
    requests.forEach((req, idx) => {
      // Offset positions slightly around Colaba if lat/lng are not stored
      const latOffset = ((idx % 5) - 2) * 0.005;
      const lngOffset = (((idx * 2) % 5) - 2) * 0.005;
      const lat = req.lat || defaultCenter[0] + latOffset;
      const lng = req.lng || defaultCenter[1] + lngOffset;

      const isUrgent = req.urgency === URGENCY.HIGH;
      const color = isUrgent ? '#E74C3C' : '#1B4F72';

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
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <span>${SERVICE_LABELS[req.serviceType]?.split(' ')[0] || req.serviceType}</span>
            ${isUrgent ? '<span style="color:#FFF;font-size:9px;">(Urgent)</span>' : ''}
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: system-ui; padding: 4px; min-width: 160px;">
          <h4 style="margin: 0 0 4px; font-size: 13px;">${SERVICE_LABELS[req.serviceType] || req.serviceType}</h4>
          <p style="margin: 0 0 6px; font-size: 11px; color: #555;">${req.description || 'No description'}</p>
          <div style="font-size: 10px; color: #888; margin-bottom: 6px;">Location: ${req.location || 'Colaba'}</div>
          ${
            role === 'volunteer' && req.status === 'open'
              ? `<button id="accept-btn-${req.id}" style="
                  background: #1B4F72;
                  color: white;
                  border: none;
                  padding: 4px 10px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-weight: 600;
                  font-size: 11px;
                  width: 100%;
                ">Accept Request</button>`
              : `<span style="font-size: 10px; color: ${req.status === 'open' ? 'green' : '#888'}; font-weight: 600;">Status: ${req.status}</span>`
          }
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`accept-btn-${req.id}`);
        if (btn && onAccept) {
          btn.onclick = () => {
            onAccept(req);
            marker.closePopup();
          };
        }
      });

      markersRef.current.push(marker);
    });

    // Invalidate size in case container rendered while hidden
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [requests, onAccept, role]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '340px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        border: '1px solid var(--color-border)',
        zIndex: 1,
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
