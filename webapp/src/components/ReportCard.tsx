import { Card, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ImageFrame } from "./ImageFrame";
import { useTranslation } from "react-i18next";

interface ReportCardProps {
    uuid: string;
    image_url: string;
    address: string;
    submitted_at: Date;
    status: 'submitted' | 'processed';
}

export function ReportCard(
    props: ReportCardProps
) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/reports/${props.uuid}`);
    };

    const { t } = useTranslation();

    return (
        <>
            <Card.Root 
                variant='elevated' 
                size='sm' 
                bg="surface" 
                borderColor="border" 
                color="onSurface"
                cursor="pointer"
                _hover={{ bg: "focus", color: "onFocus" }}
                onClick={handleClick}
            >
                <Card.Body w="full" h="full">
                    <HStack maxH="15vh" justifyContent={"space-between"} w="full" alignItems="flex-start">
                        <VStack maxW={"50%"} alignItems="flex-start">
                            <Text fontSize={"md"} fontWeight={"bold"}>{props.uuid}</Text>
                            <Text fontSize={"sm"}>{t('Submitted')}: {props.submitted_at.toLocaleString()}</Text>
                            <HStack>
                                <Text fontSize={"md"} fontWeight="bold">
                                    {t('Status')}:
                                </Text>
                                <Text fontSize={"md"} fontWeight="bold" color={props.status === 'submitted' ? 'warning' : 'success'}>
                                    {props.status === 'submitted' ? t('Submitted') : t('Processed')}
                                </Text>
                            </HStack>
                        </VStack>
                        <VStack maxW={"50%"} maxH="100%" alignItems="flex-end">
                            <ImageFrame imageSrc={props.image_url} imageAlt="Report Image" maxHeight="15vh"/>
                        </VStack>
                        
                    </HStack>
                    <VStack maxW={"100%"} alignItems="flex-start" mt={2}>
                        <Text fontSize={"sm"}>{t('Location')}: {props.address ?? ""}</Text>                       
                    </VStack>
                </Card.Body>
            </Card.Root>
        </>
    );
}