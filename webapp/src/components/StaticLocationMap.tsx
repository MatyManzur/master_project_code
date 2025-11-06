import type { LatLng } from "leaflet";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

export function StaticLocationMap({ position }: { position: LatLng }) {
    return (
        <>
            <MapContainer
            center={[position.lat, position.lng]}
            zoom={16}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={false}
            >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
            </Marker>
            </MapContainer>            
        </>
    );
}