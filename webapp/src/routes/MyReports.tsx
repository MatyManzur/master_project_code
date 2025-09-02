import { useState, useEffect } from "react";
import { Box, VStack, Input, Spinner, Text, HStack, IconButton } from "@chakra-ui/react";
import { HiX, HiPlus } from "react-icons/hi";
import ActionBar from "../components/ActionBar";
import { ReportCard } from "../components/ReportCard";
import { useReport } from "../providers/ReportProvider";
import { config } from "../config/environment";

export function MyReports() {
    const { getReports, refreshReports, addReportUuid } = useReport();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchUuid, setSearchUuid] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const reports = getReports();

    useEffect(() => {
        const loadReports = async () => {
            await refreshReports();
            setIsLoading(false);
        };
        loadReports();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshReports();
        setIsRefreshing(false);
    };

    const handleAddUuid = async (uuid: string) => {
        if (uuid.trim()) {
            addReportUuid(uuid.trim());
            setSearchUuid("");
        }
    };

    const handleClearInput = () => {
        setSearchUuid("");
    };

    return (
        <Box bg="background" minH="100vh" color="onBg">
            <ActionBar
                title="My Reports" // i18n
                showBackButton={false}
            />

            <VStack gap={4} padding={4} pb={28} align="stretch">
                <HStack gap={2}>
                    <Box position="relative" flex={1}>
                        <Input
                            placeholder="Enter report UUID to add..." // i18n
                            value={searchUuid}
                            onChange={(e) => setSearchUuid(e.target.value)}
                            bg="surface"
                            borderColor="border"
                            color="onSurface"
                            _placeholder={{ color: "textSecondary" }}
                            _focus={{ borderColor: "primary", boxShadow: "0 0 0 1px var(--chakra-colors-primary)" }}
                            pr={searchUuid ? "40px" : "12px"}
                        />
                        {searchUuid && (
                            <IconButton
                                onClick={handleClearInput}
                                position="absolute"
                                right="8px"
                                top="50%"
                                transform="translateY(-50%)"
                                size="sm"
                                variant="ghost"
                                color="textSecondary"
                                _hover={{ color: "onSurface" }}
                                aria-label="Clear input"
                            >
                                <HiX />
                            </IconButton>
                        )}
                    </Box>
                    <IconButton
                        onClick={() => handleAddUuid(searchUuid)}
                        disabled={!searchUuid.trim()}
                        bg="primary"
                        color="onPrimary"
                        _hover={{ opacity: 0.8 }}
                        _disabled={{ 
                            bg: "disabled", 
                            color: "textSecondary",
                            cursor: "not-allowed"
                        }}
                        aria-label="Add report"
                    >
                        <HiPlus />
                    </IconButton>
                </HStack>

                <Box
                    overflowY="auto"
                    onTouchStart={(e) => {
                        const startY = e.touches[0].clientY;
                        const scrollTop = e.currentTarget.scrollTop;
                        
                        if (scrollTop === 0) {
                            const handleTouchMove = (moveEvent: TouchEvent) => {
                                const currentY = moveEvent.touches[0].clientY;
                                const pullDistance = currentY - startY;
                                
                                if (pullDistance > 100) {
                                    handleRefresh();
                                    e.currentTarget.removeEventListener('touchmove', handleTouchMove);
                                }
                            };
                            
                            e.currentTarget.addEventListener('touchmove', handleTouchMove, { once: true });
                        }
                    }}
                >
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" p={8}>
                            <Spinner color="primary" size="lg" />
                        </Box>
                    ) : isRefreshing ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <Spinner color="primary" size="md" />
                        </Box>
                    ) : reports.length === 0 ? (
                        <Box textAlign="center" p={8}>
                            <Text color="textSecondary" fontSize="lg">
                                No reports found {/* i18n */}
                            </Text>
                            <Text color="textSecondary" fontSize="sm" mt={2}>
                                Add a report UUID above to get started {/* i18n */}
                            </Text>
                        </Box>
                    ) : (
                        <VStack gap={3} align="stretch">
                            {reports.map((report) => (
                                <ReportCard
                                    key={report.report_uuid}
                                    uuid={report.report_uuid}
                                    image_url={report.image_url}
                                    address={report.address}
                                    submitted_at={new Date(report.reported_at)}
                                    status={report.state === 'new' ? 'submitted' : 'processed'}
                                />
                            ))}
                        </VStack>
                    )}
                </Box>
            </VStack>
        </Box>
    );
}