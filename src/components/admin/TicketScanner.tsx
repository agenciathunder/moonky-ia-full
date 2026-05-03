import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Camera, CameraOff, AlertTriangle } from "lucide-react";
import { validateTicketByQRCode } from "@/utils/ticketUtils";
import { useAuth } from "@/contexts/AuthContext";

interface ScanResult {
  success: boolean;
  message: string;
  ticketInfo?: {
    eventName?: string;
    ticketType?: string;
    userName?: string;
  };
}

export const TicketScanner = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.log("Scanner cleanup:", error);
      } finally {
        scannerRef.current = null;
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleScan = useCallback(async (qrCode: string) => {
    if (!user?.id || isProcessing) return;
    if (qrCode === lastScannedRef.current) return;
    
    lastScannedRef.current = qrCode;
    setIsProcessing(true);
    
    try {
      const result = await validateTicketByQRCode(qrCode, user.id);
      
      if (result.success) {
        setScanResult({
          success: true,
          message: "Acesso liberado",
          ticketInfo: {
            eventName: result.ticket?.event?.name,
            ticketType: result.ticket?.ticket_type?.name,
            userName: result.ticket?.profile?.full_name,
          },
        });
      } else {
        setScanResult({
          success: false,
          message: result.error || "Acesso negado – QR Code já utilizado",
        });
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: "Erro ao validar ingresso",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        lastScannedRef.current = "";
      }, 3000);
    }
  }, [user?.id, isProcessing]);

  const startScanner = async () => {
    setCameraError(null);
    setScanResult(null);
    lastScannedRef.current = "";

    // Check if camera API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Seu navegador não suporta acesso à câmera. Use um navegador moderno como Chrome, Firefox ou Safari.");
      return;
    }

    // First request camera permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      // Stop the stream immediately - we just wanted to get permission
      stream.getTracks().forEach(track => track.stop());
    } catch (permError: any) {
      console.error("Camera permission error:", permError);
      if (permError.name === "NotAllowedError") {
        setCameraError("Permissão de câmera negada. Clique no ícone de câmera na barra de endereço do navegador e permita o acesso.");
      } else if (permError.name === "NotFoundError") {
        setCameraError("Nenhuma câmera encontrada. Verifique se seu dispositivo possui câmera.");
      } else if (permError.name === "NotReadableError") {
        setCameraError("Câmera em uso por outro aplicativo. Feche outros apps que usam a câmera.");
      } else {
        setCameraError(`Erro ao acessar câmera: ${permError.message}`);
      }
      return;
    }

    try {
      // Clean up any existing scanner
      await stopScanner();

      // Ensure the container is visible before starting (iOS Safari can render a grey box otherwise)
      setIsScanning(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      // Prefer selecting a concrete camera device when available (more reliable on mobile)
      let cameraConfig: any = { facingMode: "environment" };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam =
            cameras.find((c) => /back|rear|environment/i.test(c.label || "")) ??
            cameras[cameras.length - 1];
          if (backCam?.id) cameraConfig = { deviceId: { exact: backCam.id } };
        }
      } catch {
        // Ignore camera enumeration failures; fallback to facingMode.
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await handleScan(decodedText);
        },
        () => {} // Ignore scan failures (no QR in frame)
      );

      // Ensure video element is configured for iOS inline playback and proper sizing
      const videoEl = document.querySelector("#qr-reader video") as HTMLVideoElement | null;
      if (videoEl) {
        videoEl.setAttribute("playsinline", "true");
        videoEl.muted = true;
        videoEl.autoplay = true;
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
      }
    } catch (error: any) {
      console.error("Error starting scanner:", error);
      setCameraError("Erro ao iniciar scanner. Tente novamente.");
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setCameraError(null);
    lastScannedRef.current = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scanner de Ingressos</h1>
        <p className="text-muted-foreground">
          Escaneie o QR Code do ingresso para validar a entrada
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">
        {/* Scanner Area */}
        <Card className="w-full overflow-hidden">
          <CardContent className="p-0">
            <div 
              ref={containerRef}
              id="qr-reader" 
              className="w-full aspect-square bg-muted"
              style={{ display: isScanning ? 'block' : 'none' }}
            />
            
            {!isScanning && !scanResult && !cameraError && (
              <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center gap-4 p-6">
                <Camera className="w-16 h-16 text-muted-foreground" />
                <p className="text-center text-muted-foreground">
                  Clique em "Iniciar Scanner" para começar a escanear
                </p>
              </div>
            )}

            {/* Camera Error Display */}
            {cameraError && !isScanning && (
              <div className="w-full aspect-square bg-amber-500/10 flex flex-col items-center justify-center gap-4 p-6">
                <AlertTriangle className="w-16 h-16 text-amber-500" />
                <p className="text-center text-amber-600 font-medium">
                  {cameraError}
                </p>
                <Button 
                  onClick={() => {
                    setCameraError(null);
                    startScanner();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Result Display */}
            {scanResult && (
              <div 
                className={`w-full aspect-square flex flex-col items-center justify-center gap-4 p-6 ${
                  scanResult.success 
                    ? "bg-emerald-500/10" 
                    : "bg-destructive/10"
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle className="w-24 h-24 text-emerald-500" />
                ) : (
                  <XCircle className="w-24 h-24 text-destructive" />
                )}
                
                <p className={`text-2xl font-bold text-center ${
                  scanResult.success ? "text-emerald-500" : "text-destructive"
                }`}>
                  {scanResult.message}
                </p>

                {scanResult.ticketInfo && scanResult.success && (
                  <div className="text-center space-y-1 mt-2">
                    {scanResult.ticketInfo.eventName && (
                      <p className="text-sm text-muted-foreground">
                        Evento: <span className="font-medium text-foreground">{scanResult.ticketInfo.eventName}</span>
                      </p>
                    )}
                    {scanResult.ticketInfo.ticketType && (
                      <p className="text-sm text-muted-foreground">
                        Tipo: <span className="font-medium text-foreground">{scanResult.ticketInfo.ticketType}</span>
                      </p>
                    )}
                    {scanResult.ticketInfo.userName && (
                      <p className="text-sm text-muted-foreground">
                        Nome: <span className="font-medium text-foreground">{scanResult.ticketInfo.userName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-3 w-full">
          {!isScanning ? (
            <Button 
              onClick={startScanner} 
              className="flex-1"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Iniciar Scanner
            </Button>
          ) : (
            <Button 
              onClick={stopScanner} 
              variant="outline" 
              className="flex-1"
              size="lg"
            >
              <CameraOff className="w-5 h-5 mr-2" />
              Parar Scanner
            </Button>
          )}
          
          {(scanResult || cameraError) && (
            <Button 
              onClick={resetScanner} 
              variant="secondary"
              size="lg"
            >
              Novo Scan
            </Button>
          )}
        </div>

        {isProcessing && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Validando ingresso...
          </p>
        )}
      </div>
    </div>
  );
};

export default TicketScanner;