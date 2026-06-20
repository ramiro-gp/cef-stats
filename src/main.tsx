import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { APP_NAME } from './config/appBrand'

document.title = APP_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
)
