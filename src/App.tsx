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

    // --- ENVÍO A GOOGLE SHEETS ---
    const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
    if (googleSheetsUrl) {
      const payload = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        course: userData.course,
        groupName: userData.group,
        age: userData.age,
        routeName: selectedRoute.name,
        score: score.toFixed(1),
        totalTime: formatTime(totalTime),
        borgScale,
        correctCount
      };

      fetch(googleSheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).catch(err => console.error("Error Sheets:", err));
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

    const addFooter = (pageNum: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("IES Lucía de Medrano - Departamento de E.F.", pdfWidth / 2, pdfHeight - 10, { align: 'center' });
      pdf.text(`Página ${pageNum} de ${totalPages}`, pdfWidth - 20, pdfHeight - 10);
    };

    const page1Element = document.getElementById('pdf-section-data');
    if (page1Element) {
      const canvas1 = await html2canvas(page1Element, { scale: 2, useCORS: true });
      const imgData1 = canvas1.toDataURL('image/png');
      const displayWidth1 = pdfWidth - (margin * 2);
      const displayHeight1 = (canvas1.height * displayWidth1) / canvas1.width;
      pdf.addImage(imgData1, 'PNG', margin, margin, displayWidth1, displayHeight1);
    }

    pdf.addPage();
    const page2Element = document.getElementById('pdf-section-map');
    if (page2Element) {
      const canvas2 = await html2canvas(page2Element, { scale: 2, useCORS: true });
      const imgData2 = canvas2.toDataURL('image/png');
      const displayWidth2 = pdfWidth - (margin * 2);
      const displayHeight2 = (canvas2.height * displayWidth2) / canvas2.width;
      const yPos = (pdfHeight - displayHeight2) / 2;
      pdf.addImage(imgData2, 'PNG', margin, yPos, displayWidth2, displayHeight2);
    }

    addFooter(1, 2);
    pdf.setPage(1); addFooter(1, 2);
    pdf.setPage(2); addFooter(2, 2);
    pdf.save(`Resultado_${userData.firstName}.pdf`);
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
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-stone-800 leading-tight">Recorridos de Orientación</h2>
                  <p className="text-sm font-bold text-emerald-700">IES Lucía de Medrano</p>
                </div>
                <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white aspect-[16/9]">
                  <img src="https://raw.githubusercontent.com/josecarlostejedor/orientacion-huerta-otea/main/recorridoorienta.jpg" alt="Orientación" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="text-left pt-2">
                  <h3 className="text-lg font-bold text-stone-800">Datos del Corredor</h3>
                </div>
              </div>

              <div className="space-y-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <input type="text" placeholder="Nombre" className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none" value={userData.firstName} onChange={(e) => setUserData({ ...userData, firstName: e.target.value })} />
                <input type="text" placeholder="Apellidos" className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none" value={userData.lastName} onChange={(e) => setUserData({ ...userData, lastName: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Edad" className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none" value={userData.age} onChange={(e) => setUserData({ ...userData, age: e.target.value })} />
                  <select className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white" value={userData.group} onChange={(e) => setUserData({ ...userData, group: e.target.value })}>
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <select className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white" value={userData.course} onChange={(e) => setUserData({ ...userData, course: e.target.value })}>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button disabled={!userData.firstName || !userData.lastName} onClick={() => setStep('ROUTE_SELECT')} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 'ROUTE_SELECT' && (
            <motion.div key="route-select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('FORM')} className="p-2 hover:bg-stone-200 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                <h2 className="text-2xl font-bold text-stone-800">Selecciona Recorrido</h2>
              </div>
              <div className="grid gap-4">
                {ROUTES.map((route) => (
                  <button key={route.id} onClick={() => setSelectedRoute(route)} className={cn("p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between", selectedRoute?.id === route.id ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white")}>
                    <div><h3 className="font-bold text-lg">{route.name}</h3><p className="text-stone-500 text-sm">6 Balizas</p></div>
                    {selectedRoute?.id === route.id ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <ChevronRight className="w-6 h-6 text-stone-300" />}
                  </button>
                ))}
              </div>
              {selectedRoute && <button onClick={handleStartRace} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"><Play className="w-5 h-5 fill-current" /> Comenzar Carrera</button>}
            </motion.div>
          )}

          {step === 'RACE' && selectedRoute && (
            <motion.div key="race" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-stone-200 rounded-2xl overflow-hidden border border-stone-300 h-[50vh] relative">
                <TransformWrapper initialScale={1} minScale={0.5} maxScale={4} centerOnInit={true}>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <img src={selectedRoute.mapUrl} alt="Mapa" className="w-full h-full object-contain bg-white" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                  </TransformComponent>
                </TransformWrapper>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-600">Baliza {currentBalizaIndex + 1} de 6</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" autoFocus className="flex-1 px-4 py-4 rounded-xl border-2 border-stone-200 focus:border-emerald-500 outline-none text-2xl font-bold text-center" placeholder="---" value={enteredCodes[currentBalizaIndex]} onChange={(e) => { const newCodes = [...enteredCodes]; newCodes[currentBalizaIndex] = e.target.value; setEnteredCodes(newCodes); }} />
                  {currentBalizaIndex < 5 ? (
                    <button onClick={() => handleBalizaSubmit(enteredCodes[currentBalizaIndex])} disabled={!enteredCodes[currentBalizaIndex]} className="bg-emerald-600 disabled:bg-stone-200 text-white px-6 rounded-xl font-bold">Sig.</button>
                  ) : (
                    <button onClick={handleFinishRace} disabled={!enteredCodes[currentBalizaIndex]} className="bg-red-600 disabled:bg-stone-200 text-white px-6 rounded-xl font-bold">Fin</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'BORG' && (
            <motion.div key="borg" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 py-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-stone-800">Escala de Borg</h2>
                <p className="text-stone-500">¿Nivel de fatiga percibida?</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
                <input type="range" min="1" max="10" step="1" className="w-full h-3 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={borgScale} onChange={(e) => setBorgScale(parseInt(e.target.value))} />
                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                  <span className="text-emerald-800 font-bold text-lg">Nivel {borgScale}</span>
                </div>
              </div>
              <button onClick={calculateResults} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg">Ver Resultados</button>
            </motion.div>
          )}

          {step === 'RESULTS' && raceResult && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center space-y-4">
                <h2 className="text-stone-500 font-bold uppercase text-xs">Puntuación</h2>
                <div className="text-6xl font-black text-emerald-600">{raceResult.score.toFixed(1)}<span className="text-2xl text-stone-300">/10</span></div>
                <div className="flex justify-center gap-8 pt-4 border-t border-stone-100">
                  <div><p className="text-xs font-bold text-stone-400">TIEMPO</p><p className="font-bold">{formatTime(raceResult.totalTime)}</p></div>
                  <div><p className="text-xs font-bold text-stone-400">ACIERTOS</p><p className="font-bold">{raceResult.results.filter(r => r.isCorrect).length}/6</p></div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={generatePDF} className="flex-1 bg-stone-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"><FileText className="w-5 h-5" /> PDF</button>
                <button onClick={() => window.location.reload()} className="bg-stone-100 text-stone-600 font-bold px-6 rounded-2xl">Reiniciar</button>
              </div>

              {import.meta.env.VITE_GOOGLE_SHEETS_VIEW_URL && (
                <div className="pt-4 flex justify-center">
                  <a href={import.meta.env.VITE_GOOGLE_SHEETS_VIEW_URL} target="_blank" rel="noopener noreferrer" className="text-[10px] text-stone-300 hover:text-stone-500 uppercase font-bold flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Ver Registro en Google Sheets
                  </a>
                </div>
              )}

              {/* Hidden PDF content */}
              <div className="fixed left-[-9999px] top-0">
                <div ref={reportRef} className="w-[800px] bg-white text-stone-900 p-12">
                  <div id="pdf-section-data" className="space-y-8">
                    <h1 className="text-3xl font-black">Resultado Orientación</h1>
                    <div className="grid grid-cols-2 gap-8">
                      <div><p className="text-xs font-bold text-stone-400">CORREDOR</p><p className="text-xl font-bold">{raceResult.userData.firstName} {raceResult.userData.lastName}</p></div>
                      <div><p className="text-xs font-bold text-stone-400">RECORRIDO</p><p className="text-xl font-bold">{raceResult.routeName}</p></div>
                      <div><p className="text-xs font-bold text-stone-400">PUNTUACIÓN</p><p className="text-3xl font-bold text-emerald-600">{raceResult.score.toFixed(1)}/10</p></div>
                      <div><p className="text-xs font-bold text-stone-400">TIEMPO</p><p className="text-xl font-bold">{formatTime(raceResult.totalTime)}</p></div>
                    </div>
                  </div>
                  <div id="pdf-section-map" className="mt-12">
                    <img src={selectedRoute.mapUrl} alt="Mapa" className="w-full h-auto border-2 border-stone-200 rounded-xl" crossOrigin="anonymous" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
