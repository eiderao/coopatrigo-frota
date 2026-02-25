import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle, ImagePlus, Loader2, Edit3 } from 'lucide-react';

// ==========================================
// SUBCOMPONENTE: CÂMERA BLINDADA
// ==========================================
// Este componente garante que a <div id="qr-reader"> já existe no DOM antes de ligar a câmera.
const QRScanner = ({ onSuccess, onError, onCancel }) => {
  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode("qr-reader");

    const startCamera = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            qrbox: { width: 220, height: 220 }, // Foco ideal
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (isMounted) {
              scanner.stop().then(() => onSuccess(decodedText)).catch(() => onSuccess(decodedText));
            }
          },
          () => {} // ignora falhas de frame
        );
      } catch (err) {
        if (isMounted) {
          console.error("Erro Câmera Principal:", err);
          onError("Câmera bloqueada ou indisponível. Verifique as permissões do navegador.");
        }
      }
    };

    startCamera();

    // Limpeza rigorosa ao fechar a câmera
    return () => {
      isMounted = false;
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [onSuccess, onError]);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-full">
      <p className="text-sm text-brand-600 font-semibold mb-3 text-center animate-pulse">
        Aponte a câmera para o QR Code
      </p>
      {/* A div garantida no DOM */}
      <div id="qr-reader" className="w-full aspect-square max-w-sm mb-4 bg-black rounded-xl overflow-hidden border-2 border-brand-500 min-h-[250px]"></div>
      
      <button onClick={onCancel} className="w-full flex justify-center items-center gap-2 py-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition">
        <XCircle className="w-5 h-5" /> Cancelar Câmera
      </button>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function CondutorHome() {
  const [view, setView] = useState('HOME'); // 'HOME', 'SCANNER', 'MANUAL', 'SUCCESS', 'LOADING'
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  
  const [formData, setFormData] = useState({
    odometer: '', fuelType: 'Gasolina', liters: '', pricePerLiter: '', totalValue: ''
  });

  const fileInputRef = useRef(null);

  // --- INTERCEPTADOR DO BOTÃO VOLTAR DO CELULAR (ANTI-LOOP) ---
  useEffect(() => {
    // Adiciona um estado falso no histórico para prender o usuário nesta tela com segurança
    window.history.pushState({ noBack: true }, '');

    const handlePopState = (e) => {
      // Se ele apertar voltar e estiver na câmera ou manual, volta pra HOME em vez de dar loop
      if (view !== 'HOME') {
        setView('HOME');
        window.history.pushState({ noBack: true }, ''); // Restaura a trava
      } else {
        // Se estiver na HOME, mantém ele aqui e impede o navegador de ir pro Login
        window.history.pushState({ noBack: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  // --- REDIMENSIONADOR NATIVO ---
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
          URL.revokeObjectURL(objectUrl); 
          resolve(new File([blob], "foto_leve.jpg", { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setView('LOADING');
    setCameraError('');

    try {
      const leveFile = await resizeImage(file);
      const html5QrCode = new Html5Qrcode("qr-reader-file"); // Div oculta lá embaixo
      
      try {
        const decodedText = await html5QrCode.scanFile(leveFile, true);
        setScanResult({ type: 'QR_LINK', value: decodedText });
        setView('SUCCESS');
      } catch (qrErr) {
        // Mock envio pra nuvem
        setTimeout(() => {
          setScanResult({ type: 'PHOTO_UPLOAD', value: leveFile });
          setView('SUCCESS');
        }, 800);
      }
    } catch (err) {
      setCameraError('Erro ao processar imagem. Use a digitação manual.');
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
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{cameraError}</p>
        </div>
      )}

      {view === 'LOADING' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold">Processando...</h3>
        </div>
      )}

      {/* RENDERIZAÇÃO SEGURA DO SCANNER */}
      {view === 'SCANNER' && (
        <QRScanner 
          onSuccess={(text) => {
            setScanResult({ type: 'QR_LINK', value: text });
            setView('SUCCESS');
          }}
          onError={(err) => {
            setCameraError(err);
            setView('HOME');
          }}
          onCancel={() => setView('HOME')}
        />
      )}

      {view === 'MANUAL' && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-brand-600"/> Dados Manuais</h3>
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
          <h2 className="text-xl font-bold mb-4">Dados Registrados!</h2>
          
          <div className="bg-white p-3 rounded-lg border w-full mb-6">
            {scanResult.type === 'QR_LINK' && <p className="text-xs text-gray-500 font-mono break-all">{scanResult.value}</p>}
            {scanResult.type === 'PHOTO_UPLOAD' && <p className="text-sm font-medium">Foto otimizada.</p>}
            {scanResult.type === 'MANUAL_DATA' && <p className="text-sm font-bold text-brand-700">R$ {scanResult.value.totalValue}</p>}
          </div>

          <button onClick={() => { setScanResult(null); setView('HOME'); }} className="w-full bg-white border py-3 rounded-xl font-medium">
            Nova Leitura
          </button>
        </div>
      )}

      {view === 'HOME' && (
        <div className="flex flex-col gap-4 mt-2">
          <button onClick={() => setView('SCANNER')} className="flex gap-3 items-center justify-center bg-brand-600 text-white py-6 rounded-2xl font-semibold shadow-md">
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