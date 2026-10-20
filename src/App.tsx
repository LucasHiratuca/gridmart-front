import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { DoorPage } from "@/pages/door/DoorPage";
import { KioskPage } from "@/pages/kiosk/KioskPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { ExitPage } from "@/pages/exit/ExitPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Porta: QR colado na porta da loja aponta pra cá */}
          <Route path="/" element={<DoorPage />} />

          {/* QR de saída gerado no totem, lido no celular pela porta */}
          <Route path="/exit" element={<ExitPage />} />

          {/* Tablet travado no caixa */}
          <Route path="/kiosk" element={<KioskPage />} />

          {/* Painel do lojista (desktop) */}
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
