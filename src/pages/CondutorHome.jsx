import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle, ImagePlus, Loader2 } from 'lucide-react';

export default function CondutorHome() {
  const [isScanning, setIsScanning] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0); // Novo: Progresso do OCR
  const [scanResult, setScanResult] = useState(null);
  const [resultType, setResultType] = useState('');
  const [cameraError, setCameraError] = useState('');
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // --- FUNÇÃO DE COMPRESSÃO DE IMAGEM (Evita Erro de Memória) ---
  const compressImage = (file, maxWidth = 1200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensiona mantendo a proporção
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprime para JPEG com 80% de qualidade
          canvas.toBlob((blob) => {
            const newFile = new File([blob], "compressed_image.jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- MODO 1: CÂMERA AO VIVO ---
  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setCameraError('');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdgePercentage = 0.8;
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdgeSize * minEdgePercentage),
                height: Math.floor(minEdgeSize * minEdgePercentage)
              };
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
        setCameraError('Não foi possível acessar a câmera. Use o botão de Câmera Nativa abaixo.');
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async (scannerInstance) => {
    const instance = scannerInstance || scannerRef.current;
    if (instance) {
      try {
        await instance.stop();
        instance.clear();
        scannerRef.current = null;
      } catch (err) {}
    }
    setIsScanning(false);
  };

  // --- MODO 2: UPLOAD COM COMPRESSÃO E OCR ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCameraError('');
    setIsOcrLoading(true);
    setOcrProgress(0);

    try {
      // 1. Comprime a imagem para não estourar a memória do celular
      const compressedFile = await compressImage(file);

      // 2. Tenta achar o QR Code na imagem comprimida
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      try {
        const decodedText = await html5QrCode.scanFile(compressedFile, true);
        setScanResult(decodedText);
        setResultType('URL');
        setIsOcrLoading(false);
        return; // Sucesso, para aqui.
      } catch (qrErr) {
        console.log("QR Code não encontrado, iniciando IA OCR...");
      }

      // 3. Se QR falhar, roda o Tesseract para buscar a chave
      const { data: { text } } = await Tesseract.recognize(
        compressedFile,
        'por',
        { 
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          } 
        }
      );

      const digitsOnly = text.replace(/\D/g, '');
      const match44 = digitsOnly.match(/\d{44}/);

      if (match44) {
        setScanResult(match44[0]);
        setResultType('CHAVE_44');
      } else {
        setCameraError('Não localizamos QR Code ou Chave. Tente uma foto mais nítida.');
      }
    } catch (err) {
      console.error(err);
      setCameraError('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsOcrLoading(false);
      e.target.value = '';
    }
  };

  const resetProcess = () => {
    setScanResult(null);
    setCameraError('');
    setResultType('');
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Despesa</h1>
        <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code da nota fiscal (NF-e) ou insira manualmente.</p>
      </div>

      <div id="qr-reader-file" style={{ display: 'none' }}></div>

      {/* ESTADO: CARREGANDO OCR COM PROGRESSO */}
      {isOcrLoading && (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-gray-800 text-center">Analisando Imagem...</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2">
            <div className="bg-brand-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 font-medium">{ocrProgress}% concluído</p>
        </div>
      )}

      {/* ESTADO: ERRO */}
      {cameraError && !isScanning && !scanResult && !isOcrLoading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{cameraError}</p>
            <button onClick={resetProcess} className="mt-3 text-sm text-red-600 underline font-semibold hover:text-red-800">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* ESTADO: CÂMERA AO VIVO */}
      {isScanning && !isOcrLoading && (
        <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div id="qr-reader" className="w-full aspect-square max-w-sm rounded-lg overflow-hidden border-2 border-brand-500 mb-4 bg-black"></div>
          <button onClick={() => stopScanner()} className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-medium hover:bg-red-100 transition">
            <XCircle className="w-5 h-5" /> Cancelar Câmera
          </button>
        </div>
      )}

      {/* ESTADO: SUCESSO */}
      {scanResult && !isScanning && !isOcrLoading && (
        <div className="flex flex-col items-center bg-brand-50 p-6 rounded-2xl border border-brand-200 text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mb-4" />
          <h2 className="text-xl font-bold text-brand-900 mb-1">
            {resultType === 'URL' ? 'QR Code Lido!' : 'Chave Localizada!'}
          </h2>
          <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-3 py-1 rounded-full mb-4">
            {resultType === 'URL' ? 'Link SEFAZ' : '44 Dígitos'}
          </span>
          <div className="bg-white p-3 rounded-lg border border-brand-100 w-full mb-6">
            <p className="text-xs text-gray-500 font-mono break-all text-left">{scanResult}</p>
          </div>
          <div className="w-full space-y-3">
            <button onClick={() => alert('Pronto para extrair dados da SEFAZ')} className="w-full bg-brand-600 text-white py-4 rounded-xl font-medium hover:bg-brand-700 transition shadow-sm">
              Continuar com esta Nota
            </button>
            <button onClick={resetProcess} className="w-full bg-white text-gray-600 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-50 transition">
              Ler outra nota
            </button>
          </div>
        </div>
      )}

      {/* ESTADO: BOTÕES INICIAIS */}
      {!isScanning && !scanResult && !isOcrLoading && (
        <div className="flex flex-col gap-4 mt-2">
          <button onClick={startScanner} className="flex flex-col items-center justify-center gap-3 bg-brand-600 text-white py-8 rounded-2xl hover:bg-brand-700 transition shadow-md group">
            <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-semibold">Câmera Rápida do App</span>
          </button>

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          
          <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-3 bg-brand-50 border border-brand-200 text-brand-700 py-4 rounded-xl hover:bg-brand-100 transition font-medium shadow-sm">
            <ImagePlus className="w-6 h-6" />
            Usar Câmera Nativa ou Galeria
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-4 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm">
            <FileText className="w-5 h-5 text-gray-500" />
            Digitar Manualmente
          </button>
        </div>
      )}
    </div>
  );
}