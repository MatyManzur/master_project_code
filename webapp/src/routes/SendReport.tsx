import { Box } from "@chakra-ui/react";
import ActionBar from "../components/ActionBar";
import { ImageFrame } from "../components/ImageFrame";
import { useReport } from "../providers/ReportProvider";

export function SendReport() {
  const { capturedImage } = useReport();

  if (!capturedImage) {
    return <div>No image to send</div>;
  }

  function onBack() {
    window.history.back();
  }

  return (
    <>
      <ActionBar
        title="Send Report"
        showBackButton={true}
        onBack={onBack}
      ></ActionBar>{/* i18n */}
      <Box w='full' alignContent={'center'} justifyContent={'center'} display={'flex'} mt={20}>
        <ImageFrame
          imageSrc={capturedImage}
          imageAlt="Captured damage"
        />
      </Box>
    </>
  );
}