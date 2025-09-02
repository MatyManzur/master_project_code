import { Box, Skeleton } from "@chakra-ui/react";
import { useState } from "react";

interface ImageFrameProps {
    imageSrc: string;
    imageAlt?: string;
    maxHeight?: string;
    maxWidth?: string;
}

export function ImageFrame({ imageSrc, imageAlt = "image", maxHeight = "50vh", maxWidth = "100%" }: ImageFrameProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
    <Box mb={4} display="flex" justifyContent="center" position="relative" minHeight={maxHeight}>
        {isLoading && (
            <Skeleton 
                height={maxHeight} 
                width="150px"
                borderRadius="8px"
            />
        )}
        {!isLoading && !hasError && (
            <img
                src={imageSrc}
                alt={imageAlt}
                style={{
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    height: 'auto',
                    width: 'auto',
                    borderRadius: '8px',
                    border: '2px solid'
                }}
            />
        )}
        <img
            src={imageSrc}
            alt=""
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
                position: 'absolute',
                opacity: 0,
                pointerEvents: 'none',
                width: '1px',
                height: '1px'
            }}
        />
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
                Failed to load image {/* i18n */}
            </Box>
        )}
    </Box>);
}