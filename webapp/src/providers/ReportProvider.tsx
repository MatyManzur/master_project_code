import { createContext, useContext, useState } from 'react';

interface ReportContextType {
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  reportUuid: string | null;
  setReportUuid: (uuid: string | null) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [reportUuid, setReportUuid] = useState<string | null>(null);

  return (
    <ReportContext.Provider value={{ capturedImage, setCapturedImage, reportUuid, setReportUuid }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}