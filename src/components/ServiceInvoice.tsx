import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X } from "lucide-react";
import moonkyLogo from "@/assets/moonky-logo.png";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, string> | null;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  cashAmount?: number | null;
  change?: number;
  customerName?: string;
  customerPhone?: string;
  orderObservations?: string | null;
  establishment: {
    name: string;
    whatsapp?: string;
    email?: string;
    address?: string;
  };
}

interface ServiceInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
}

const ServiceInvoice = ({ isOpen, onClose, data }: ServiceInvoiceProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Print function for 58mm thermal printer
  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=220,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              line-height: 1.3;
              width: 48mm;
              padding: 2mm;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              margin-bottom: 4mm;
              border-bottom: 1px dashed #000;
              padding-bottom: 3mm;
            }
            .logo {
              width: 28mm;
              height: auto;
              filter: brightness(0);
              margin-bottom: 2mm;
            }
            .establishment {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin: 1mm 0;
            }
            .section {
              margin: 3mm 0;
              padding: 2mm 0;
              border-bottom: 1px dashed #000;
            }
            .section-title {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .item {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin: 1mm 0;
            }
            .item-name {
              flex: 1;
              max-width: 25mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .item-qty {
              width: 8mm;
              text-align: center;
            }
            .item-price {
              width: 12mm;
              text-align: right;
            }
            .totals {
              margin: 3mm 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin: 1mm 0;
            }
            .total-row.main {
              font-size: 12px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 2mm;
              margin-top: 2mm;
            }
            .change {
              color: #000;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              font-size: 8px;
              margin-top: 4mm;
              padding-top: 3mm;
              border-top: 1px dashed #000;
            }
            .footer p {
              margin: 1mm 0;
            }
            .cut-line {
              margin-top: 5mm;
              border-top: 1px dashed #000;
              text-align: center;
              font-size: 8px;
              padding-top: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${moonkyLogo}" class="logo" alt="Moonky" />
            <div class="establishment">${data.establishment.name}</div>
          </div>
          
          <div class="info-row">
            <span>Nº ${data.invoiceNumber}</span>
            <span>${formatDate(data.date)}</span>
          </div>
          
          ${data.customerName ? `
            <div class="section">
              <div class="section-title">CLIENTE</div>
              <div style="font-size: 9px;">${data.customerName}</div>
              ${data.customerPhone ? `<div style="font-size: 9px;">${data.customerPhone}</div>` : ''}
            </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">ITENS</div>
            ${data.items.map(item => `
              <div class="item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity}x</span>
                <span class="item-price">${formatPrice(item.totalPrice)}</span>
              </div>
              ${item.specifications && Object.keys(item.specifications).length > 0 ? `
                <div style="font-size: 8px; color: #555; margin-left: 2mm; margin-bottom: 1mm;">
                  ${Object.entries(item.specifications).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                </div>
              ` : ''}
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatPrice(data.subtotal)}</span>
            </div>
            ${data.deliveryFee && data.deliveryFee > 0 ? `
              <div class="total-row">
                <span>Entrega</span>
                <span>${formatPrice(data.deliveryFee)}</span>
              </div>
            ` : ''}
            ${data.discount > 0 ? `
              <div class="total-row">
                <span>Desconto</span>
                <span>-${formatPrice(data.discount)}</span>
              </div>
            ` : ''}
            <div class="total-row main">
              <span>TOTAL</span>
              <span>${formatPrice(data.total)}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="total-row">
              <span>Pagamento</span>
              <span>${data.paymentMethod}</span>
            </div>
            ${data.cashAmount && data.cashAmount > 0 ? `
              <div class="total-row">
                <span>Valor Pago</span>
                <span>${formatPrice(data.cashAmount)}</span>
              </div>
              ${data.change && data.change > 0 ? `
                <div class="total-row change">
                  <span>TROCO</span>
                  <span>${formatPrice(data.change)}</span>
                </div>
              ` : ''}
            ` : ''}
          </div>

          ${data.orderObservations ? `
            <div class="section">
              <div class="section-title">OBSERVAÇÕES</div>
              <div style="font-size: 9px; word-wrap: break-word;">${data.orderObservations}</div>
            </div>
          ` : ''}
          <div class="footer">
            ${data.establishment.whatsapp ? `<p>WhatsApp: ${data.establishment.whatsapp}</p>` : ''}
            ${data.establishment.email ? `<p>${data.establishment.email}</p>` : ''}
            <p style="margin-top: 2mm;">Moonky - Sua loja digital</p>
          </div>
          
          <div class="cut-line">
            - - - - - - - - - - - - - - - - -
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for image to load before printing
    const img = printWindow.document.querySelector('img');
    if (img) {
      img.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
      img.onerror = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    } else {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const downloadInvoice = async () => {
    setIsDownloading(true);

    try {
      // High-resolution canvas for WhatsApp sharing (3x scale for crisp text)
      const scale = 3;
      const baseWidth = 360; // Base width in logical pixels
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = baseWidth * scale;
      const padding = 24 * scale;
      const smallFontSize = 12 * scale;
      const mediumFontSize = 14 * scale;
      const largeFontSize = 18 * scale;
      const lineSpacing = 22 * scale;
      let currentY = padding;

      // Calculate height based on content
      const itemsHeight = (data.items?.length || 0) * (lineSpacing + 4 * scale);
      const specsExtraHeight = data.items?.reduce((acc, item) => acc + (item.specifications && Object.keys(item.specifications).length > 0 ? 16 : 0), 0) || 0;
      const obsHeight = data.orderObservations ? 60 : 0;
      const baseHeight = 520 + (data.cashAmount ? 80 : 0) + (data.customerName ? 60 : 0) + obsHeight;
      const height = (baseHeight + itemsHeight / scale + specsExtraHeight) * scale;
      
      canvas.width = width;
      canvas.height = height;

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Load and draw logo
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            const logoMaxHeight = 48 * scale;
            const logoAspect = logoImg.width / logoImg.height;
            const logoHeight = logoMaxHeight;
            const logoWidth = logoHeight * logoAspect;
            
            tempCanvas.width = logoWidth;
            tempCanvas.height = logoHeight;
            tempCtx.drawImage(logoImg, 0, 0, logoWidth, logoHeight);
            tempCtx.globalCompositeOperation = "source-atop";
            tempCtx.fillStyle = "#000000";
            tempCtx.fillRect(0, 0, logoWidth, logoHeight);
            
            const logoX = (width - logoWidth) / 2;
            ctx.drawImage(tempCanvas, logoX, currentY);
            currentY += logoHeight + 16 * scale;
          }
          resolve();
        };
        logoImg.onerror = () => {
          ctx.fillStyle = "#000000";
          ctx.font = `bold ${largeFontSize * 1.5}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText("moonky", width / 2, currentY + 30 * scale);
          currentY += 50 * scale;
          resolve();
        };
        logoImg.src = moonkyLogo;
      });

      // Establishment name
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${mediumFontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(data.establishment.name.toUpperCase(), width / 2, currentY);
      currentY += 28 * scale;

      // Dashed divider
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 20 * scale;

      // Invoice info
      ctx.font = `${smallFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#000000";
      ctx.fillText(`Nº ${data.invoiceNumber}`, padding, currentY);
      ctx.textAlign = "right";
      ctx.fillText(formatDate(data.date), width - padding, currentY);
      currentY += lineSpacing;

      // Customer info
      if (data.customerName) {
        currentY += 8 * scale;
        ctx.textAlign = "left";
        ctx.font = `bold ${smallFontSize}px Arial`;
        ctx.fillText("CLIENTE", padding, currentY);
        currentY += 18 * scale;
        ctx.font = `${smallFontSize}px Arial`;
        ctx.fillText(data.customerName, padding, currentY);
        currentY += 18 * scale;
        if (data.customerPhone) {
          ctx.fillText(data.customerPhone, padding, currentY);
          currentY += 18 * scale;
        }
        currentY += 10 * scale;
      }

      // Dashed divider
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.strokeStyle = "#888888";
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 20 * scale;

      // Items header
      ctx.font = `bold ${smallFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#000000";
      ctx.fillText("ITENS", padding, currentY);
      currentY += 20 * scale;

      // Items
      ctx.font = `${smallFontSize}px Arial`;
      if (data.items && data.items.length > 0) {
        data.items.forEach((item) => {
          ctx.textAlign = "left";
          const maxNameLength = 28;
          const itemName = item.name.length > maxNameLength 
            ? item.name.substring(0, maxNameLength) + "..." 
            : item.name;
          ctx.fillText(itemName, padding, currentY);
          ctx.textAlign = "center";
          ctx.fillText(`${item.quantity}x`, width - 100 * scale, currentY);
          ctx.textAlign = "right";
          ctx.fillText(formatPrice(item.totalPrice), width - padding, currentY);
          currentY += lineSpacing;
          // Specs
          if (item.specifications && Object.keys(item.specifications).length > 0) {
            ctx.font = `${10 * scale}px Arial`;
            ctx.fillStyle = "#555555";
            ctx.textAlign = "left";
            const specsText = Object.entries(item.specifications).map(([k, v]) => `${k}: ${v}`).join(' | ');
            ctx.fillText(specsText, padding + 8 * scale, currentY);
            currentY += 16 * scale;
            ctx.fillStyle = "#000000";
            ctx.font = `${smallFontSize}px Arial`;
          }
        });
      } else {
        ctx.fillStyle = "#666666";
        ctx.fillText("Nenhum item", padding, currentY);
        ctx.fillStyle = "#000000";
        currentY += lineSpacing;
      }

      currentY += 10 * scale;

      // Dashed divider
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.strokeStyle = "#888888";
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 20 * scale;

      // Totals
      ctx.font = `${smallFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillText("Subtotal", padding, currentY);
      ctx.textAlign = "right";
      ctx.fillText(formatPrice(data.subtotal), width - padding, currentY);
      currentY += lineSpacing;

      if (data.deliveryFee && data.deliveryFee > 0) {
        ctx.textAlign = "left";
        ctx.fillText("Entrega", padding, currentY);
        ctx.textAlign = "right";
        ctx.fillText(formatPrice(data.deliveryFee), width - padding, currentY);
        currentY += lineSpacing;
      }

      if (data.discount > 0) {
        ctx.textAlign = "left";
        ctx.fillText("Desconto", padding, currentY);
        ctx.textAlign = "right";
        ctx.fillText("-" + formatPrice(data.discount), width - padding, currentY);
        currentY += lineSpacing;
      }

      // Total line
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      currentY += 16 * scale;

      // Total
      ctx.font = `bold ${largeFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillText("TOTAL", padding, currentY);
      ctx.textAlign = "right";
      ctx.fillText(formatPrice(data.total), width - padding, currentY);
      currentY += 28 * scale;

      // Dashed divider
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 20 * scale;

      // Payment
      ctx.font = `${smallFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillText("Pagamento", padding, currentY);
      ctx.textAlign = "right";
      ctx.fillText(data.paymentMethod, width - padding, currentY);
      currentY += lineSpacing;

      if (data.cashAmount && data.cashAmount > 0) {
        ctx.textAlign = "left";
        ctx.fillText("Valor Pago", padding, currentY);
        ctx.textAlign = "right";
        ctx.fillText(formatPrice(data.cashAmount), width - padding, currentY);
        currentY += lineSpacing;

        if (data.change && data.change > 0) {
          ctx.font = `bold ${mediumFontSize}px Arial`;
          ctx.textAlign = "left";
          ctx.fillText("TROCO", padding, currentY);
          ctx.textAlign = "right";
          ctx.fillText(formatPrice(data.change), width - padding, currentY);
          currentY += lineSpacing;
        }
      }

      // Observations
      if (data.orderObservations) {
        currentY += 8 * scale;
        ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.strokeStyle = "#888888";
        ctx.beginPath();
        ctx.moveTo(padding, currentY);
        ctx.lineTo(width - padding, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        currentY += 20 * scale;
        ctx.font = `bold ${smallFontSize}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText("OBSERVAÇÕES", padding, currentY);
        currentY += 18 * scale;
        ctx.font = `${smallFontSize}px Arial`;
        // Word wrap observations
        const words = data.orderObservations.split(' ');
        let line = '';
        const maxWidth = width - padding * 2;
        for (const word of words) {
          const testLine = line + (line ? ' ' : '') + word;
          if (ctx.measureText(testLine).width > maxWidth && line) {
            ctx.fillText(line, padding, currentY);
            currentY += 16 * scale;
            line = word;
          } else {
            line = testLine;
          }
        }
        if (line) {
          ctx.fillText(line, padding, currentY);
          currentY += 16 * scale;
        }
      }

      currentY += 16 * scale;

      // Footer divider
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(width - padding, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 20 * scale;

      // Footer
      ctx.font = `${11 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#555555";
      
      if (data.establishment.whatsapp) {
        ctx.fillText(`WhatsApp: ${data.establishment.whatsapp}`, width / 2, currentY);
        currentY += 18 * scale;
      }
      if (data.establishment.email) {
        ctx.fillText(data.establishment.email, width / 2, currentY);
        currentY += 18 * scale;
      }
      
      ctx.font = `${10 * scale}px Arial`;
      ctx.fillStyle = "#888888";
      ctx.fillText("Moonky - Sua loja digital", width / 2, currentY + 10 * scale);

      // Download with high quality
      const link = document.createElement("a");
      link.download = `cupom-${data.invoiceNumber}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (error) {
      console.error("Error downloading invoice:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareViaWhatsApp = () => {
    let message = `*COMPROVANTE DE VENDA*\n`;
    message += `${data.establishment.name}\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `Nº ${data.invoiceNumber}\n`;
    message += `${formatDate(data.date)}\n`;
    
    if (data.customerName) {
      message += `\n*Cliente:* ${data.customerName}\n`;
    }
    
    message += `\n*ITENS:*\n`;
    data.items.forEach((item) => {
      message += `${item.quantity}x ${item.name}\n   ${formatPrice(item.totalPrice)}\n`;
      if (item.specifications && Object.keys(item.specifications).length > 0) {
        message += `   _${Object.entries(item.specifications).map(([k, v]) => `${k}: ${v}`).join(' | ')}_\n`;
      }
    });
    
    if (data.orderObservations) {
      message += `\n*📝 Observações:*\n${data.orderObservations}\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: ${formatPrice(data.subtotal)}\n`;
    
    if (data.deliveryFee && data.deliveryFee > 0) {
      message += `Entrega: ${formatPrice(data.deliveryFee)}\n`;
    }
    
    if (data.discount > 0) {
      message += `Desconto: -${formatPrice(data.discount)}\n`;
    }
    
    message += `*TOTAL: ${formatPrice(data.total)}*\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `Pagamento: ${data.paymentMethod}\n`;
    
    if (data.cashAmount && data.cashAmount > 0) {
      message += `Valor Pago: ${formatPrice(data.cashAmount)}\n`;
      if (data.change && data.change > 0) {
        message += `*TROCO: ${formatPrice(data.change)}*\n`;
      }
    }
    
    message += `\n_Moonky - Sua loja digital_`;
    
    const whatsappNumber = data.customerPhone?.replace(/\D/g, "") || "";
    const whatsappUrl = whatsappNumber 
      ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Nota Fiscal de Serviço</DialogTitle>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Invoice Preview - Fixed width for 58mm thermal printer */}
        <div className="max-h-[60vh] overflow-y-auto">
          <div 
            ref={invoiceRef} 
            className="bg-white mx-auto"
            style={{ width: '220px', padding: '12px' }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <img
                src={moonkyLogo}
                alt="Moonky"
                className="h-8 brightness-0"
              />
            </div>

            {/* Establishment Name */}
            <h2 className="text-center font-bold text-xs text-black uppercase mb-2" style={{ fontFamily: 'monospace' }}>
              {data.establishment.name}
            </h2>

            {/* Dashed Divider */}
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Invoice info */}
            <div className="flex justify-between text-[10px] text-black mb-2" style={{ fontFamily: 'monospace' }}>
              <span>Nº {data.invoiceNumber}</span>
              <span>{formatDate(data.date)}</span>
            </div>

            {/* Customer */}
            {data.customerName && (
              <>
                <div className="text-[10px] font-bold text-black mb-1" style={{ fontFamily: 'monospace' }}>
                  CLIENTE
                </div>
                <div className="text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                  {data.customerName}
                </div>
                {data.customerPhone && (
                  <div className="text-[10px] text-black mb-2" style={{ fontFamily: 'monospace' }}>
                    {data.customerPhone}
                  </div>
                )}
                <div className="border-t border-dashed border-gray-400 my-2" />
              </>
            )}

            {/* Items Header */}
            <div className="text-[10px] font-bold text-black mb-1" style={{ fontFamily: 'monospace' }}>
              ITENS
            </div>

            {/* Items */}
            <div className="space-y-1 mb-2">
              {data.items && data.items.length > 0 ? (
                data.items.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                      <span className="flex-1 truncate pr-1" style={{ maxWidth: '120px' }}>{item.name}</span>
                      <span className="w-6 text-center">{item.quantity}x</span>
                      <span className="w-14 text-right">{formatPrice(item.totalPrice)}</span>
                    </div>
                    {item.specifications && Object.keys(item.specifications).length > 0 && (
                      <div className="text-[8px] text-gray-600 ml-1 mb-0.5" style={{ fontFamily: 'monospace' }}>
                        {Object.entries(item.specifications).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>
                  Nenhum item
                </div>
              )}
            </div>

            {/* Dashed Divider */}
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                <span>Subtotal</span>
                <span>{formatPrice(data.subtotal)}</span>
              </div>
              
              {(data.deliveryFee ?? 0) > 0 && (
                <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                  <span>Entrega</span>
                  <span>{formatPrice(data.deliveryFee!)}</span>
                </div>
              )}
              
              {data.discount > 0 && (
                <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                  <span>Desconto</span>
                  <span>-{formatPrice(data.discount)}</span>
                </div>
              )}
            </div>

            {/* Total Line */}
            <div className="border-t border-black my-2" />
            
            <div className="flex justify-between font-bold text-xs text-black" style={{ fontFamily: 'monospace' }}>
              <span>TOTAL</span>
              <span>{formatPrice(data.total)}</span>
            </div>

            {/* Dashed Divider */}
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Payment */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                <span>Pagamento</span>
                <span>{data.paymentMethod}</span>
              </div>
              
              {data.cashAmount && data.cashAmount > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-black" style={{ fontFamily: 'monospace' }}>
                    <span>Valor Pago</span>
                    <span>{formatPrice(data.cashAmount)}</span>
                  </div>
                  {data.change && data.change > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-black" style={{ fontFamily: 'monospace' }}>
                      <span>TROCO</span>
                      <span>{formatPrice(data.change)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Observations */}
            {data.orderObservations && (
              <>
                <div className="border-t border-dashed border-gray-400 my-2" />
                <div className="text-[10px] font-bold text-black mb-1" style={{ fontFamily: 'monospace' }}>
                  OBSERVAÇÕES
                </div>
                <div className="text-[9px] text-black break-words" style={{ fontFamily: 'monospace' }}>
                  {data.orderObservations}
                </div>
              </>
            )}

            {/* Dashed Divider */}
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Footer */}
            <div className="text-center space-y-0.5">
              {data.establishment.whatsapp && (
                <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>
                  WhatsApp: {data.establishment.whatsapp}
                </p>
              )}
              {data.establishment.email && (
                <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>
                  {data.establishment.email}
                </p>
              )}
              <p className="text-[8px] text-gray-400 pt-1" style={{ fontFamily: 'monospace' }}>
                Moonky - Sua loja digital
              </p>
            </div>

            {/* Cut Line */}
            <div className="text-center text-[8px] text-gray-400 mt-3 pt-2 border-t border-dashed border-gray-300" style={{ fontFamily: 'monospace' }}>
              - - - - - - - - - - - - - - - -
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 border-t bg-muted/30 grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={shareViaWhatsApp}
          >
            <WhatsAppIcon className="h-3.5 w-3.5 mr-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Imprimir
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={downloadInvoice}
            disabled={isDownloading}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {isDownloading ? "..." : "Baixar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceInvoice;
