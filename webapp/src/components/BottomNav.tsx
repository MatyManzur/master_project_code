import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { HiDocumentCheck, HiDocumentPlus } from "react-icons/hi2"
import { useLocation, useNavigate } from "react-router-dom"


export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('/home')
  
  useEffect(() => {
    setActiveTab(location.pathname)
  }, [location.pathname])

  const navItems = [
    { path: '/home', label: 'New Report', icon: HiDocumentPlus }, //i18n
    { path: '/reports', label: 'My Reports', icon: HiDocumentCheck }, //i18n
  ]

  const handleNavigation = (path: string) => {
        navigate(path)
        setActiveTab(path)
    }

  return (
    <>
      <Box
        display={{ base: 'block'}}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="surface"
        borderTop="1px solid"
        borderColor="border"
        p={3}
        zIndex={1000}
        boxShadow="0 -2px 8px rgba(0,0,0,0.15)"
      >
        <HStack 
          gap={2}
          justify="space-around"
          w="full"
        >
          {navItems.map((item) => (
            <Box key={item.path} flex={1}>
              <Button
                onClick={() => handleNavigation(item.path)}
                variant="ghost"
                size="lg"
                w="full"
                h="64px"
                display="flex"
                flexDirection="column"
                bg={activeTab === item.path ? 'focus' : 'transparent'}
                color={activeTab === item.path ? 'onFocus' : 'onSurface'}
                _hover={{
                  bg: activeTab === item.path ? 'onFocus' : 'onSurface',
                  color: activeTab === item.path ? 'focus' : 'surface',
                }}
                borderRadius="lg"
                gap={1}
              >
                <VStack gap={1}>
                  <item.icon size={20} />
                  <Text fontSize="xs" fontWeight="medium">
                    {item.label}
                  </Text>
                </VStack>
              </Button>
            </Box>
          ))}
        </HStack>
      </Box>
    </>
  )
}