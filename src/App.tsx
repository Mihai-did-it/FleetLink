import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ActionLogger } from "@/components/dashboard/ActionLogger";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import { useState } from 'react'
import './App.css'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', 
      color: 'white',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
        FleetLink Dashboard
      </h1>
      <div style={{ 
        textAlign: 'center', 
        backgroundColor: '#1e293b', 
        padding: '2rem', 
        borderRadius: '10px',
        border: '1px solid #334155'
      }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          ✅ Frontend is working!
        </p>
        <p style={{ color: '#94a3b8' }}>
          If you can see this, the app is loading correctly.
        </p>
      </div>
    </div>
  )
}

export default App

export default App;
