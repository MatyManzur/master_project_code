import { useState, useEffect } from "react";
import { Box, VStack, Input, Spinner, Text, HStack, IconButton } from "@chakra-ui/react";
import { HiX, HiPlus } from "react-icons/hi";
import ActionBar from "../components/ActionBar";
import { ReportCard } from "../components/ReportCard";
import { useReport } from "../providers/ReportProvider";
import ReactPullToRefresh from 'react-pull-to-refresh';

export function MyReports() {
    const { getReports, refreshReports, addReportUuid } = useReport();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchUuid, setSearchUuid] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    let reports = getReports();

    useEffect(() => {
        const loadReports = async () => {
            await refreshReports();
            setIsLoading(false);
        };
        reports = getReports();
        if (reports.length === 0) {
            loadReports();
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshReports();
        setIsRefreshing(false);
    };

    const handleAddUuid = async (uuid: string) => {
        if (uuid.trim()) {
            setIsLoading(true);
            console.log('Adding UUID:', uuid);
            await addReportUuid(uuid.trim());
            console.log('UUID added successfully');
            setIsLoading(false);
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

            <ReactPullToRefresh 
                onRefresh={handleRefresh}
            >
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

                    <Box id="report-list">
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
            </ReactPullToRefresh>
        </Box>
    );
}