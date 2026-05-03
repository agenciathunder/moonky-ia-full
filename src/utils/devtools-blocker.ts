// DevTools blocker utility
export const initDevToolsBlocker = () => {
  // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Cmd+Option+I (Mac DevTools)
    if (e.metaKey && e.altKey && e.key === 'i') {
      e.preventDefault();
      return false;
    }
    
    // Cmd+Option+J (Mac Console)
    if (e.metaKey && e.altKey && e.key === 'j') {
      e.preventDefault();
      return false;
    }
    
    // Cmd+Option+C (Mac Inspect)
    if (e.metaKey && e.altKey && e.key === 'c') {
      e.preventDefault();
      return false;
    }
    
    // Cmd+U (Mac View Source)
    if (e.metaKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
  });

  // Block right-click context menu
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection on critical elements (optional, less aggressive)
  document.addEventListener('selectstart', (e: Event) => {
    const target = e.target as HTMLElement;
    // Allow selection in inputs, textareas, and contenteditable
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return true;
    }
    // For other elements, prevent selection
    return true; // Allow selection for usability
  });

  // Console warning
  const warningStyle = 'color: red; font-size: 24px; font-weight: bold;';
  console.log('%cAtenção!', warningStyle);
  console.log('%cEste é um recurso do navegador destinado a desenvolvedores.', 'font-size: 14px;');
};
