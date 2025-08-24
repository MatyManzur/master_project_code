import { Box, Button, Text } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { HiCamera, HiCheck, HiRefresh, HiX } from "react-icons/hi";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { ImageFrame } from "../components/ImageFrame";

export function Home() {

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [error, setError] = useState('');
  const [cameraState, setCameraState] = useState<'initial' | 'streaming' | 'captured'>('initial');
  const navigate = useNavigate();
  const { setCapturedImage: setContextImage } = useReport();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<(MediaStream | null)>(null);

  const startCameraWithMode = async (mode: string) => {
    try {
      setError('');
      setCameraState('streaming');
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
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      // i18n
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
      setCameraState('initial');
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
    setTimeout(() => startCameraWithMode(newFacingMode), 100);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setError('');
    setCameraState('initial');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isCameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function onNewReport() {
    if (!isCameraSupported) {
      setError('Camera is not supported on this device.'); // i18n
      return;
    }
    startCameraWithMode(facingMode);
  }

  function onKeepPicture() {
    if (capturedImage) {
      setContextImage(capturedImage);
      navigate('/send-report');
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
      <ActionBar title="New Report" /> {/* i18n */}
      
      {error && (
        <Box p={4}>
          <Box bg="error" color="background" p={4} borderRadius="md">
            <Text fontWeight="bold">Error</Text> {/* i18n */}
            <Text>{error}</Text>
          </Box>
        </Box>
      )}

      {cameraState === 'initial' && (
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
              Report damage
            </Text>{/* i18n */}
          </Button>
        </Box>
      )}

      {cameraState === 'streaming' && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="black" zIndex={2000}>
          <Box position="relative" w="full" h="full">
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
            <ImageFrame
              imageSrc={capturedImage}
              imageAlt="Captured damage"
            />           
            
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
                <Text ml={2}>Keep picture</Text> {/* i18n */}
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
                <Text ml={2}>Try again</Text> {/* i18n */}
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
                Please ensure no personal or sensitive information is visible in this image as it may be publicly accessible. {/* i18n */}
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </>
  )
}