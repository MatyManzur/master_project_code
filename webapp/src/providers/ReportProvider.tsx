import { createContext, useContext, useState, useEffect } from 'react';
import { getReportsByUuid, type Report } from '../services/ReportService';

interface ReportContextType {
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  reportUuid: string | null;
  setReportUuid: (uuid: string | null) => void;
  addReportUuid: (uuid: string) => void;
  getReports: () => Report[];
  refreshReports: () => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

const STORAGE_KEY = 'report_uuids';

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [reportUuid, setReportUuid] = useState<string | null>(null);
  const [reportUuids, setReportUuids] = useState<string[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const loadReportsFromStorage = () => {
    const storedUuids = localStorage.getItem(STORAGE_KEY);
    if (storedUuids) {
      try {
        const uuids = JSON.parse(storedUuids);
        if (Array.isArray(uuids)) {
          setReportUuids(uuids);
        }
      } catch (error) {
        console.error('Failed to parse stored UUIDs:', error);
      }
    }
  }

  useEffect(() => {
    loadReportsFromStorage();
  }, []);

  const addReportUuid = async (uuid: string) => {
    return new Promise<void>((resolve) => {
      setReportUuids(prevUuids => {
        if (prevUuids.includes(uuid)) {
          resolve();
          return prevUuids;
        }
        const newUuids = [uuid, ...prevUuids];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUuids));
        
        setTimeout(async () => {
          await refreshReports();
          resolve();
        }, 0);

        return newUuids;
      });
    });
  };

  const getReports = () => {
    return reports;
  };

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
      refreshReports 
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