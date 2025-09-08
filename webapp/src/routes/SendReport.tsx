import { 
  Box, 
  Button, 
  HStack, 
  Text, 
  VStack,
  Spinner,
  Progress
} from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { ImageFrame } from "../components/ImageFrame";
import { useReport } from "../providers/ReportProvider";
import { useState, useEffect } from "react";
import type { LatLng } from "leaflet";
import { LocationSelectorMap } from "../components/LocationSelectorMap";
import { useNavigate } from "react-router-dom";
import { toaster } from "../components/ui/toaster";
import { submitReport as submitReportService, PROGRESS_STEPS } from "../services/ReportService";
import { useTranslation } from "react-i18next";

const ANIMATION_DURATION_PER_STEP = 8000;
const MAX_FIELD_LENGTH = 480;

export function SendReport() {
  const { capturedImage, setReportUuid, addReportUuid } = useReport();
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [description, setDescription] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<'back' | 'discard' | 'submit' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    setSubmitProgress(0);

    const animateProgress = (startProgress: number, targetProgress: number) => {
      const progressDiff = targetProgress - startProgress;
      const duration = ANIMATION_DURATION_PER_STEP;
      const steps = 100;
      const stepDuration = duration / steps;
      const stepIncrement = progressDiff / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const newProgress = startProgress + (stepIncrement * currentStep);
        
        if (currentStep >= steps || newProgress >= targetProgress) {
          setSubmitProgress(targetProgress);
          clearInterval(interval);
        } else {
          setSubmitProgress(newProgress);
        }
      }, stepDuration);

      return interval;
    };

    const getNextProgressStep = (currentProgress: number): number => {
      return PROGRESS_STEPS.find(step => step > currentProgress) || PROGRESS_STEPS[PROGRESS_STEPS.length - 1];
    };
    
    try {
      const trimmedDescription = (description.trim().length > MAX_FIELD_LENGTH)
        ? description.trim().slice(0, MAX_FIELD_LENGTH)
        : (description.trim() || undefined);

      const trimmedAddress = (address && address.length > MAX_FIELD_LENGTH)
        ? address.slice(0, MAX_FIELD_LENGTH)
        : (address || undefined);

      let currentInterval: NodeJS.Timeout | null = animateProgress(0, PROGRESS_STEPS[0]);

      const response = await submitReportService(
        capturedImage,
        { lat: selectedLocation.lat, lng: selectedLocation.lng },
        trimmedDescription,
        trimmedAddress,
        (progress) => {
          if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
          }
          
          setSubmitProgress(progress);
          
          const finalStep = PROGRESS_STEPS[PROGRESS_STEPS.length - 1];
          if (progress < finalStep) {
            const nextTarget = getNextProgressStep(progress);
            currentInterval = animateProgress(progress, nextTarget);
          }
        }
      );
      
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      
      setReportUuid(response.report_uuid);
      addReportUuid(response.report_uuid);
      navigate('/report-success');
    } catch (err) {
      toaster.create({
        title: t("Failed to submit report"),
        description: err instanceof Error ? err.message : t('Please try again'),
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(0);
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
    setAddress(t('Loading address___'));
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
        title={t("Send Report")}
        showBackButton={true}
        onBack={onBack}
      ></ActionBar>
      {capturedImage && (
      <Box w='full' alignContent={'center'} justifyContent={'flex-start'} display={'flex'} mt={4}>
        <VStack w='full'>
          <HStack gap="4vw" maxH="30vh" justifyContent={'space-between'} alignItems={'flex-start'}>
            <VStack alignItems="flex-start" gap={'1em'} justifyContent={'flex-start'} maxW="50vw" ml="0vw">
              <Text fontSize="xl" fontWeight="bold">{t('New Report')}</Text>
              <Box w="full">
                <Text mb={1}>{t('Description _optional_')}:</Text>
                <textarea
                  placeholder={t("Describe the damage___")}
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
              imageAlt={t("Captured damage")}
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
              {t('Discard Report')}
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
                  <Text>{t('Submitting___')}</Text>
                </HStack>
              ) : (
                t('Submit Report')
              )}
            </Button>
          </HStack>
        </VStack>        
      </Box>
      )}

      {/* Progress Dialog */}
      {isSubmitting && (
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
        >
          <Box
            bg="background"
            color="onBackground"
            boxShadow="xl"
            borderRadius="md"
            p={8}
            maxW="sm"
            w="90%"
            zIndex="modal"
          >
            <VStack gap={6} align="stretch">
              <VStack gap={4}>
                <Spinner size="lg" color="primary" />
                <Text fontSize="lg" fontWeight="bold" textAlign="center">
                  {t('Submitting report___')}
                </Text>
              </VStack>
              
              <VStack gap={2}>
                <Progress.Root 
                  value={submitProgress} 
                  w="100%" 
                  colorPalette="yellow"
                  size="lg"
                >
                  <Progress.Track bg="surface" borderRadius="full">
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>
            </VStack>
          </Box>
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
                {confirmAction === 'back' && t('Discard Report')}
                {confirmAction === 'discard' && t('Discard Report')} 
                {confirmAction === 'submit' && t('Submit Report')} 
              </Text>
              
              <Text>
                {confirmAction === 'back' && t('Are you sure you want to go back_q Any unsaved changes will be lost_')}
                {confirmAction === 'discard' && t('Are you sure you want to discard this report_q This action cannot be undone_')}
                {confirmAction === 'submit' && t('Are you sure you want to submit this report_q')}
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
                  {confirmAction === 'back' && t('Discard')}
                  {confirmAction === 'discard' && t('Discard')}
                  {confirmAction === 'submit' && t('Submit')}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </>
  );
}