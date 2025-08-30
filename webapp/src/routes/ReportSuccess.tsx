import { Box, Button, Text, VStack } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { useEffect } from "react";

export function ReportSuccess() {
  const navigate = useNavigate();
  const { setCapturedImage, reportUuid, setReportUuid } = useReport();

  useEffect(() => {
    setCapturedImage(null);
    
    if (!reportUuid) {
      navigate('/home');
    }
  }, [setCapturedImage, reportUuid, navigate]);

  function handleNewReport() {
    setReportUuid(null);
    navigate('/home');
  }

  return (
    <>
      <ActionBar
        title="Report Submitted" 
        showBackButton={false}
      /> {/* i18n */}
      <Box w="100vw" alignContent="center" justifyContent="center" display="flex" mt={8}>
        <VStack gap={6} maxW="80vw" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="primary">
            Report submitted successfully!
          </Text> {/* i18n */}
          <Text fontSize="lg">
            Report number: <Text as="span" fontWeight="bold">{reportUuid || 'N/A'}</Text>
          </Text> {/* i18n */}
          <Text fontSize="md" color="gray.600">
            It will be processed soon.
          </Text>   {/* i18n */}
          <Button
            color="onSecondary"
            bg="secondary"
            _hover={{ bg: 'onSecondary', color: 'secondary' }}
            onClick={handleNewReport}
            size="lg"
            mt={4}
          >
            Start New Report
          </Button> {/* i18n */}
        </VStack>
      </Box>
    </>
  );
}
