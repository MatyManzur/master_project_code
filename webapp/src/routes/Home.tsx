import { Box, Button, Text, VStack } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { HiCamera, HiCheck, HiRefresh, HiX } from "react-icons/hi";
import { MdRotateRight } from "react-icons/md";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { ImageFrame } from "../components/ImageFrame";
import { useTranslation } from "react-i18next";

export function Home() {

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [error, setError] = useState('');
  const [cameraState, setCameraState] = useState<'initial' | 'streaming' | 'captured' | 'permission-denied'>('initial');
  // Estados para zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  
  const navigate = useNavigate();
  const { setCapturedImage: setContextImage } = useReport();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<(MediaStream | null)>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const { t } = useTranslation();

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const applyZoom = async (newZoomLevel: number) => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const capabilities = videoTrack.getCapabilities() as any;
    if (capabilities.zoom) {
      const clampedZoom = Math.max(capabilities.zoom.min || 1, 
                                  Math.min(capabilities.zoom.max || 1, newZoomLevel));
      
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: clampedZoom } as any]
        });
        setZoomLevel(clampedZoom);
      } catch (err) {
        console.warn('Failed to apply zoom:', err);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsZooming(true);
      setLastTouchDistance(getTouchDistance(e.touches));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isZooming || e.touches.length !== 2) return;
    
    e.preventDefault();
    
    const currentDistance = getTouchDistance(e.touches);
    if (lastTouchDistance > 0) {
      const scale = currentDistance / lastTouchDistance;
      const newZoom = Math.max(1, Math.min(maxZoom, zoomLevel * scale));
      applyZoom(newZoom);
    }
    setLastTouchDistance(currentDistance);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsZooming(false);
      setLastTouchDistance(0);
    }
  };

  const setupCameraCapabilities = () => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const capabilities = videoTrack.getCapabilities() as any;
      if (capabilities.zoom) {
        setMaxZoom(capabilities.zoom.max || 3);
      } else {
        setMaxZoom(1); // Sin soporte de zoom
      }
    }
  };

  const startCameraWithMode = async (mode: string) => {
    try {
      setError('');
      setCameraState('streaming');
      setZoomLevel(1);
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setupCameraCapabilities();
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // Permission was denied
        setError(t('Camera permission was denied_ Please grant camera access to continue_'));
        setCameraState('permission-denied');
      } else {
        // Other errors (device not found, etc.)
        setError(t('Unable to access camera_ Please ensure you have granted camera permissions_'));
        setCameraState('initial');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
      setCameraState('captured');
    }

    stopCamera();
  };

  const switchCamera = async () => {
    stopCamera();
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    setZoomLevel(1);
    setTimeout(() => startCameraWithMode(newFacingMode), 100);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setRotationAngle(0);
    setError('');
    setZoomLevel(1);
    setCameraState('initial');
  };

  const rotateImage = () => {
    setRotationAngle((prev) => (prev + 90));
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isCameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function onNewReport() {
    if (!isCameraSupported) {
      setError(t('Camera is not supported on this device_'));
      return;
    }
    startCameraWithMode(facingMode);
  }

  function retryCamera() {
    setError('');
    startCameraWithMode(facingMode);
  }

  function onKeepPicture() {
    if (capturedImage) {
      // If image is rotated, create a rotated version to save
      if (rotationAngle !== 0) {
        const normRotationAngle = rotationAngle % 360;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          if (!ctx) return;
          
          // Set canvas dimensions based on rotation
          if (normRotationAngle === 90 || normRotationAngle === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          
          // Apply rotation
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((normRotationAngle * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          // Save rotated image
          const rotatedImageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setContextImage(rotatedImageDataUrl);
          navigate('/send-report');
        };
        
        img.src = capturedImage;
      } else {
        setContextImage(capturedImage);
        navigate('/send-report');
      }
    }
  }

  function onTryAgain() {
    resetCapture();
  }

  function onCloseCamera() {
    stopCamera();
    setCameraState('initial');
  }

  return (
    <>
      <ActionBar title={t("New Report")} />
      
      {error && (
        <Box p={4}>
          <Box bg="error" color="background" p={4} borderRadius="md">
            <Text fontWeight="bold">{t('Error')}</Text>
            <Text>{error}</Text>
          </Box>
        </Box>
      )}

      {cameraState === 'initial' && (
        <VStack>
          <Box w='full' alignContent={'center'} justifyContent={'center'} display={'flex'} mt={20}>
            <Button bg="secondary" color="onSecondary" size="2xl" 
              _hover={{
                  bg: 'onSecondary',
                  color: 'secondary',
                }}
              onClick={onNewReport}
            >
              <HiCamera/>
              <Text fontSize="lg" fontWeight="extrabold">
                {t('Report damage')}
              </Text>
            </Button>
          </Box>                   
      </VStack>
      )}

      {cameraState === 'permission-denied' && (
        <VStack gap={4} p={6}>
          <Box w='full' alignContent={'center'} justifyContent={'center'} display={'flex'} mt={10}>
            <VStack gap={4} textAlign="center">
              <HiCamera size={64} color="gray" />
              <Text fontSize="xl" fontWeight="bold">{t('Camera Permission Required')}</Text>
              <Text color="gray.600" px={4}> 
                {t('We need access to your camera to take photos of damage_')}
                {t('Please grant camera permission to continue_')}
              </Text>
              <Button 
                bg="secondary" 
                color="onSecondary" 
                size="lg"
                _hover={{
                  bg: 'onSecondary',
                  color: 'secondary',
                }}
                onClick={retryCamera}
              >
                <HiCamera />
                <Text ml={2}>{t('Grant Camera Access')}</Text>
              </Button>
            </VStack>
          </Box>
        </VStack>
      )}

      {cameraState === 'streaming' && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="black" zIndex={2000}>
          <Box position="relative" w="full" h="full">
            <Box
              ref={videoContainerRef}
              w="full"
              h="full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }} // Prevenir scroll/zoom del navegador
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'none'
                }}
              />
            </Box>
            
            {/* zoom indicator */}
            {zoomLevel > 1 && (
              <Box
                position="absolute"
                top={16}
                right={8}
                bg="surface"
                color="onSurface"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                {zoomLevel.toFixed(1)}x
              </Box>
            )}
            
            <Box position="absolute" bottom={8} left={0} right={0} display="flex" justifyContent="center" gap={4}>
              <Button
                bg="surface"
                color="onSurface"
                size="lg"
                borderRadius="full"
                onClick={capturePhoto}
                _hover={{ bg: 'background' }}
              >
                <HiCamera size={24} />
              </Button>
              
              <Button
                bg="surface"
                color="onSurface"
                size="lg"
                borderRadius="full"
                onClick={switchCamera}
                _hover={{ bg: 'background' }}
              >
                <HiRefresh size={20} />
              </Button>
            </Box>

            <Box position="absolute" top={8} left={8}>
              <Button
                bg="surface"
                color="onSurface"
                size="md"
                borderRadius="full"
                onClick={onCloseCamera}
                _hover={{ bg: 'background' }}
              >
                <HiX size={16} />
              </Button>
            </Box>
          </Box>
          
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>
      )}

      {cameraState === 'captured' && capturedImage && (
        <Box p={4}>
          <Box w="full" maxW="sm" mx="auto">
            <Box 
              bg="info" 
              color="background"
              p={3} 
              borderRadius="md"
              mb={3}
            >
              <Text fontSize="sm" textAlign="center">
                {t('Please ensure the image is properly oriented before proceeding_ Use the rotate button if needed_')}
              </Text>
            </Box>
            
            {/* Container with extra space for rotated images */}
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center"
              minHeight="50vh"
              overflow="hidden"
              mb={4}
            >
              <Box transform={`rotate(${rotationAngle}deg)`} transition="transform 0.3s ease">
                <ImageFrame
                  imageSrc={capturedImage}
                  imageAlt={t("Captured damage")}
                  maxHeight={"40vh"}
                />
              </Box>
            </Box>
            
            {/* Rotate button above other buttons */}
            <Box display="flex" justifyContent="center" mb={3}>
              <Button
                variant="outline"
                size="lg"
                onClick={rotateImage}
                _hover={{
                  bg: 'surface',
                }}
              >
                <MdRotateRight />
                <Text ml={2}>{t('Rotate')}</Text>
              </Button>
            </Box>
            
            {/* Main action buttons */}
            <Box display="flex" gap={3} justifyContent="center" mb={4}>
              <Button
                bg="secondary"
                color="onSecondary"
                size="lg"
                onClick={onKeepPicture}
                _hover={{
                  bg: 'onSecondary',
                  color: 'secondary',
                }}
              >
                <HiCheck />
                <Text ml={2}>{t('Keep picture')}</Text>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={onTryAgain}
                _hover={{
                  bg: 'surface',
                }}
              >
                <HiRefresh />
                <Text ml={2}>{t('Try again')}</Text>
              </Button>
            </Box>
            
            <Box 
              bg="warning" 
              color="background"
              p={3} 
              borderRadius="md"
              mt={3}
            >
              <Text fontSize="xs" textAlign="center">
                {t('Please ensure no personal or sensitive information is visible in this image as it may be publicly accessible_')}
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </>
  )
}