import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Try to extract establishment slug from URL
  const pathParts = location.pathname.split('/');
  const isStorePath = pathParts[1] === 'loja' && pathParts[2];
  const storeSlug = isStorePath ? pathParts[2] : null;

  const handleGoBack = () => {
    // Check if there's a real previous page in history (more than just the current 404 page)
    if (window.history.length > 2) {
      navigate(-1);
    } else if (storeSlug) {
      navigate(`/loja/${storeSlug}`);
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    if (storeSlug) {
      navigate(`/loja/${storeSlug}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-medium text-foreground">Página não encontrada</p>
        <p className="mb-8 text-muted-foreground">
          Desculpe, a página que você está procurando não existe ou foi removida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleGoBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button onClick={handleGoHome} className="gap-2">
            <Home className="w-4 h-4" />
            Ir para o Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
