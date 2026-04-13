import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MapPin, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
        <MapPin className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h1 className="text-5xl font-extrabold text-foreground mb-2">404</h1>
      <p className="text-base text-muted-foreground mb-6 max-w-xs leading-relaxed">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
      >
        <Home className="h-4 w-4" />
        Voltar ao início
      </Link>
    </div>
  );
};

export default NotFound;
