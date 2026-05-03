// App entry point - v5 (subdomain + path routing)
import { Suspense, lazy, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { EstablishmentProvider } from "@/contexts/EstablishmentContext";
import LoadingScreen from "@/components/LoadingScreen";
import CartFloatingBar from "@/components/CartFloatingBar";
import StoreRouteGate from "@/components/StoreRouteGate";
import ActivityTracker from "@/components/ActivityTracker";
import { getSubdomainSlug, getStoreUrl } from "@/utils/subdomain";

// Critical pages loaded eagerly
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";

// Lazy loaded pages for better initial load
const Auth = lazy(() => import("./pages/Auth"));
const StoreAuth = lazy(() => import("./pages/StoreAuth"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminMaster = lazy(() => import("./pages/AdminMaster"));
const Offers = lazy(() => import("./pages/Offers"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const BrandProducts = lazy(() => import("./pages/BrandProducts"));
const CategoryProducts = lazy(() => import("./pages/CategoryProducts"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const Profile = lazy(() => import("./pages/Profile"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StoreLanding = lazy(() => import("./pages/StoreLanding"));

// Redirect component: /loja/:slug → subdomain
const StoreRedirect = () => {
  const slug = window.location.pathname.split('/').filter(Boolean)[1];
  if (slug) {
    window.location.href = getStoreUrl(slug) + window.location.pathname.replace(`/loja/${slug}`, '') + window.location.search;
    return <LoadingScreen />;
  }
  return <Navigate to="/" replace />;
};

// QueryClient with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const subdomainSlug = useMemo(() => getSubdomainSlug(), []);
  const isSubdomain = Boolean(subdomainSlug);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="moonky-theme">
          <AuthProvider>
            <BrowserRouter>
              <EstablishmentProvider>
                <CartProvider>
                  <CouponProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <ActivityTracker />
                      <Routes>
                        {isSubdomain ? (
                          <>
                            {/* Subdomain mode: store pages at root */}
                            <Route path="/" element={<StoreRouteGate><Index /></StoreRouteGate>} />
                            <Route path="/auth" element={<StoreRouteGate><StoreAuth /></StoreRouteGate>} />
                            <Route path="/offers" element={<StoreRouteGate><Offers /></StoreRouteGate>} />
                            <Route path="/cart" element={<StoreRouteGate><Cart /></StoreRouteGate>} />
                            <Route path="/checkout" element={<StoreRouteGate><Checkout /></StoreRouteGate>} />
                            <Route path="/product/:id" element={<StoreRouteGate><ProductDetails /></StoreRouteGate>} />
                            <Route path="/brand/:brandName" element={<StoreRouteGate><BrandProducts /></StoreRouteGate>} />
                            <Route path="/category/:categoryId" element={<StoreRouteGate><CategoryProducts /></StoreRouteGate>} />
                            <Route path="/favorites" element={<StoreRouteGate><Favorites /></StoreRouteGate>} />
                            <Route path="/orders" element={<StoreRouteGate><Orders /></StoreRouteGate>} />
                            <Route path="/orders/:id" element={<StoreRouteGate><OrderDetails /></StoreRouteGate>} />
                            <Route path="/profile" element={<StoreRouteGate><Profile /></StoreRouteGate>} />
                            <Route path="/tickets" element={<StoreRouteGate><MyTickets /></StoreRouteGate>} />
                            <Route path="/events" element={<StoreRouteGate><Events /></StoreRouteGate>} />
                            <Route path="/events/:id" element={<StoreRouteGate><EventDetails /></StoreRouteGate>} />
                            
                            {/* Admin routes still accessible on subdomain */}
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/admin-master" element={<AdminMaster />} />
                            
                            <Route path="*" element={<NotFound />} />
                          </>
                        ) : (
                          <>
                            {/* Main domain mode: landing + /loja/:slug paths */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/lojas" element={<StoreLanding />} />
                            
                            {/* Store routes (path-based) */}
                            <Route path="/loja/:slug" element={<StoreRouteGate><Index /></StoreRouteGate>} />
                            <Route path="/loja/:slug/auth" element={<StoreRouteGate><StoreAuth /></StoreRouteGate>} />
                            <Route path="/loja/:slug/offers" element={<StoreRouteGate><Offers /></StoreRouteGate>} />
                            <Route path="/loja/:slug/cart" element={<StoreRouteGate><Cart /></StoreRouteGate>} />
                            <Route path="/loja/:slug/checkout" element={<StoreRouteGate><Checkout /></StoreRouteGate>} />
                            <Route path="/loja/:slug/product/:id" element={<StoreRouteGate><ProductDetails /></StoreRouteGate>} />
                            <Route path="/loja/:slug/brand/:brandName" element={<StoreRouteGate><BrandProducts /></StoreRouteGate>} />
                            <Route path="/loja/:slug/category/:categoryId" element={<StoreRouteGate><CategoryProducts /></StoreRouteGate>} />
                            <Route path="/loja/:slug/favorites" element={<StoreRouteGate><Favorites /></StoreRouteGate>} />
                            <Route path="/loja/:slug/orders" element={<StoreRouteGate><Orders /></StoreRouteGate>} />
                            <Route path="/loja/:slug/orders/:id" element={<StoreRouteGate><OrderDetails /></StoreRouteGate>} />
                            <Route path="/loja/:slug/profile" element={<StoreRouteGate><Profile /></StoreRouteGate>} />
                            <Route path="/loja/:slug/tickets" element={<StoreRouteGate><MyTickets /></StoreRouteGate>} />
                            <Route path="/loja/:slug/events" element={<StoreRouteGate><Events /></StoreRouteGate>} />
                            <Route path="/loja/:slug/events/:id" element={<StoreRouteGate><EventDetails /></StoreRouteGate>} />
                            
                            {/* Global routes */}
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/admin-master" element={<AdminMaster />} />
                            
                            <Route path="*" element={<NotFound />} />
                          </>
                        )}
                      </Routes>
                      <CartFloatingBar />
                    </TooltipProvider>
                  </CouponProvider>
                </CartProvider>
              </EstablishmentProvider>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Suspense>
  );
};

export default App;
