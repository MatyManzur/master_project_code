import React from 'react'
import { ChakraProvider, defaultConfig, createSystem, defineConfig } from '@chakra-ui/react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ColorModeProvider } from './components/ui/color-mode.tsx'
import { ReportProvider } from './providers/ReportProvider.tsx'

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        background: {
          value: { base: '#FFFFFF', _dark: '#110808ff' },
        },
        onBackground: {
          value: { base: '#111827', _dark: '#F9FAFB' },
        },
        surface: {
          value: { base: '#fbf9f9ff', _dark: '#371f1fff' },
        },
        onSurface: {
          value: { base: '#111827', _dark: '#F9FAFB' },
        },
        text: {
          value: { base: '#111827', _dark: '#F9FAFB' },
        },
        textSecondary: {
          value: { base: '#6B7280', _dark: '#D1D5DB' },
        },
        border: {
          value: { base: '#E5E7EB', _dark: '#4b2823ff' },
        },
        primary: {
          value: { base: '#AE1409', _dark: '#F44336' },
        },
        onPrimary: {
          value: { base: '#FFFFFF', _dark: '#212121' },
        },
        secondary: {
          value: { base: '#FFC107', _dark: '#FFC107' },
        },
        onSecondary: {
          value: { base: '#111827', _dark: '#111827' },
        },
        success: {
          value: { base: '#16A34A', _dark: '#22C55E' },
        },
        onSuccess: {
          value: { base: '#FFFFFF', _dark: '#212121' },
        },
        warning: {
          value: { base: '#c26a06ff', _dark: '#F59E0B' },
        },
        onWarning: {
          value: { base: '#FFFFFF', _dark: '#212121' },
        },
        error: {
          value: { base: '#DC2626', _dark: '#EF4444' },
        },
        onError: {
          value: { base: '#FFFFFF', _dark: '#FFFFFF' },
        },
        info: {
          value: { base: '#0284C7', _dark: '#38BDF8' },
        },
        overlay: {
          value: { base: 'rgba(0,0,0,0.3)', _dark: 'rgba(0,0,0,0.6)' },
        },
        disabled: {
          value: { base: '#D1D5DB', _dark: '#6B7280' },
        },
        focus: {
          value: { base: '#FFCDD2', _dark: '#66362fff' },
        },
        onFocus: {
          value: { base: '#212121', _dark: '#ffffffff' },
        }
      }
    },
  },
});
export const system = createSystem(defaultConfig, config);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <ReportProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ReportProvider>
      </ColorModeProvider>
    </ChakraProvider>
  </React.StrictMode>,
)
