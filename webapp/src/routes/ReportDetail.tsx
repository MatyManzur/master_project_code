import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Spinner, 
  Badge,
  Card,
  Button,
  Separator
} from "@chakra-ui/react";
import { HiLocationMarker, HiCalendar, HiPhotograph } from "react-icons/hi";
import ActionBar from "../components/ActionBar";
import { ImageFrame } from "../components/ImageFrame";
import { useReport } from "../providers/ReportProvider";
import { type Report } from "../services/ReportService";
import { StaticLocationMap } from "../components/StaticLocationMap";
import { HiChatBubbleLeftEllipsis } from "react-icons/hi2";
import { useTranslation } from "react-i18next";

export function ReportDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { getReportByUuid } = useReport();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    const loadReport = async () => {
      if (!uuid) {
        setError(t("Report not found"));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const fetchedReport = await getReportByUuid(uuid);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          setError(t("Report not found"));
        }
      } catch (err) {
        setError(t("Failed to load report"));
        console.error("Error loading report:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadReport();
  }, [uuid]);


  const handleBack = () => {
    navigate('/reports');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (state: string) => {
    return state === 'new' ? ['warning', 'onWarning'] : ['success', 'onSuccess'];
  };

  const getStatusText = (state: string) => {
    return state === 'new' ? t('Submitted') : t('Processed');
  };

  if (isLoading) {
    return (
      <Box bg="background" minH="100vh" color="onBg">
        <ActionBar
          title={t("Report Details")}
          showBackButton={true}
          onBack={handleBack}
        />
        <Box display="flex" justifyContent="center" alignItems="center" h="50vh">
          <Spinner color="primary" size="xl" />
        </Box>
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box bg="background" minH="100vh" color="onBg">
        <ActionBar
          title={t("Report Details")}
          showBackButton={true}
          onBack={handleBack}
        />
        <Box textAlign="center" p={8}>
          <Text color="error" fontSize="lg" mb={4}>
            {error || t("Report not found")}
          </Text>
          <Button onClick={handleBack} variant="outline">
            {t('Go Back')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="background" minH="100vh" color="onBg">
      <ActionBar
        title={t("Report Details")}
        showBackButton={true}
        onBack={handleBack}
      />

      <VStack gap={6} padding={4} pb={28} align="stretch">
        <Card.Root variant="elevated" bg="surface" borderColor="border">
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between" align="flex-start">
                <VStack align="flex-start" flex={1}>
                  <Text fontSize="sm" color="textSecondary">{t('Report ID')}</Text>
                  <Text fontSize="md" fontWeight="bold" wordBreak="break-all">
                    {report.report_uuid}
                  </Text>
                </VStack>
                <Badge bg={getStatusColor(report.state)[0]} color={getStatusColor(report.state)[1]} size="lg">
                  {getStatusText(report.state)}
                </Badge>
              </HStack>

              <Separator />

              <VStack align="stretch" gap={3}>
                <HStack alignItems={"flex-start"}>
                  <HiCalendar />
                  <VStack align="flex-start" gap={1} mt={'-2px'}>
                    <Text fontSize="sm" fontWeight="bold" color="textSecondary">{t('Submitted')}</Text>
                    <Text fontSize="sm">{formatDate(report.reported_at)}</Text>
                  </VStack>
                </HStack>

                {report.processed_at && (
                  <HStack alignItems={"flex-start"}>
                    <HiCalendar />
                    <VStack align="flex-start" gap={1} mt={'-2px'}>
                      <Text fontSize="sm" fontWeight="bold" color="textSecondary">{t('Processed')}</Text>
                      <Text fontSize="sm">{formatDate(report.processed_at)}</Text>
                    </VStack>
                  </HStack>
                )}

                {report.description && (
                  <HStack alignItems={"flex-start"}>
                    <HiChatBubbleLeftEllipsis />
                    <VStack align="flex-start" gap={1} mt={'-2px'}>
                      <Text fontSize="sm" fontWeight="bold" color="textSecondary">{t('Description')}</Text>
                      <Text fontSize="sm">
                        {report.description}
                      </Text>
                    </VStack>
                  </HStack>
                )}

                
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="elevated" bg="surface" borderColor="border">
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <HStack>
                <HiLocationMarker />
                <Text fontSize="md" fontWeight="bold">{t('Location')}</Text>
              </HStack>
              <VStack align="flex-start" gap={1}>
                <Text fontSize="sm"><b>{t('Address')}:</b> {report.address}</Text>
                <Box w="full" h="40vh"><StaticLocationMap position={report.location} /></Box>
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="elevated" bg="surface" borderColor="border">
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <HStack>
                <HiPhotograph />
                <Text fontSize="md" fontWeight="bold">{t('Report Image')}</Text>
              </HStack>
              <ImageFrame 
                imageSrc={report.image_url} 
                imageAlt={t('"Report Image"')} 
                maxHeight="40vh"
                boundingBoxes={report.objects ? report.objects.map(obj => ({
                  x1: obj.x1,
                  y1: obj.y1,
                  x2: obj.x2,
                  y2: obj.y2,
                  label: t(obj.tag),
                  color: obj.tag === 'DAMAGED' ? 'red' : 'green'
                })) : []}
              />
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}
