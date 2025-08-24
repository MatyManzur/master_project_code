import { Box, HStack, Text, IconButton } from '@chakra-ui/react'
import { HiArrowLeft } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

interface ActionBarProps {
  title: string
  showBackButton?: boolean
  onBack?: () => void
}

export default function ActionBar({ title, showBackButton = false, onBack }: ActionBarProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <Box
      bg="primary"
      borderBottom="1px solid"
      borderColor="border"
      p={4}
      position="sticky"
      top={0}
      zIndex={999}
      w="full"
      h="8vh"
    >
      <HStack gap={3} align="center" h="100%" w="full">
        {showBackButton && (
          <IconButton
            aria-label="Go back"
            variant="ghost"
            size="md"
            onClick={handleBack}
            color="onPrimary"
            _hover={{
              bg: 'onPrimary',
              color: 'primary',
            }}
          >
            <HiArrowLeft />
          </IconButton>
        )}
        <Text fontSize="lg" fontWeight="semibold" color="onPrimary">
          {title}
        </Text>
      </HStack>
    </Box>
  )
}