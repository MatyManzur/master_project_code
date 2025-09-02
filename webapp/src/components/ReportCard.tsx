import { Card, HStack, Text, VStack } from "@chakra-ui/react";
import { ImageFrame } from "./ImageFrame";

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
    return (
        <>
            <Card.Root variant='elevated' size='sm' bg="surface" borderColor="border" color="onSurface">
                <Card.Body w="full" h="full">
                    <HStack maxH="15vh" justifyContent={"space-between"} w="full" alignItems="flex-start">
                        <VStack maxW={"50%"} alignItems="flex-start">
                            <Text fontSize={"md"} fontWeight={"bold"}>{props.uuid}</Text>
                            <Text fontSize={"sm"}>Submitted: {props.submitted_at.toLocaleString()}</Text> {/* i18n */}
                            <HStack>
                                <Text fontSize={"md"} fontWeight="bold">
                                    Status:
                                </Text> {/* i18n */}
                                <Text fontSize={"md"} fontWeight="bold" color={props.status === 'submitted' ? 'warning' : 'success'}>
                                    {props.status === 'submitted' ? 'Submitted' : 'Processed'}
                                </Text>
                            </HStack>
                        </VStack>
                        <VStack maxW={"50%"} maxH="100%" alignItems="flex-end">
                            <ImageFrame imageSrc={props.image_url} imageAlt="Report Image" maxHeight="15vh"/>
                        </VStack>
                        
                    </HStack>
                    <VStack maxW={"100%"} alignItems="flex-start" mt={2}>
                        <Text fontSize={"sm"}>Location: {props.address ?? ""}</Text> {/* i18n */}                        
                    </VStack>
                </Card.Body>
            </Card.Root>
        </>
    );
}