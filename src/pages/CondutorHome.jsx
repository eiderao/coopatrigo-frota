import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle, ImagePlus, Loader2, Edit3 } from 'lucide-react';

export default function CondutorHome() {
  const [view, setView] = useState('HOME');
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  
  const [formData, setFormData] = useState({
    odometer: '', fuelType: 'Gasolina', liters: '', pricePerLiter: '', totalValue: ''
  });

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  // --- CORREÇÃO OOM (ERRO DE MEMÓRIA) ---
  const resizeImage = (file, maxEdge = 1000) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxEdge) {
          height *= maxEdge / width; width = maxEdge;
        } else if (height > maxEdge) {
          width *= maxEdge / height; height = maxEdge;
        }

        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl); // <--- O SEGREDO PRA NÃO TRAVAR A RAM DO CELULAR
          resolve(new File([blob], "foto_leve.jpg", { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
    });
  };

  const startScanner = async () => {
    setView('SCANNER');
    setCameraError('');

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Tenta câmera traseira primeiro
        {
          fps: 10,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          qrbox: { width: 200, height: 200 }, // Foco ideal para os 2,3cm
          aspectRatio: 1.0
        },
        (decodedText) => {
          setScanResult({ type: 'QR_LINK', value: decodedText });
          stopScanner();
          setView('SUCCESS');
        },
        () => {} 
      );
    } catch (err) {
      console.warn("Câmera traseira falhou. Tentando abrir qualquer câmera...", err);
      try {
        // Fallback: Se "environment" der erro, abre a primeira câmera que achar
        await scannerRef.current.start(
          { deviceId: { exact: undefined } }, 
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decoded) => { setScanResult({ type: 'QR_LINK', value: decoded }); stopScanner(); setView('SUCCESS'); },
          () => {}
        );
      } catch (fallbackErr) {
        setCameraError('Permissão negada ou câmera indisponível. Verifique as configurações do navegador.');
        stopScanner();
        setView('HOME');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); scannerRef.current = null; } catch (err) {}
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setView('LOADING');
    setCameraError('');

    try {
      const leveFile = await resizeImage(file); // Não trava mais a RAM
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      
      try {
        const decodedText = await html5QrCode.scanFile(leveFile, true);
        setScanResult({ type: 'QR_LINK', value: decodedText });
        setView('SUCCESS');
        return;
      } catch (qrErr) {
        // Se a foto não for lida, vamos simular o envio pra API que faremos a seguir.
        setScanResult({ type: 'PHOTO_UPLOAD', value: leveFile });
        setView('SUCCESS');
      }
    } catch (err) {
      setCameraError('Erro ao processar a imagem. Insira os dados manualmente.');
      setView('HOME');
    } finally {
      e.target.value = ''; 
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setScanResult({ type: 'MANUAL_DATA', value: formData });
    setView('SUCCESS');
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Despesa</h1>
      </div>

      <div id="qr-reader-file" style={{ display: 'none' }}></div>

      {cameraError && view === 'HOME' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{cameraError}</p>
        </div>
      )}

      {view === 'LOADING' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-sm mt-4 border border-gray-100">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold">Otimizando Imagem...</h3>
        </div>
      )}

      {view === 'SCANNER' && (
        <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div id="qr-reader" className="w-full aspect-square max-w-sm mb-4 bg-black rounded-xl overflow-hidden"></div>
          <button onClick={() => { stopScanner(); setView('HOME'); }} className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-medium">
            Cancelar Câmera
          </button>
        </div>
      )}

      {view === 'MANUAL' && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Km do Veículo</label>
              <input type="number" required value={formData.odometer} onChange={(e) => setFormData({...formData, odometer: e.target.value})} className="w-full p-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Combustível</label>
              <select value={formData.fuelType} onChange={(e) => setFormData({...formData, fuelType: e.target.value})} className="w-full p-3 border rounded-lg bg-white">
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Litros</label>
                <input type="number" step="0.01" required value={formData.liters} onChange={(e) => setFormData({...formData, liters: e.target.value})} className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Valor Unit.</label>
                <input type="number" step="0.01" required value={formData.pricePerLiter} onChange={(e) => setFormData({...formData, pricePerLiter: e.target.value})} className="w-full p-3 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Valor Total (R$)</label>
              <input type="number" step="0.01" required value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: e.target.value})} className="w-full p-3 border rounded-lg font-bold" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setView('HOME')} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium">Revisar</button>
          </div>
        </form>
      )}

      {view === 'SUCCESS' && scanResult && (
        <div className="bg-brand-50 p-6 rounded-2xl text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mb-4 mx-auto" />
          <h2 className="text-xl font-bold mb-4">Sucesso!</h2>
          <button onClick={() => { setScanResult(null); setView('HOME'); }} className="w-full bg-white border py-3 rounded-xl font-medium">
            Voltar ao Início
          </button>
        </div>
      )}

      {view === 'HOME' && (
        <div className="flex flex-col gap-4 mt-2">
          <button onClick={startScanner} className="flex gap-3 items-center justify-center bg-brand-600 text-white py-6 rounded-2xl font-semibold">
            <Camera className="w-6 h-6" /> Câmera ao Vivo
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="flex gap-3 items-center justify-center bg-brand-50 text-brand-700 py-4 rounded-xl font-medium border border-brand-200">
            <ImagePlus className="w-5 h-5" /> Enviar Foto da Galeria
          </button>
          <button onClick={() => setView('MANUAL')} className="flex gap-3 items-center justify-center bg-white border border-gray-300 py-4 rounded-xl font-medium">
            <Edit3 className="w-5 h-5" /> Inserir Manualmente
          </button>
        </div>
      )}
    </div>
  );
}