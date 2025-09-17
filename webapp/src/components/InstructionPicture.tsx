import { Box, Image, Text, HStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

interface InstructionPictureProps {
  imageSrc: string;
  imageAlt: string;
  message: string;
  imageSize?: string;
}

export function InstructionPicture({ 
  imageSrc, 
  imageAlt, 
  message, 
  imageSize = "16vw" 
}: InstructionPictureProps) {
  const { t } = useTranslation();

  return (
    <HStack gap={3} align="center" flex={1}>
      <Box
        w={imageSize}
        h={imageSize}
        bg="surface"
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          w={imageSize}
          h={imageSize}
          objectFit="contain"
        />
      </Box>
      <Text fontSize="xs" textAlign="start" color="textSecondary" lineHeight="tight" maxW='70vw'>
        {t(message)}
      </Text>
    </HStack>
  );
}
