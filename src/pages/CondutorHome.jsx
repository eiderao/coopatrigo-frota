import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, CheckCircle2, Keyboard, AlertCircle } from 'lucide-react';

export default function CondutorHome() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [resultType, setResultType] = useState('');
  const [cameraError, setCameraError] = useState('');
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualKey, setManualKey] = useState('');

  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setCameraError('');
    setIsManualMode(false);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
            qrbox: (vw, vh) => {
              const size = Math.min(vw, vh);
              return { width: Math.floor(size * 0.8), height: Math.floor(size * 0.8) };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            setScanResult(decodedText);
            setResultType('URL');
            stopScanner(html5QrCode);
          },
          () => {} 
        );
      } catch (err) {
        setCameraError('Câmera indisponível. Por favor, digite a chave manualmente.');
        setIsScanning(false);
        setIsManualMode(true);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {}
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanKey = manualKey.replace(/\D/g, '');
    if (cleanKey.length === 44) {
      setScanResult(cleanKey);
      setResultType('CHAVE_44');
      setIsManualMode(false);
      setCameraError('');
    } else {
      setCameraError(`A chave precisa ter 44 números. Você digitou ${cleanKey.length}.`);
    }
  };

  const resetProcess = () => {
    setScanResult(null);
    setCameraError('');
    setResultType('');
    setIsManualMode(false);
    setManualKey('');
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Despesa</h1>
        <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code ou insira a chave da Nota Fiscal.</p>
      </div>

      {cameraError && !scanResult && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{cameraError}</p>
          </div>
        </div>
      )}

      {isManualMode && !scanResult && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Chave de Acesso (44 números)</label>
          <textarea 
            rows="3"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="Ex: 3123 0112 3456... (Digite apenas números)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono resize-none"
          ></textarea>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={resetProcess} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition">Confirmar</button>
          </div>
        </form>
      )}

      {isScanning && (
        <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div id="qr-reader" className="w-full aspect-square max-w-sm rounded-lg overflow-hidden border-2 border-brand-500 mb-4 bg-black"></div>
          <button onClick={() => stopScanner()} className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-medium hover:bg-red-100 transition">
            <XCircle className="w-5 h-5" /> Cancelar
          </button>
        </div>
      )}

      {scanResult && !isScanning && (
        <div className="flex flex-col items-center bg-brand-50 p-6 rounded-2xl border border-brand-200 text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mb-4" />
          <h2 className="text-xl font-bold text-brand-900 mb-1">
            {resultType === 'URL' ? 'QR Code Lido!' : 'Chave Confirmada!'}
          </h2>
          <div className="bg-white p-3 rounded-lg border border-brand-100 w-full mb-6 mt-4">
            <p className="text-xs text-gray-500 font-mono break-all text-left">{scanResult}</p>
          </div>
          <div className="w-full space-y-3">
            <button onClick={() => alert('Em breve: Enviar para API Backend Vercel')} className="w-full bg-brand-600 text-white py-4 rounded-xl font-medium hover:bg-brand-700 transition shadow-sm">
              Buscar Dados da Nota
            </button>
            <button onClick={resetProcess} className="w-full bg-white text-gray-600 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-50 transition">
              Nova Leitura
            </button>
          </div>
        </div>
      )}

      {!isScanning && !scanResult && !isManualMode && (
        <div className="flex flex-col gap-4 mt-2">
          <button onClick={startScanner} className="flex flex-col items-center justify-center gap-3 bg-brand-600 text-white py-8 rounded-2xl hover:bg-brand-700 transition shadow-md group">
            <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-semibold">Abrir Câmera</span>
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button onClick={() => setIsManualMode(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-4 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm">
            <Keyboard className="w-5 h-5 text-gray-500" />
            Digitar Chave Manualmente
          </button>
        </div>
      )}
    </div>
  );
}