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

export function ReportDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { getReportByUuid } = useReport();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!uuid) {
        setError("Report not found"); //i18n
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const fetchedReport = await getReportByUuid(uuid);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          setError("Report not found"); //i18n
        }
      } catch (err) {
        setError("Failed to load report"); //i18n
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
    return state === 'new' ? 'warning' : 'success';
  };

  const getStatusText = (state: string) => {
    return state === 'new' ? 'Submitted' : 'Processed'; //i18n
  };

  if (isLoading) {
    return (
      <Box bg="background" minH="100vh" color="onBg">
        <ActionBar
          title="Report Details" // i18n
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
          title="Report Details" // i18n
          showBackButton={true}
          onBack={handleBack}
        />
        <Box textAlign="center" p={8}>
          <Text color="error" fontSize="lg" mb={4}>
            {error || "Report not found"}{/* i18n */}
          </Text>
          <Button onClick={handleBack} variant="outline">
            Go Back
          </Button> {/* i18n */}
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="background" minH="100vh" color="onBg">
      <ActionBar
        title="Report Details" // i18n
        showBackButton={true}
        onBack={handleBack}
      />

      <VStack gap={6} padding={4} pb={28} align="stretch">
        <Card.Root variant="elevated" bg="surface" borderColor="border">
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between" align="flex-start">
                <VStack align="flex-start" flex={1}>
                  <Text fontSize="sm" color="textSecondary">Report ID</Text>
                  <Text fontSize="md" fontWeight="bold" wordBreak="break-all">
                    {report.report_uuid}
                  </Text>
                </VStack>
                <Badge colorPalette={getStatusColor(report.state)} size="lg">
                  {getStatusText(report.state)}
                </Badge>
              </HStack>

              <Separator />

              <VStack align="stretch" gap={3}>
                <HStack>
                  <HiCalendar />
                  <VStack align="flex-start" gap={1}>
                    <Text fontSize="sm" color="textSecondary">Submitted</Text>
                    <Text fontSize="sm">{formatDate(report.reported_at)}</Text>
                  </VStack>
                </HStack>

                {report.processed_at && (
                  <HStack>
                    <HiCalendar />
                    <VStack align="flex-start" gap={1}>
                      <Text fontSize="sm" color="textSecondary">Processed</Text>
                      <Text fontSize="sm">{formatDate(report.processed_at)}</Text>
                    </VStack>
                  </HStack>
                )}

                <HStack>
                  <HiLocationMarker />
                  <VStack align="flex-start" gap={1}>
                    <Text fontSize="sm" color="textSecondary">Location</Text>
                    <Text fontSize="sm">{report.address}</Text>
                    <Text fontSize="xs" color="textSecondary">
                      {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {report.description && (
          <Card.Root variant="elevated" bg="surface" borderColor="border">
            <Card.Body>
              <VStack align="stretch" gap={2}>
                <Text fontSize="md" fontWeight="bold">Description</Text>
                <Text fontSize="sm" color="textSecondary">
                  {report.description}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        <Card.Root variant="elevated" bg="surface" borderColor="border">
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <HStack>
                <HiPhotograph />
                <Text fontSize="md" fontWeight="bold">Report Image</Text>
              </HStack>
              <ImageFrame 
                imageSrc={report.image_url} 
                imageAlt="Report Image" 
                maxHeight="40vh"
              />
            </VStack>
          </Card.Body>
        </Card.Root>

        {report.objects && report.objects.length > 0 && (
          <Card.Root variant="elevated" bg="surface" borderColor="border">
            <Card.Body>
              <VStack align="stretch" gap={4}>
                <Text fontSize="md" fontWeight="bold">Detected Objects</Text>
                <VStack gap={2} align="stretch">
                  {report.objects.map((obj, index) => (
                    <Box key={index} p={3} bg="background" borderRadius="md">
                      <HStack justify="space-between">
                        <Text fontSize="sm">Object {index + 1}</Text>
                        <Badge 
                          colorPalette={obj.tag === 'DAMAGED' ? 'error' : 'success'}
                          size="sm"
                        >
                          {obj.tag}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="textSecondary" mt={1}>
                        Position: ({obj.x1}, {obj.y1}) to ({obj.x2}, {obj.y2})
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Box>
  );
}
