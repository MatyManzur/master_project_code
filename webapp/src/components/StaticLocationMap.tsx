import type { LatLng } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

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