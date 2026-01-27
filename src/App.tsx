import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TopicDetail from "./pages/TopicDetail";
import { ThemeProvider as NextThemesProvider } from "next-themes"; // Changed import to NextThemesProvider
import { ThemeToggle } from "@/components/ThemeToggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider defaultTheme="system" storageKey="vite-ui-theme" attribute="class"> {/* Used NextThemesProvider directly with attribute="class" */}
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="relative min-h-screen flex flex-col">
            <div className="absolute top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:topicSlug" element={<TopicDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;