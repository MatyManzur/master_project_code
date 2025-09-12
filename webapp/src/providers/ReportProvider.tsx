import { createContext, useContext, useState } from 'react';
import { getReportsByUuid, type Report } from '../services/ReportService';

interface ReportContextType {
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  reportUuid: string | null;
  setReportUuid: (uuid: string | null) => void;
  addReportUuid: (uuid: string) => void;
  getReports: () => Report[];
  refreshReports: () => Promise<void>;
  getReportByUuid: (uuid: string) => Promise<Report | null>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

const STORAGE_KEY = 'report_uuids';

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [reportUuid, setReportUuid] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const addReportUuid = async (uuid: string) => {
    return new Promise<void>((resolve) => {
      const storedUuids = localStorage.getItem(STORAGE_KEY);
      let uuids: string[] = [];
      
      if (storedUuids) {
        try {
          const parsedUuids = JSON.parse(storedUuids);
          if (Array.isArray(parsedUuids)) {
            uuids = parsedUuids;
          }
        } catch (error) {
          console.error('Failed to parse stored UUIDs:', error);
        }
      }
      if (uuids.includes(uuid)) {
        resolve();
        return uuids;
      }
      const newUuids = [uuid, ...uuids];
      console.log('Updated UUIDs:', newUuids);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUuids));
      
      setTimeout(async () => {
        await refreshReports();
        resolve();
      }, 0);

      return newUuids;
    });
  };

  const getReports = () => {
    return reports;
  };

  const getReportByUuid = async (uuid: string): Promise<Report | null> => {
    const existingReport = reports.find(report => report.report_uuid === uuid);
    if (existingReport) {
      return existingReport;
    }

    try {
      await addReportUuid(uuid);
      const report = await getReportsByUuid([uuid]);
      if (report.length > 0) {
        return report[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch report by UUID:', error);
      return null;
    }
  }

  const refreshReports = async () => {
    const storedUuids = localStorage.getItem(STORAGE_KEY);
    let uuids: string[] = [];
    
    if (storedUuids) {
      try {
        const parsedUuids = JSON.parse(storedUuids);
        if (Array.isArray(parsedUuids)) {
          uuids = parsedUuids;
        }
      } catch (error) {
        console.error('Failed to parse stored UUIDs:', error);
      }
    }
    
    if (uuids.length === 0) {
      setReports([]);
      return;
    }
    
    try {
      const fetchedReports = await getReportsByUuid(uuids);
      setReports(fetchedReports);
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    }
  };

  return (
    <ReportContext.Provider value={{ 
      capturedImage, 
      setCapturedImage, 
      reportUuid, 
      setReportUuid, 
      addReportUuid, 
      getReports, 
      refreshReports,
      getReportByUuid
    }}>
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