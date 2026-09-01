import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="editorial-shell flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-[#c5c0ff] hover:text-[#ffb59e] underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
