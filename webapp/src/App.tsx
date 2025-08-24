import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Box, Text } from '@chakra-ui/react'
import { Home } from './routes/Home'
import { BottomNav } from './components/BottomNav'
import { SendReport } from './routes/SendReport'

function App() {

  return (
    <>
      <Box>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/send-report" element={<SendReport />} />
          <Route path="*" element={<Text>404 Not Found</Text>} />
          </Routes>
      </Box>
      <BottomNav />
    </>
  )
}

export default App
