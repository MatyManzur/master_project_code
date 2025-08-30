import { 
  Box, 
  Button, 
  HStack, 
  Text, 
  VStack,
  Spinner
} from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { ImageFrame } from "../components/ImageFrame";
import { useReport } from "../providers/ReportProvider";
import { useState, useEffect } from "react";
import type { LatLng } from "leaflet";
import { LocationSelectorMap } from "../components/LocationSelectorMap";
import { useNavigate } from "react-router-dom";
import { toaster } from "../components/ui/toaster";
import { submitReport as submitReportService } from "../services/ReportService";

export function SendReport() {
  const { capturedImage, setReportUuid } = useReport();
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [description, setDescription] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<'back' | 'discard' | 'submit' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const MAX_FIELD_LENGTH = 480;

  // Automatically navigate to home if no image is captured
  useEffect(() => {
    if (!capturedImage) {
      navigate('/home');
    }
  }, [capturedImage, navigate]);

  function onBack() {
    if (!isSubmitting) {
      setConfirmAction('back');
    }
  }

  function handleDiscard() {
    setConfirmAction('discard');
  }

  function handleSubmit() {
    if (selectedLocation) {
      setConfirmAction('submit');
    }
  }

  function confirmAndExecuteAction() {
    switch (confirmAction) {
      case 'back':
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "/home";
        }
        break;
      case 'discard':
        navigate('/home');
        break;
      case 'submit':
        setConfirmAction(null); // Close dialog first
        submitReport(); // Then start submission
        break;
    }
    if (confirmAction !== 'submit') {
      setConfirmAction(null);
    }
  }

  function cancelAction() {
    setConfirmAction(null);
  }

  async function submitReport() {
    if (!selectedLocation || !capturedImage) return;
    
    setIsSubmitting(true);
    
    try {
      toaster.create({
        title: "Submitting report...", // i18n
        type: "loading",
        id: "submit-report"
      });
      
      const trimmedDescription = (description.trim().length > MAX_FIELD_LENGTH)
        ? description.trim().slice(0, MAX_FIELD_LENGTH)
        : (description.trim() || undefined);

      const trimmedAddress = (address && address.length > MAX_FIELD_LENGTH)
        ? address.slice(0, MAX_FIELD_LENGTH)
        : (address || undefined);

      const response = await submitReportService(
        capturedImage,
        { lat: selectedLocation.lat, lng: selectedLocation.lng },
        trimmedDescription,
        trimmedAddress
      );
      
      setReportUuid(response.report_uuid);
      toaster.dismiss("submit-report");
      navigate('/report-success');
    } catch (err) {
      toaster.dismiss("submit-report");
      
      toaster.create({
        title: "Failed to submit report", // i18n
        description: err instanceof Error ? err.message : 'Please try again.', // i18n
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
          <Text minH='4vh'>
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
              color="onSurface"
              bg="surface"
              border="1px solid"
              borderColor="border"
              _hover={{ bg: 'onSurface', color: 'surface' }}
              onClick={handleDiscard}
              disabled={isSubmitting}
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
              disabled={!selectedLocation || isSubmitting}
              size="xl"
            >
              {isSubmitting ? (
                <HStack gap={2}>
                  <Spinner size="sm" />
                  <Text>Submitting...</Text>
                </HStack>
              ) : (
                'Submit Report'
              )}
            </Button>
          </HStack>
        </VStack>        
      </Box>
      )}

      {/* Confirmation Dialog */}
      {confirmAction !== null && !isSubmitting && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          zIndex="overlay"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={cancelAction}
        >
          <Box
            bg="background"
            color="onBackground"
            boxShadow="xl"
            borderRadius="md"
            p={6}
            maxW="md"
            w="90%"
            zIndex="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <VStack gap={4} align="stretch">
              <Text fontSize="lg" fontWeight="bold">
                {confirmAction === 'back' && 'Discard Report'} {/* i18n */}
                {confirmAction === 'discard' && 'Discard Report'} {/* i18n */}
                {confirmAction === 'submit' && 'Submit Report'} {/* i18n */}
              </Text>
              
              <Text>
                {confirmAction === 'back' && 'Are you sure you want to go back? Any unsaved changes will be lost.'} {/* i18n */}
                {confirmAction === 'discard' && 'Are you sure you want to discard this report? This action cannot be undone.'} {/* i18n */}
                {confirmAction === 'submit' && 'Are you sure you want to submit this report?'} {/* i18n */}
              </Text>
              
              <HStack gap={3} justify="flex-end">
                <Button 
                  variant="outline" 
                  onClick={cancelAction}
                >
                  Cancel
                </Button>
                <Button 
                  bg='primary'
                  color='onPrimary'
                  _hover={{ bg: 'onPrimary', color: 'primary' }}
                  onClick={confirmAndExecuteAction}
                >
                  {confirmAction === 'back' && 'Discard'} {/* i18n */}
                  {confirmAction === 'discard' && 'Discard'} {/* i18n */}
                  {confirmAction === 'submit' && 'Submit'} {/* i18n */}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </>
  );
}