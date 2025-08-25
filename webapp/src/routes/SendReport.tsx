import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { ImageFrame } from "../components/ImageFrame";
import { useReport } from "../providers/ReportProvider";
import { useState } from "react";
import type { LatLng } from "leaflet";
import { LocationSelectorMap } from "../components/LocationSelectorMap";
import { useNavigate } from "react-router-dom";

export function SendReport() {
  const { capturedImage } = useReport();
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const navigate = useNavigate();

  function onBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/home";
    }
  }

  function handleDiscard() {
    navigate('/home');
  }

  function handleSubmit() {
    if (selectedLocation) {
      navigate('/report-success');
    }
  }

  async function reverseGeocode(lat: number, lng: number) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    if (!response.ok) throw new Error("Reverse geocoding failed");
    const data = await response.json();
    return data.display_name;
  }

  

  function onLocationChange(pos: LatLng) {
    setSelectedLocation(pos);
    setAddress('Loading address...'); // i18n
    reverseGeocode(pos.lat, pos.lng)
      .then(setAddress)
      .catch((err) => {
        console.error("Error fetching address:", err);
        setAddress(null);
      });
  }

  return (
    <>
      <ActionBar
        title="Send Report"
        showBackButton={true}
        onBack={onBack}
      ></ActionBar>{/* i18n */}
      {!capturedImage && (
        <Box w="100vw" alignContent="center" justifyContent="center" display="flex" mt={4}>
          <VStack gap={4}>
            <Text fontSize="lg" color="error" fontWeight="bold" ml="4"> {/* i18n */}
              No image to send. Please go back and take a picture.
            </Text>
            <Box>
              <Button
                color="onSecondary"
                bg="secondary"
                _hover={{ bg: 'onSecondary', color: 'secondary' }}
                onClick={onBack}
                size="xl"
              >
                Go back to take picture
              </Button> {/* i18n */}
            </Box>
          </VStack>
        </Box>
      )}
      {capturedImage && (
      <Box w='full' alignContent={'center'} justifyContent={'flex-start'} display={'flex'} mt={4}>
        <VStack w='full'>
          <HStack gap="4vw" maxH="30vh" justifyContent={'space-between'} alignItems={'flex-start'}>
            <VStack alignItems="flex-start" gap={'1em'} justifyContent={'flex-start'} maxW="50vw" ml="0vw">
              <Text fontSize="xl" fontWeight="bold">New Report</Text> {/* i18n */}
              <Box w="full">
                <Text mb={1}>Description (optional):</Text> {/* i18n */}
                <textarea
                  placeholder="Describe the damage..." // i18n
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    fontSize: "1rem",
                    minHeight: "14.5vh",
                  }}
                />
              </Box>
            </VStack>
            <ImageFrame
              imageSrc={capturedImage}
              imageAlt="Captured damage"
              maxWidth="40vw"
              maxHeight="25vh"
            />

          </HStack>          
          <Box w='full' h='35vh'>
            <LocationSelectorMap onLocationChange={onLocationChange} />
          </Box>
          <Text h='2vh'>
            {address ? (
              <>
                {address} 
              </>
            ) : (
              ''
            )}
          </Text>
          
          {/* Action Buttons */}
          <HStack gap={4} w="full" pt={4}>
            <Button
              flex={1}
              color="secondary"
              bg="onSecondary"
              border="1px solid"
              borderColor="secondary"
              _hover={{ bg: 'secondary', color: 'onSecondary' }}
              onClick={handleDiscard}
              size="xl"
            >
              Discard Report
            </Button>
            <Button
              flex={1}
              color="onSecondary"
              bg="secondary"
              _hover={{ bg: 'onSecondary', color: 'secondary' }}
              onClick={handleSubmit}
              disabled={!selectedLocation}
              size="xl"
            >
              Submit Report
            </Button>
          </HStack>
        </VStack>        
      </Box>
      )}
    </>
  );
}