import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { LatLng } from "leaflet";
import { HiLocationMarker } from "react-icons/hi";



export function LocationSelectorMap({ onLocationChange }: { onLocationChange?: (pos: LatLng) => void}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  function MapEvents({ setPosition, onLocationChange }: { setPosition: (pos: LatLng) => void, onLocationChange?: (pos: LatLng) => void }) {
    useMapEvents({
      moveend(e) {
        const center = e.target.getCenter();
        const pos = new LatLng(center.lat, center.lng);
        setPosition(pos);
        if (onLocationChange) {
          onLocationChange(pos);
        }
      },
    });
    return null;
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = new LatLng(pos.coords.latitude, pos.coords.longitude);
          setPosition(newPos);
          if (onLocationChange) {
            onLocationChange(newPos);
          }
        },
        (err) => {          
          setError(() => {
            switch(err.code) { //i18n!!
              case err.PERMISSION_DENIED: 
                return "Permission to access location was denied.";
              case err.POSITION_UNAVAILABLE:
                return "Location information is unavailable in this device.";
              case err.TIMEOUT:
                return "The request to get user location timed out.";
              default:
                return "An unknown error occurred while fetching location.";
            }
          });
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  return (
    <Box w="full" h="full" position="relative">
      {position && (
        <>
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={17}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents setPosition={setPosition} onLocationChange={onLocationChange} />
          </MapContainer>

          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -100%)"
            fontSize="3xl"
            zIndex={1000}
            color="red.500"
          >
            <HiLocationMarker size="1.4em" />
          </Box>
        </>
      )}
      {!position && !error && (
        <Flex
          w="100%"
          h="100%"
          align="center"
          justify="center"
          direction="column"
          gap={4}
        >
          <Spinner size="xl" color="blue.500" />
          <Box>📍 Obtaining Location...</Box> {/* i18n */}
        </Flex>
      )}
      {error && (
        <Box p={4} w="80%" m="0 auto 0 auto">
          <Box bg="error" color="background" p={4} borderRadius="md">
            <Text fontWeight="bold">Location Error</Text> {/* i18n */}
            <Text>{error}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );

}