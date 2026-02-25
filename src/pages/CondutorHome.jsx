import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle, ImagePlus, Flashlight, Loader2, Edit3 } from 'lucide-react';

export default function CondutorHome() {
  const [view, setView] = useState('HOME'); // 'HOME', 'SCANNER', 'MANUAL', 'SUCCESS', 'LOADING'
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  
  // Controle do Flash/Lanterna
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Formulário Manual
  const [formData, setFormData] = useState({
    odometer: '',
    fuelType: 'Gasolina',
    liters: '',
    pricePerLiter: '',
    totalValue: ''
  });

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Desliga a câmera se o componente for desmontado
  useEffect(() => {
    return () => stopScanner();
  }, []);

  // --- REDIMENSIONADOR NATIVO (Zero peso na memória RAM) ---
  const resizeImage = (file, maxEdge = 1000) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxEdge) {
          height *= maxEdge / width;
          width = maxEdge;
        } else if (height > maxEdge) {
          width *= maxEdge / height;
          height = maxEdge;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], "foto_leve.jpg", { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8); // Comprime em 80% de qualidade
      };
      img.onerror = reject;
    });
  };

  // --- MODO 1: CÂMERA AO VIVO COM FLASH E MOLDURA AJUSTADA ---
  const startScanner = async () => {
    setView('SCANNER');
    setCameraError('');
    setTorchEnabled(false);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
            // Moldura menor (~200px) ideal para focar o QR Code físico de 2,3 x 2,3 cm
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            setScanResult({ type: 'QR_LINK', value: decodedText });
            stopScanner();
            setView('SUCCESS');
          },
          () => {} 
        );

        // Verifica se a câmera do celular permite ligar o Flash (Torch)
        const track = html5QrCode.getVideoTrack();
        if (track && track.getCapabilities && track.getCapabilities().torch) {
          setHasTorchSupport(true);
        }

      } catch (err) {
        console.error(err);
        setCameraError('Câmera indisponível. Seu navegador pode estar bloqueando o acesso.');
        stopScanner();
        setView('HOME');
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {}
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: !torchEnabled }]
        });
        setTorchEnabled(!torchEnabled);
      } catch (err) {
        console.warn("Navegador não conseguiu ativar a lanterna", err);
      }
    }
  };

  // --- MODO 2: UPLOAD DA GALERIA / CÂMERA NATIVA ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setView('LOADING');
    setCameraError('');

    try {
      // 1. Redimensiona a imagem para evitar estouro de memória (OOM)
      const leveFile = await resizeImage(file);

      // 2. Tenta ler o QR Code da imagem leve
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      try {
        const decodedText = await html5QrCode.scanFile(leveFile, true);
        setScanResult({ type: 'QR_LINK', value: decodedText });
        setView('SUCCESS');
        return;
      } catch (qrErr) {
        console.log("QR Code não legível na foto. Preparando envio para API...");
      }

      // 3. IA EXTERNA: Se não achou o QR Code, enviaremos a imagem leve para nossa API futura
      setTimeout(() => {
        // Mock do envio para o Backend (Implementaremos na /api)
        setScanResult({ type: 'PHOTO_UPLOAD', value: leveFile });
        setView('SUCCESS');
      }, 1000);

    } catch (err) {
      setCameraError('Erro ao processar a imagem. Tente inserir os dados manualmente.');
      setView('HOME');
    } finally {
      e.target.value = ''; 
    }
  };

  // --- MODO 3: FORMULÁRIO MANUAL REAL ---
  const handleManualSubmit = (e) => {
    e.preventDefault();
    setScanResult({ type: 'MANUAL_DATA', value: formData });
    setView('SUCCESS');
  };

  const resetProcess = () => {
    setScanResult(null);
    setCameraError('');
    setView('HOME');
    setFormData({ odometer: '', fuelType: 'Gasolina', liters: '', pricePerLiter: '', totalValue: '' });
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Despesa</h1>
        <p className="text-gray-500 text-sm mt-1">Escaneie o cupom fiscal ou insira os dados.</p>
      </div>

      <div id="qr-reader-file" style={{ display: 'none' }}></div>

      {cameraError && view === 'HOME' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm font-medium">{cameraError}</p>
        </div>
      )}

      {/* --- TELA: CARREGANDO (PROCESSAMENTO) --- */}
      {view === 'LOADING' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-gray-800 text-center">Analisando Cupom...</h3>
          <p className="text-sm text-gray-500 mt-2 text-center">Preparando imagem para extração de dados.</p>
        </div>
      )}

      {/* --- TELA: CÂMERA AO VIVO --- */}
      {view === 'SCANNER' && (
        <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-sm text-brand-600 font-semibold mb-3 text-center">
            Centralize o QR Code no quadrado abaixo
          </p>
          
          <div className="relative w-full max-w-sm mb-4">
            <div id="qr-reader" className="w-full aspect-square rounded-xl overflow-hidden bg-black border-2 border-brand-500"></div>
            
            {/* Botão de Lanterna (Só aparece se o celular suportar) */}
            {hasTorchSupport && (
              <button 
                onClick={toggleTorch}
                className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg backdrop-blur-md transition ${torchEnabled ? 'bg-yellow-400 text-yellow-900' : 'bg-black/50 text-white'}`}
              >
                <Flashlight className="w-6 h-6" />
              </button>
            )}
          </div>

          <button onClick={() => { stopScanner(); setView('HOME'); }} className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-medium hover:bg-red-100 transition">
            <XCircle className="w-5 h-5" /> Cancelar Câmera
          </button>
        </div>
      )}

      {/* --- TELA: FORMULÁRIO MANUAL --- */}
      {view === 'MANUAL' && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6 animate-fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-brand-600" /> Dados do Abastecimento
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Km do Veículo</label>
              <input type="number" required value={formData.odometer} onChange={(e) => setFormData({...formData, odometer: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="Ex: 15400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Combustível</label>
              <select value={formData.fuelType} onChange={(e) => setFormData({...formData, fuelType: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="Gasolina">Gasolina Comum</option>
                <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel S10">Diesel S10</option>
                <option value="Diesel S500">Diesel S500</option>
                <option value="GNV">GNV</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Litros</label>
                <input type="number" step="0.01" required value={formData.liters} onChange={(e) => setFormData({...formData, liters: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Valor Unit. (R$)</label>
                <input type="number" step="0.01" required value={formData.pricePerLiter} onChange={(e) => setFormData({...formData, pricePerLiter: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Valor Total (R$)</label>
              <input type="number" step="0.01" required value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg bg-brand-50 font-bold text-brand-900" placeholder="0.00" />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setView('HOME')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700">Salvar Dados</button>
          </div>
        </form>
      )}

      {/* --- TELA: SUCESSO (PRONTO PARA ENVIAR) --- */}
      {view === 'SUCCESS' && scanResult && (
        <div className="flex flex-col items-center bg-brand-50 p-6 rounded-2xl border border-brand-200 text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mb-4" />
          <h2 className="text-xl font-bold text-brand-900 mb-1">
            {scanResult.type === 'QR_LINK' && 'QR Code Lido!'}
            {scanResult.type === 'PHOTO_UPLOAD' && 'Foto Pronta para IA!'}
            {scanResult.type === 'MANUAL_DATA' && 'Dados Preenchidos!'}
          </h2>
          
          <div className="bg-white p-3 rounded-lg border border-brand-100 w-full mb-6 mt-4">
            {scanResult.type === 'QR_LINK' && <p className="text-xs text-gray-500 font-mono break-all">{scanResult.value}</p>}
            {scanResult.type === 'PHOTO_UPLOAD' && <p className="text-sm text-gray-600 font-medium">Imagem otimizada com sucesso.</p>}
            {scanResult.type === 'MANUAL_DATA' && (
              <ul className="text-sm text-gray-700 text-left space-y-1">
                <li><b>KM:</b> {scanResult.value.odometer}</li>
                <li><b>Combustível:</b> {scanResult.value.fuelType}</li>
                <li><b>Total:</b> R$ {scanResult.value.totalValue}</li>
              </ul>
            )}
          </div>
          
          <div className="w-full space-y-3">
            <button onClick={() => alert('Próximo passo: Integração com o Banco de Dados e API SEFAZ!')} className="w-full bg-brand-600 text-white py-4 rounded-xl font-medium hover:bg-brand-700 shadow-sm">
              Confirmar Despesa
            </button>
            <button onClick={resetProcess} className="w-full bg-white text-gray-600 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-50">
              Descartar e Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* --- TELA: HOME (BOTÕES PRINCIPAIS) --- */}
      {view === 'HOME' && (
        <div className="flex flex-col gap-4 mt-2">
          <button onClick={startScanner} className="flex flex-col items-center justify-center gap-3 bg-brand-600 text-white py-8 rounded-2xl hover:bg-brand-700 shadow-md group">
            <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-semibold">Câmera do App (QR Code)</span>
          </button>

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          
          <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-3 bg-brand-50 border border-brand-200 text-brand-700 py-4 rounded-xl hover:bg-brand-100 font-medium shadow-sm">
            <ImagePlus className="w-6 h-6" />
            Galeria / Câmera Nativa
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button onClick={() => setView('MANUAL')} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-4 rounded-xl hover:bg-gray-50 font-medium shadow-sm">
            <FileText className="w-5 h-5 text-gray-500" />
            Inserir Dados Manualmente
          </button>
        </div>
      )}
    </div>
  );
}