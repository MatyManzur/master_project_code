import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { Box } from '@chakra-ui/react'
import { Home } from './routes/Home'
import { BottomNav } from './components/BottomNav'
import { SendReport } from './routes/SendReport'
import { ReportSuccess } from './routes/ReportSuccess'
import { Toaster } from './components/ui/toaster'
import { MyReports } from './routes/MyReports'
import { ReportDetail } from './routes/ReportDetail'
import i18n from 'i18next'
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from './locales/en/common.json'
import esCommon from './locales/es/common.json'
import deCommon from './locales/de/common.json'

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: enCommon
      },
      es: {
        translation: esCommon
      },
      de: {
        translation: deCommon
      }
    },
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['navigator', 'htmlTag']
    }
  });

function App() {
  const location = useLocation()
  const hideBottomNav = location.pathname === '/send-report'

  return (
    <>
      <Box overflowX={'hidden'} width="100vw">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/send-report" element={<SendReport />} />
          <Route path="/report-success" element={<ReportSuccess />} />
          <Route path="/reports" element={<MyReports />} />
          <Route path="/reports/:uuid" element={<ReportDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </Box>
      {!hideBottomNav && <BottomNav />}
      <Toaster />
    </>
  )
}

export default App
