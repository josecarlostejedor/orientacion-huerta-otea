/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, 
  Map as MapIcon, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Flag, 
  FileText, 
  User,
  Activity
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { ROUTES, COURSES, GROUPS, Route } from './constants';
import { UserData, RaceResult, BalizaResult } from './types';
import { cn, normalizeString } from './lib/utils';

type AppStep = 'FORM' | 'ROUTE_SELECT' | 'RACE' | 'BORG' | 'RESULTS';

export default function App() {
  const [step, setStep] = useState<AppStep>('FORM');
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    age: '',
    course: COURSES[0],
    group: GROUPS[0],
  });
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentBalizaIndex, setCurrentBalizaIndex] = useState(0);
  const [enteredCodes, setEnteredCodes] = useState<string[]>(Array(6).fill(''));
  const [borgScale, setBorgScale] = useState<number>(5);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Timer logic
  useEffect(() => {
    if (startTime && step === 'RACE') {
      timerRef.current = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, step]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  };

  const handleStartRace = () => {
    setStartTime(Date.now());
    setStep('RACE');
  };

  const handleBalizaSubmit = (code: string) => {
    const newCodes = [...enteredCodes];
    newCodes[currentBalizaIndex] = code;
    setEnteredCodes(newCodes);

    if (currentBalizaIndex < 5) {
      setCurrentBalizaIndex(currentBalizaIndex + 1);
    }
  };

  const handleFinishRace = () => {
    setStep('BORG');
  };

  const calculateResults = () => {
    if (!selectedRoute) return;

    const endTime = Date.now();
    const totalTime = endTime - (startTime || 0);
    
    const results: BalizaResult[] = selectedRoute.balizas.map((b, idx) => ({
      balizaId: b.id,
      enteredCode: enteredCodes[idx],
      isCorrect: normalizeString(enteredCodes[idx]) === normalizeString(b.correctCode),
      correctCode: b.correctCode,
      description: b.description,
    }));

    const correctCount = results.filter(r => r.isCorrect).length;
    const score = (correctCount / 6) * 10;

    const finalResult: RaceResult = {
      userData,
      routeId: selectedRoute.id,
      routeName: selectedRoute.name,
      startTime: startTime || 0,
      endTime,
      totalTime,
      results,
      score,
      borgScale,
      date: new Date().toLocaleString(),
    };

    // Save to registry
    try {
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          course: userData.course,
          groupName: userData.group,
          age: userData.age,
          routeName: selectedRoute.name,
          score,
          totalTime,
          borgScale,
          correctCount: results.filter(r => r.isCorrect).length,
          date: finalResult.date
        })
      });
    } catch (e) {
      console.error(e);
    }

    setRaceResult(finalResult);
    setStep('RESULTS');
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const footerText = "Aplicación creada para el Departamento de Educación Física del IES Lucía de Medrano";

    const addFooter = (pageNum: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(footerText, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
      pdf.text(`Página ${pageNum} de ${totalPages}`, pdfWidth - 20, pdfHeight - 10);
    };

    // Capture Page 1: Data and Results
    const page1Element = document.getElementById('pdf-section-data');
    if (page1Element) {
      const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true });
      const imgData1 = canvas1.toDataURL('image/png');
      const imgProps1 = pdf.getImageProperties(imgData1);
      const displayWidth1 = pdfWidth - (margin * 2);
      const displayHeight1 = (imgProps1.height * displayWidth1) / imgProps1.width;
      pdf.addImage(imgData1, 'PNG', margin, margin, displayWidth1, displayHeight1);
    }

    // Add Page 2: Map
    pdf.addPage();
    const page2Element = document.getElementById('pdf-section-map');
    if (page2Element) {
      const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
      const imgData2 = canvas2.toDataURL('image/png');
      const imgProps2 = pdf.getImageProperties(imgData2);
      const displayWidth2 = pdfWidth - (margin * 2);
      const displayHeight2 = (imgProps2.height * displayWidth2) / imgProps2.width;
      
      // Center map vertically if it fits
      const yPos = displayHeight2 < (pdfHeight - 40) ? (pdfHeight - displayHeight2) / 2 - 10 : margin;
      pdf.addImage(imgData2, 'PNG', margin, yPos, displayWidth2, displayHeight2);
    }

    // Add footers to all pages
    const totalPages = 2;
    pdf.setPage(1);
    addFooter(1, totalPages);
    pdf.setPage(2);
    addFooter(2, totalPages);

    pdf.save(`${userData.firstName}_${userData.lastName}.pdf`);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-100">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Huerta Otea</h1>
        </div>
        {step === 'RACE' && (
          <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full font-mono text-sm font-bold text-emerald-700 border border-stone-200">
            <Timer className="w-4 h-4" />
            {formatTime(currentTime)}
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {step === 'FORM' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-stone-800 leading-tight">
                    Recorridos del Orientación en Huerta Otea
                  </h2>
                  <p className="text-sm font-bold text-emerald-700">
                    Departamento de E.F. IES Lucía de Medrano
                  </p>
                  <p className="text-[10px] text-stone-400 italic">
                    (App creada por Jose Carlos Tejedor)
                  </p>
                </div>

                <div className="rounded-3xl overflow-hidden shadow-xl shadow-emerald-100 border-4 border-white aspect-[16/9]">
                  <img 
                    src="https://raw.githubusercontent.com/josecarlostejedor/orientacion-huerta-otea/main/recorridoorienta.jpg" 
                    alt="Orientación Huerta Otea" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-900 font-medium text-sm">
                    ¡Bienvenidos a nuestra práctica de orientación en entorno cercano!
                  </p>
                </div>

                <div className="text-left pt-2">
                  <h3 className="text-lg font-bold text-stone-800">Datos del Corredor</h3>
                  <p className="text-stone-500 text-xs">Completa los campos para empezar.</p>
                </div>
              </div>

              <div className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Nombre</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Tu nombre"
                    value={userData.firstName}
                    onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Apellidos</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Tus apellidos"
                    value={userData.lastName}
                    onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Edad</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Ej. 14"
                      value={userData.age}
                      onChange={(e) => setUserData({ ...userData, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Grupo</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white"
                      value={userData.group}
                      onChange={(e) => setUserData({ ...userData, group: e.target.value })}
                    >
                      {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Curso</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white"
                    value={userData.course}
                    onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                  >
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button
                disabled={!userData.firstName || !userData.lastName}
                onClick={() => setStep('ROUTE_SELECT')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
              >
                Continuar
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 'ROUTE_SELECT' && (
            <motion.div
              key="route-select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep('FORM')} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-stone-800">Selecciona Recorrido</h2>
              </div>

              <div className="grid gap-4">
                {ROUTES.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                      selectedRoute?.id === route.id 
                        ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100" 
                        : "border-stone-200 bg-white hover:border-stone-300"
                    )}
                  >
                    <div>
                      <h3 className="font-bold text-lg">{route.name}</h3>
                      <p className="text-stone-500 text-sm">6 Balizas • Huerta Otea</p>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      selectedRoute?.id === route.id ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"
                    )}>
                      {selectedRoute?.id === route.id ? <CheckCircle2 className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                    </div>
                  </button>
                ))}
              </div>

              {selectedRoute && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4"
                >
                  <button
                    onClick={handleStartRace}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Comenzar Carrera
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'RACE' && selectedRoute && (
            <motion.div
              key="race"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Map Container */}
              <div className="bg-stone-200 rounded-2xl overflow-hidden border border-stone-300 shadow-inner h-[50vh] relative">
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={4}
                  centerOnInit={true}
                >
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <img 
                      src={selectedRoute.mapUrl} 
                      alt="Mapa de orientación" 
                      className="w-full h-full object-contain bg-white"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </TransformComponent>
                </TransformWrapper>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-stone-300 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Zoom Táctil Habilitado
                </div>
              </div>

              {/* Baliza Input */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Progreso</span>
                  <span className="text-xs font-bold text-stone-400">{currentBalizaIndex + 1} de 6</span>
                </div>
                <div className="flex gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all",
                        i < currentBalizaIndex ? "bg-emerald-500" : i === currentBalizaIndex ? "bg-emerald-200 animate-pulse" : "bg-stone-100"
                      )}
                    />
                  ))}
                </div>

                <div className="pt-2">
                  <h3 className="text-xl font-bold text-stone-800 mb-1">Baliza {currentBalizaIndex + 1}</h3>
                  <p className="text-stone-500 text-sm mb-4">Ingresa el código que encuentres en el terreno.</p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      className="flex-1 px-4 py-4 rounded-xl border-2 border-stone-200 focus:border-emerald-500 outline-none text-2xl font-bold text-center tracking-widest"
                      placeholder="---"
                      value={enteredCodes[currentBalizaIndex]}
                      onChange={(e) => {
                        const newCodes = [...enteredCodes];
                        newCodes[currentBalizaIndex] = e.target.value;
                        setEnteredCodes(newCodes);
                      }}
                    />
                    {currentBalizaIndex < 5 ? (
                      <button
                        onClick={() => handleBalizaSubmit(enteredCodes[currentBalizaIndex])}
                        disabled={!enteredCodes[currentBalizaIndex]}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 text-white px-6 rounded-xl font-bold transition-all"
                      >
                        Siguiente
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishRace}
                        disabled={!enteredCodes[currentBalizaIndex]}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-stone-200 text-white px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                      >
                        <Flag className="w-5 h-5" />
                        Finalizar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-2">
                <button 
                  onClick={() => setCurrentBalizaIndex(Math.max(0, currentBalizaIndex - 1))}
                  className="text-stone-400 text-sm font-bold flex items-center gap-1 hover:text-stone-600"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                {enteredCodes[currentBalizaIndex] && currentBalizaIndex < 5 && (
                   <button 
                   onClick={() => setCurrentBalizaIndex(Math.min(5, currentBalizaIndex + 1))}
                   className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:text-emerald-700"
                 >
                   Siguiente <ChevronRight className="w-4 h-4" />
                 </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'BORG' && (
            <motion.div
              key="borg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 py-4"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Escala de Borg</h2>
                <p className="text-stone-500">¿Cuál fue tu nivel de fatiga percibida durante la carrera?</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
                <div className="flex justify-between text-xs font-bold text-stone-400 uppercase tracking-widest">
                  <span>Muy Suave</span>
                  <span>Máximo</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  className="w-full h-3 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  value={borgScale}
                  onChange={(e) => setBorgScale(parseInt(e.target.value))}
                />
                <div className="flex justify-between items-end">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-1 h-3 rounded-full transition-all",
                        i + 1 <= borgScale ? "bg-emerald-500" : "bg-stone-200"
                      )} />
                      <span className={cn(
                        "text-sm font-bold",
                        i + 1 === borgScale ? "text-emerald-600 scale-125" : "text-stone-300"
                      )}>{i + 1}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-emerald-800 font-bold text-lg">
                    {borgScale === 1 && "Reposo total"}
                    {borgScale === 2 && "Muy suave"}
                    {borgScale === 3 && "Suave"}
                    {borgScale === 4 && "Moderado"}
                    {borgScale === 5 && "Algo duro"}
                    {borgScale === 6 && "Duro"}
                    {borgScale === 7 && "Muy duro"}
                    {borgScale === 8 && "Extenuante"}
                    {borgScale === 9 && "Casi máximo"}
                    {borgScale === 10 && "Esfuerzo máximo"}
                  </span>
                </div>
              </div>

              <button
                onClick={calculateResults}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all"
              >
                Ver Resultados
              </button>
            </motion.div>
          )}

          {step === 'RESULTS' && raceResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                <h2 className="text-stone-500 font-bold uppercase tracking-widest text-xs">Puntuación Final</h2>
                <div className="text-6xl font-black text-emerald-600 tabular-nums">
                  {raceResult.score.toFixed(1)}
                  <span className="text-2xl text-stone-300 font-normal">/10</span>
                </div>
                <div className="flex justify-center gap-8 pt-4 border-t border-stone-100">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Tiempo</p>
                    <p className="text-lg font-bold text-stone-800">{formatTime(raceResult.totalTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Aciertos</p>
                    <p className="text-lg font-bold text-stone-800">{raceResult.results.filter(r => r.isCorrect).length} / 6</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-stone-800 px-1">Detalle de Balizas</h3>
                <div className="grid gap-2">
                  {raceResult.results.map((res, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          res.isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-stone-800 text-sm">{res.description}</p>
                          <p className="text-xs text-stone-400">Código: <span className="font-mono">{res.enteredCode || '---'}</span></p>
                        </div>
                      </div>
                      {res.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={generatePDF}
                  className="flex-1 bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Descargar PDF
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold px-6 rounded-2xl transition-all"
                >
                  Reiniciar
                </button>
              </div>

              {/* Admin Export Button (Discreet) */}
              <div className="pt-4 flex justify-center">
                <a 
                  href="/api/results/export" 
                  download 
                  className="text-[10px] text-stone-300 hover:text-stone-500 uppercase font-bold tracking-widest transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Descargar Registro Central (Excel)
                </a>
              </div>

              {/* Hidden Report for PDF Generation */}
              <div className="fixed left-[-9999px] top-0">
                <div ref={reportRef} className="w-[800px] bg-white text-stone-900">
                  {/* Section 1: Data and Results */}
                  <div id="pdf-section-data" className="p-12 space-y-10">
                    <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-8">
                      <div>
                        <h1 className="text-2xl font-black text-stone-900 mb-1">
                          Recorridos del Orientación en Huerta Otea
                        </h1>
                        <p className="text-emerald-600 font-bold tracking-widest uppercase text-sm">
                          Departamento de E.F. IES Lucía de Medrano
                        </p>
                        <p className="text-stone-400 text-[10px] italic">
                          (App creada por Jose Carlos Tejedor)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-400 font-bold text-sm uppercase">Fecha de Emisión</p>
                        <p className="font-bold">{raceResult.date}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h2 className="text-xl font-bold border-b border-stone-200 pb-2 flex items-center gap-2">
                          <User className="w-5 h-5 text-emerald-600" /> Datos del Corredor
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Nombre Completo</p>
                            <p className="font-bold text-lg">{raceResult.userData.firstName} {raceResult.userData.lastName}</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Edad</p>
                            <p className="font-bold text-lg">{raceResult.userData.age} años</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Curso</p>
                            <p className="font-bold text-lg">{raceResult.userData.course}</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Grupo</p>
                            <p className="font-bold text-lg">{raceResult.userData.group}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h2 className="text-xl font-bold border-b border-stone-200 pb-2 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-600" /> Resumen de Carrera
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Recorrido</p>
                            <p className="font-bold text-lg">{raceResult.routeName}</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Tiempo Total</p>
                            <p className="font-bold text-lg text-emerald-600">{formatTime(raceResult.totalTime)}</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Puntuación</p>
                            <p className="font-bold text-2xl text-emerald-600">{raceResult.score.toFixed(1)} / 10</p>
                          </div>
                          <div>
                            <p className="text-stone-400 font-bold uppercase text-[10px]">Escala de Borg</p>
                            <p className="font-bold text-lg">{raceResult.borgScale} / 10</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h2 className="text-xl font-bold border-b border-stone-200 pb-2">Desglose de Balizas</h2>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50 text-[10px] font-bold uppercase text-stone-400">
                            <th className="p-4 border-b border-stone-200">#</th>
                            <th className="p-4 border-b border-stone-200">Descripción</th>
                            <th className="p-4 border-b border-stone-200">Código Ingresado</th>
                            <th className="p-4 border-b border-stone-200">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {raceResult.results.map((res, i) => (
                            <tr key={i} className="border-b border-stone-100">
                              <td className="p-4 font-bold">{i + 1}</td>
                              <td className="p-4">{res.description}</td>
                              <td className="p-4 font-mono">{res.enteredCode || '---'}</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                  res.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                  {res.isCorrect ? "Correcto" : "Fallido"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Map (New Page) */}
                  <div id="pdf-section-map" className="p-12 space-y-6">
                    <div className="border-b-2 border-stone-200 pb-4">
                      <h2 className="text-xl font-bold text-stone-800">Mapa del Recorrido: {raceResult.routeName}</h2>
                      <p className="text-stone-400 text-xs uppercase font-bold tracking-widest">Referencia Visual de la Carrera</p>
                    </div>
                    <div className="rounded-2xl overflow-hidden border-2 border-stone-200">
                      <img 
                        src={selectedRoute.mapUrl} 
                        alt="Mapa" 
                        className="w-full h-auto"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation (only for RACE) */}
      {step === 'RACE' && (
        <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 p-4 flex justify-around items-center z-40 shadow-lg">
          <div className="flex flex-col items-center gap-1 text-emerald-600">
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Mapa</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-stone-300">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Perfil</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-stone-300">
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Reporte</span>
          </div>
        </footer>
      )}
    </div>
  );
}
