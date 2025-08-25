import { Box, Button, Text, VStack } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { useEffect } from "react";

export function ReportSuccess() {
  const navigate = useNavigate();
  const { setCapturedImage } = useReport();

  // Generate a random report number for demonstration
  const reportNumber = Math.random().toString(36).substr(2, 9).toUpperCase();

  useEffect(() => {
    // Clear the captured image when reaching success page
    setCapturedImage(null);
  }, [setCapturedImage]);

  function handleNewReport() {
    navigate('/home');
  }

  return (
    <>
      <ActionBar
        title="Report Submitted"
        showBackButton={false}
      />
      <Box w="100vw" alignContent="center" justifyContent="center" display="flex" mt={8}>
        <VStack gap={6} maxW="80vw" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="primary">
            Report submitted successfully!
          </Text>
          <Text fontSize="lg">
            Report number: <Text as="span" fontWeight="bold">{reportNumber}</Text>
          </Text>
          <Text fontSize="md" color="gray.600">
            It will be processed soon.
          </Text>
          <Button
            color="onSecondary"
            bg="secondary"
            _hover={{ bg: 'onSecondary', color: 'secondary' }}
            onClick={handleNewReport}
            size="lg"
            mt={4}
          >
            Start New Report
          </Button>
        </VStack>
      </Box>
    </>
  );
}
