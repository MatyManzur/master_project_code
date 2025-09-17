import { Box, Button, HStack, Image, Text, VStack, Checkbox } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { InstructionPicture } from "../components/InstructionPicture";
import { HiCamera, HiCheck, HiRefresh, HiX, HiUpload, HiInformationCircle, HiSwitchHorizontal, HiUserCircle, HiPhotograph } from "react-icons/hi";
import { MdRotateRight } from "react-icons/md";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { ImageFrame } from "../components/ImageFrame";
import { useTranslation } from "react-i18next";
import { HiExclamationTriangle } from "react-icons/hi2";
import { startBrightnessMonitoring } from "../helpers/ImageHelper";
import type { BrightnessAnalysis } from "../helpers/ImageHelper";

// Camera brightness monitoring configuration
const CAMERA_CONFIG = {
  BRIGHTNESS_CHECK_INTERVAL_MS: 800, // How often to check brightness in milliseconds
};

export function Home() {

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [error, setError] = useState('');
  const [cameraState, setCameraState] = useState<'initial' | 'streaming' | 'captured' | 'permission-denied'>('initial');
  const [showInstructions, setShowInstructions] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // Estados para zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  // Camera management
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [frontCameras, setFrontCameras] = useState<MediaDeviceInfo[]>([]);
  const [backCameras, setBackCameras] = useState<MediaDeviceInfo[]>([]);
  
  // Brightness monitoring
  const [brightnessStatus, setBrightnessStatus] = useState<'too-dark' | 'ok' | 'too-bright' | null>(null);
  const [showBrightnessMessage, setShowBrightnessMessage] = useState(false);
  const brightnessMonitorRef = useRef<(() => void) | null>(null);
  
  const navigate = useNavigate();
  const { setCapturedImage: setContextImage } = useReport();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<(MediaStream | null)>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    
    // Start brightness monitoring when camera is ready
    if (videoRef.current) {
      setTimeout(() => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          startBrightnessAnalysis();
        }
      }, 1000);
    }
  };

  const startBrightnessAnalysis = () => {
    if (!videoRef.current) return;
    
    // Stop any existing monitoring
    if (brightnessMonitorRef.current) {
      brightnessMonitorRef.current();
    }
    
    brightnessMonitorRef.current = startBrightnessMonitoring(
      videoRef.current,
      (analysis: BrightnessAnalysis) => {
        setBrightnessStatus(analysis.status);
        
        if (analysis.status !== 'ok') {
          setShowBrightnessMessage(true);
        } else {
          setShowBrightnessMessage(false);
        }
      },
      CAMERA_CONFIG.BRIGHTNESS_CHECK_INTERVAL_MS
    );
  };

  const stopBrightnessAnalysis = () => {
    if (brightnessMonitorRef.current) {
      brightnessMonitorRef.current();
      brightnessMonitorRef.current = null;
    }
    setBrightnessStatus(null);
    setShowBrightnessMessage(false);
  };

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      const frontCams: MediaDeviceInfo[] = [];
      const backCams: MediaDeviceInfo[] = [];
      
      videoDevices.forEach(device => {
        const label = device.label.toLowerCase();
        if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
          frontCams.push(device);
        } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          backCams.push(device);
        } else {
          const index = videoDevices.indexOf(device);
          if (index % 2 === 0) {
            backCams.push(device);
          } else {
            frontCams.push(device);
          }
        }
      });
      
      setFrontCameras(frontCams);
      setBackCameras(backCams);
      
      return { frontCams, backCams };
    } catch (err) {
      return { frontCams: [], backCams: [] };
    }
  };

  const startCameraWithMode = async (mode: string, cameraIndex?: number) => {
    try {
      setError('');
      setCameraState('streaming');
      setZoomLevel(1);
      
      let currentBackCams = backCameras;
      let currentFrontCams = frontCameras;
      
      if (availableCameras.length === 0) {
        const { frontCams, backCams } = await enumerateCameras();
        currentBackCams = backCams;
        currentFrontCams = frontCams;
      }
      
      const useIndex = cameraIndex !== undefined ? cameraIndex : currentCameraIndex;
      
      let videoConstraints: any = {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      };

      let couldSelectDevice = false;
      if (mode === 'environment' && currentBackCams.length > 0) {
        const selectedIndex = useIndex % currentBackCams.length;
        if (currentBackCams[selectedIndex].deviceId) {
          videoConstraints.deviceId = { exact: currentBackCams[selectedIndex].deviceId };
          couldSelectDevice = true;
        }
      } else if (mode === 'user' && currentFrontCams.length > 0) {
        const selectedIndex = useIndex % currentFrontCams.length;
        if (currentFrontCams[selectedIndex].deviceId) {
          videoConstraints.deviceId = { exact: currentFrontCams[selectedIndex].deviceId };
          couldSelectDevice = true;
        }
      }
      if (!couldSelectDevice) {
        videoConstraints.facingMode = mode;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setupCameraCapabilities();
          // Re-enumerate cameras after successful stream to get updated device info with permissions
          enumerateCameras();
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(t('Camera permission was denied_ Please grant camera access to continue_'));
        setCameraState('permission-denied');
      } else {
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
    stopBrightnessAnalysis();
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
    setCurrentCameraIndex(0);
    setZoomLevel(1);
    setTimeout(() => startCameraWithMode(newFacingMode, 0), 100);
  };

  const switchToNextCamera = async () => {
    stopCamera();
    
    let currentCameras;
    if (availableCameras.length === 0) {
      const { frontCams, backCams } = await enumerateCameras();
      currentCameras = facingMode === 'environment' ? backCams : frontCams;
    } else {
      currentCameras = facingMode === 'environment' ? backCameras : frontCameras;
    }
    
    if (currentCameras.length > 1) {
      const newIndex = (currentCameraIndex + 1) % currentCameras.length;
      setCurrentCameraIndex(newIndex);
      setZoomLevel(1);
      setTimeout(() => startCameraWithMode(facingMode, newIndex), 100);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setRotationAngle(0);
    setError('');
    setZoomLevel(1);
    setCameraState('initial');
    stopBrightnessAnalysis();
  };

  const rotateImage = () => {
    setRotationAngle((prev) => (prev + 90));
  };

  useEffect(() => {
    enumerateCameras();
    
    return () => {
      stopCamera();
    };
  }, []);

  const shouldShowInstructions = () => {
    return localStorage.getItem('hidePhotoInstructions') !== 'true';
  };

  const isCameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function onNewReport() {
    if (!isCameraSupported) {
      setError(t('Camera is not supported on this device_'));
      return;
    }
    
    if (shouldShowInstructions()) {
      setShowInstructions(true);
    } else {
      startCameraWithMode(facingMode);
    }
  }

  function onUploadPicture() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setCapturedImage(result);
          setCameraState('captured');
          setRotationAngle(0);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        const img = new window.Image();
        
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

  function onCloseInstructions() {
    setShowInstructions(false);
    setDontShowAgain(false);
  }

  function onAcceptInstructions() {
    if (dontShowAgain) {
      localStorage.setItem('hidePhotoInstructions', 'true');
    }
    setShowInstructions(false);
    setDontShowAgain(false);
    startCameraWithMode(facingMode);
  }

  return (
    <>
      <ActionBar title={'FixTheSign'} />
      
      {showInstructions && (
        <Box 
          position="fixed" 
          top={0} 
          left={0} 
          right={0} 
          bottom={0} 
          bg="background" 
          zIndex={3000}
          display="flex"
          flexDirection="column"
        >
          <Box position="absolute" top={4} right={4} zIndex={1}>
            <Button
              bg="surface"
              color="onSurface"
              size="md"
              borderRadius="full"
              onClick={onCloseInstructions}
              _hover={{ bg: 'onSurface', color: 'surface' }}
            >
              <HiX size={16} />
            </Button>
          </Box>
          
          <Box pt={8} pb={8} px={6}>
            <HStack justifyContent="start" gap={3} >
              <Box color="primary"><HiInformationCircle size={24}  /></Box>
              <Text fontSize="xl" fontWeight="bold" textAlign="center">
                {t('How to take a good picture')}
              </Text>
            </HStack>
          </Box>
          
          <Box flex={1} px={6} py={0}>
            <VStack gap={6} h="60vh" align="stretch" overflowY="auto">
                <InstructionPicture
                  imageSrc="/tilt_instruction.png"
                  imageAlt="Instruction 1"
                  message="Use the grid to ensure the sign is aligned."
                />
                
                <InstructionPicture
                  imageSrc="/flare_instruction.png"
                  imageAlt="Instruction 2"
                  message="Avoid reflections on the signs."
                />
                <InstructionPicture
                  imageSrc="/blur_instruction.png"
                  imageAlt="Instruction 3"
                  message="Avoid blurry pictures."
                />
                
                <InstructionPicture
                  imageSrc="/big_instruction.png"
                  imageAlt="Instruction 4"
                  message="Do not take the picture too up close from the sign."
                />
                <InstructionPicture
                  imageSrc="/small_instruction.png"
                  imageAlt="Instruction 5"
                  message="Do not take the picture too far away from the sign. Use the camera zoom if needed."
                />
            </VStack>
          </Box>
          
          <Box p={6} pb={8}>
            <VStack gap={4}>
              <HStack gap={3} alignItems="center">
                <Checkbox.Root
                  checked={dontShowAgain}
                  onCheckedChange={(e) => setDontShowAgain(!!e.checked)}
                  colorPalette="primary"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <Text fontSize="sm" color="textSecondary">
                      {t('Do not show again')}
                    </Text>
                  </Checkbox.Label>
                </Checkbox.Root>
              </HStack>
              
              <Button
                bg="primary"
                color="onPrimary"
                size="xl"
                w="full"
                onClick={onAcceptInstructions}
                _hover={{
                  bg: 'onPrimary',
                  color: 'primary',
                }}
              >
                <Text fontSize="lg" fontWeight="bold">
                  {t('OK')}
                </Text>
              </Button>
            </VStack>
          </Box>
        </Box>
      )}
      
      {error && (
        <Box p={4}>
          <Box bg="error" color="background" p={4} borderRadius="md">
            <Text fontWeight="bold">{t('Error')}</Text>
            <Text>{error}</Text>
          </Box>
        </Box>
      )}

      {cameraState === 'initial' && (
        <VStack gap={'2vh'}>
          <Box display="flex" justifyContent="center" alignItems="center" maxH='24vh' my={'5vh'}>
            <Image
              src="/pwa-512.png"
              alt="FixTheSign logo"
              maxH='24vh'
              objectFit="contain"
              draggable={false}
              bg='background'
            />
          </Box>
          <Box w='full' alignContent={'center'} justifyContent={'center'} display={'flex'}>
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
          <Text color="textSecondary" fontWeight={'thin'}>{t('or')}</Text>
          <Box w='full' alignContent={'center'} justifyContent={'center'} display={'flex'}>
            <Button 
              variant="outline" 
              size="xl"
              _hover={{
                bg: 'surface',
              }}
              onClick={onUploadPicture}
            >
              <HiUpload/>
              <Text fontSize="md" fontWeight="bold">
                {t('Upload picture from device')}
              </Text>
            </Button>
          </Box>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
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
              <Text color="textSecondary" fontWeight={'thin'}>{t('or')}</Text>
              <Button 
                variant="outline" 
                size="xl"
                _hover={{
                  bg: 'surface',
                }}
                onClick={onUploadPicture}
              >
                <HiUpload/>
                <Text fontSize="md" fontWeight="bold">
                  {t('Upload picture from device')}
                </Text>
              </Button>
            </VStack>
              {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
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
              position="relative"
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
              
              {/* 3x3 Grid Overlay */}
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                pointerEvents="none"
                opacity={0.3}
              >
                {/* Vertical lines */}
                <Box
                  position="absolute"
                  left="33.33%"
                  top={0}
                  bottom={0}
                  w="1px"
                  bg="white"
                />
                <Box
                  position="absolute"
                  left="66.66%"
                  top={0}
                  bottom={0}
                  w="1px"
                  bg="white"
                />
                {/* Horizontal lines */}
                <Box
                  position="absolute"
                  top="33.33%"
                  left={0}
                  right={0}
                  h="1px"
                  bg="white"
                />
                <Box
                  position="absolute"
                  top="66.66%"
                  left={0}
                  right={0}
                  h="1px"
                  bg="white"
                />
              </Box>
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
            
            {/* Brightness warning message */}
            {showBrightnessMessage && brightnessStatus && brightnessStatus !== 'ok' && (
              <Box
                position="absolute"
                bottom={24}
                left="50%"
                transform="translateX(-50%)"
                bg={brightnessStatus === 'too-dark' ? 'warning' : 'error'}
                color="background"
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                textAlign="center"
                maxW="80%"
                boxShadow="lg"
                zIndex={10}
              >
                {brightnessStatus === 'too-dark' 
                  ? t('Scene is too dark - try moving to better lighting')
                  : t('Scene is too bright - try reducing exposure or moving away from bright light')
                }
              </Box>
            )}
            
            {/* Camera indicator */}
            {((facingMode === 'environment' && backCameras.length > 1) || 
              (facingMode === 'user' && frontCameras.length > 1)) && (
              <Box
                position="absolute"
                top={24}
                left={8}
                bg="surface"
                color="onSurface"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
                display="flex"
                alignItems="center"
                gap={1}
              >
                {facingMode === 'environment' ? 
                  <><HiPhotograph size={16} /><Text>{currentCameraIndex + 1}/{backCameras.length}</Text></> : 
                  <><HiUserCircle size={16} /><Text>{currentCameraIndex + 1}/{frontCameras.length}</Text></>}
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
              
              {/* Switch between cameras of same facing mode */}
              {((facingMode === 'environment' && backCameras.length > 1) || 
                (facingMode === 'user' && frontCameras.length > 1)) && (
                <Button
                  bg="surface"
                  color="onSurface"
                  size="lg"
                  borderRadius="full"
                  onClick={switchToNextCamera}
                  _hover={{ bg: 'background' }}
                >
                  <HiSwitchHorizontal size={16} />
                </Button>
              )}
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
        <Box py={4} px={'10vw'} w="100vw">
          <Box w="full"  mx="auto" h="full">
            
            <Box 
              bg="warning" 
              color="background"
              p={3} 
              borderRadius="md"
              mb={3}
            >
              <HStack>
                <HiExclamationTriangle size='36px' />
                <Text fontSize="xs" textAlign="center">
                  {t('Please ensure no personal or sensitive information is visible in this image as it may be publicly accessible_')}
                </Text>
              </HStack>
              
            </Box>
            
            {/* Container with extra space for rotated images */}
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center"
              h="40vh"
              w="40vh"
              overflow="hidden"
              mb={4}
              mx='auto'
            >
              <Box transform={`rotate(${rotationAngle}deg)`} transition="transform 0.3s ease" m='auto' w='full' h='full'  >
                <ImageFrame
                  imageSrc={capturedImage}
                  imageAlt={t("Captured damage")}
                  maxHeight="40vh"
                  maxWidth="40vh"
                />
              </Box>
            </Box>
            
            <HStack justifyContent="center" alignItems={'center'} gap={3} mb={3}>
              <Button
                //variant="outline"
                size="lg"
                onClick={rotateImage}
                bg='secondary'
                color='onSecondary'
                _hover={{
                  bg: 'onSecondary',
                  color: 'secondary',
                }}
              >
                <MdRotateRight />
                <Text ml={2}>{t('Rotate')}</Text>
              </Button>
              <Box 
                bg="info" 
                color="background"
                p={3} 
                borderRadius="md"
                w='80vw'
                position="relative"
              >
                <HStack>
                  <HiInformationCircle size='36px' />
                  <Text fontSize="xs" textAlign="center">
                    {t('Please ensure the image is properly oriented before proceeding_ Use the rotate button if needed_')}
                  </Text>
                </HStack>
                <Box 
                  bg="info"
                  w='1.5vh'
                  h='1.5vh'
                  position='absolute'
                  left='-0.75vh'
                  top='50%'
                  zIndex={-1}
                  transform='translateY(-50%) rotate(45deg)'
                > </Box> {/* little triangle */}
                
              </Box>
            </HStack>
            
            <Box display="flex" gap={3} justifyContent="center" mb={4}>
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

              <Button
                bg="primary"
                color="onPrimary"
                size="lg"
                onClick={onKeepPicture}
                _hover={{
                  bg: 'onPrimary',
                  color: 'primary',
                }}
              >
                <HiCheck />
                <Text ml={2}>{t('Keep picture')}</Text>
              </Button>
              
              
            </Box>
            
            
          </Box>
        </Box>
      )}
    </>
  )
}