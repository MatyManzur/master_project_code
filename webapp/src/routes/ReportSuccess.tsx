import { Box, Button, Text, VStack } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { useNavigate } from "react-router-dom";
import { useReport } from "../providers/ReportProvider";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function ReportSuccess() {
  const navigate = useNavigate();
  const { setCapturedImage, reportUuid, setReportUuid } = useReport();

  const { t } = useTranslation();

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

  function handleSeeReport() {
    if (reportUuid) {
      navigate(`/reports/${reportUuid}`);
    }
  }

  return (
    <>
      <ActionBar
        title={t("Report Submitted")}
        showBackButton={false}
      />
      <Box w="100vw" alignContent="center" justifyContent="center" display="flex" mt={8}>
        <VStack gap={6} maxW="80vw" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="primary">
            {t('Report submitted successfully_e')}
          </Text>
          <Text fontSize="lg">
            {t('Report ID')}: <Text as="span" fontWeight="bold">{reportUuid || 'N/A'}</Text>
          </Text>
          <Text fontSize="md" color="gray.600">
            {t('It will be processed soon_')}
          </Text>
          <Button
            color="onPrimary"
            bg="primary"
            _hover={{ bg: 'onPrimary', color: 'primary' }}
            onClick={handleSeeReport}
            size="lg"
            mt={4}
          >
            {t('See this report')}
          </Button>
          <Button
            color="onSecondary"
            bg="secondary"
            _hover={{ bg: 'onSecondary', color: 'secondary' }}
            onClick={handleNewReport}
            size="lg"
            mt={4}
          >
            {t('Start New Report')}
          </Button>
        </VStack>
      </Box>
    </>
  );
}
