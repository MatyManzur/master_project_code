import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { Box, Text } from '@chakra-ui/react'
import { Home } from './routes/Home'
import { BottomNav } from './components/BottomNav'
import { SendReport } from './routes/SendReport'
import { ReportSuccess } from './routes/ReportSuccess'

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
          <Route path="*" element={<Text>404 Not Found</Text>} />
          </Routes>
      </Box>
      {!hideBottomNav && <BottomNav />}
    </>
  )
}

export default App
