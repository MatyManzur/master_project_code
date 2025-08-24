import { Box } from "@chakra-ui/react";

interface ImageFrameProps {
    imageSrc: string;
    imageAlt?: string;
    maxHeight?: string;
    maxWidth?: string;
}

export function ImageFrame({ imageSrc, imageAlt = "image", maxHeight = "50vh", maxWidth = "100%" }: ImageFrameProps) {
    return (
    <Box mb={4} display="flex" justifyContent="center">
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
    </Box>);
}