import { Box, Skeleton, Spinner, Text } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    label: string;
}

interface ImageFrameProps {
    imageSrc: string;
    imageAlt?: string;
    maxHeight?: string;
    maxWidth?: string;
    boundingBoxes?: BoundingBox[];
}

export function ImageFrame({ imageSrc, imageAlt = "image", maxHeight = "50vh", maxWidth = "100%", boundingBoxes = [] }: ImageFrameProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const { t } = useTranslation();

    const handleImageLoad = () => {
        if (imageRef.current) {
            const img = imageRef.current;
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            
            // Use requestAnimationFrame to ensure the image is fully rendered before getting display dimensions
            requestAnimationFrame(() => {
                if (imageRef.current) {
                    setDisplayDimensions({ 
                        width: imageRef.current.offsetWidth, 
                        height: imageRef.current.offsetHeight 
                    });
                }
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    };

    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    useEffect(() => {
        const updateDisplayDimensions = () => {
            if (imageRef.current) {
                setDisplayDimensions({ 
                    width: imageRef.current.offsetWidth, 
                    height: imageRef.current.offsetHeight 
                });
            }
        };

        window.addEventListener('resize', updateDisplayDimensions);
        return () => window.removeEventListener('resize', updateDisplayDimensions);
    }, []);

    const calculateBoundingBoxPosition = (bbox: BoundingBox) => {
        if (imageDimensions.width === 0 || imageDimensions.height === 0) return null;
        
        const scaleX = displayDimensions.width / imageDimensions.width;
        const scaleY = displayDimensions.height / imageDimensions.height;
        
        return {
            left: bbox.x1 * scaleX,
            top: bbox.y1 * scaleY,
            width: (bbox.x2 - bbox.x1) * scaleX,
            height: (bbox.y2 - bbox.y1) * scaleY,
        };
    };

    return (
    <Box mb={4} display="flex" justifyContent="center" alignItems={'center'} position="relative" h='100%' w='100%'>
        {isLoading && boundingBoxes.length === 0 && (
            <Skeleton 
                height={maxHeight} 
                width="150px"
                borderRadius="8px"
            />
        )}
        {isLoading && boundingBoxes.length > 0 && (
            <Box 
                position="absolute" 
                top={0} 
                left={0} 
                width="100%" 
                height="100%" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                borderRadius="8px"
            >
                <Spinner />
            </Box>
        )}
        <Box 
            position="relative" 
            display="inline-block"
            opacity={isLoading ? 0 : 1}
            visibility={hasError ? "hidden" : "visible"}
        >
            <img
                ref={imageRef}
                src={imageSrc}
                alt={imageAlt}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={boundingBoxes.length === 0 ? {
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    height: 'auto',
                    width: 'auto',
                    borderRadius: '8px',
                    border: '2px solid'
                } : {
                    height: maxHeight,
                    width: maxWidth,
                    borderRadius: '8px',
                    border: '2px solid'
                }}
            />
            {/* Bounding box overlays */}
            {!isLoading && boundingBoxes.map((bbox, index) => {
                const position = calculateBoundingBoxPosition(bbox);
                if (!position) return null;
                
                return (
                    <Box key={index}>
                        {/* Bounding box rectangle */}
                        <Box
                            position="absolute"
                            left={`${position.left}px`}
                            top={`${position.top}px`}
                            width={`${position.width}px`}
                            height={`${position.height}px`}
                            border={`2px solid ${bbox.color}`}
                            borderRadius="2px"
                            pointerEvents="none"
                        />
                        {/* Label tag */}
                        <Box
                            position="absolute"
                            left={`${position.left}px`}
                            top={`${position.top - 24}px`}
                            bg={bbox.color}
                            color="white"
                            px={2}
                            py={1}
                            borderRadius="4px"
                            fontSize="xs"
                            fontWeight="bold"
                            pointerEvents="none"
                            whiteSpace="nowrap"
                            transform={position.top < 24 ? `translateY(${position.height + 24}px)` : 'none'}
                        >
                            <Text fontSize="xs">{bbox.label}</Text>
                        </Box>
                    </Box>
                );
            })}
        </Box>
        {hasError && !isLoading && (
            <Box 
                height={maxHeight} 
                width={maxWidth}
                borderRadius="8px"
                border="2px solid"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="gray.100"
                color="gray.500"
            >
                {t('Failed to load image')}
            </Box>
        )}
    </Box>);
}