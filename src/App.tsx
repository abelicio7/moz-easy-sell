import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NewProduct from "./pages/NewProduct";
import EditProduct from "./pages/EditProduct";
import Orders from "./pages/Orders";
import Sales from "./pages/Sales";
import Integrations from "./pages/Integrations";
import Finance from "./pages/Finance";
import QuizDashboard from "./pages/quizzes/QuizDashboard";
import EditQuiz from "./pages/quizzes/EditQuiz";
import TakeQuiz from "./pages/quizzes/TakeQuiz";
import Checkout from "./pages/Checkout";
import PaymentInstructions from "./pages/PaymentInstructions";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import AdminRoute from "@/components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        window.location.href = "/reset-password";
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawals /></AdminRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/dashboard/products/new" element={<ProtectedRoute><NewProduct /></ProtectedRoute>} />
          <Route path="/dashboard/products/:id/edit" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
          <Route path="/dashboard/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/dashboard/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/dashboard/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
          <Route path="/dashboard/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/dashboard/quizzes" element={<ProtectedRoute><QuizDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/quizzes/:id/edit" element={<ProtectedRoute><EditQuiz /></ProtectedRoute>} />
          <Route path="/quiz/:slug" element={<TakeQuiz />} />
          <Route path="/checkout/:productId" element={<Checkout />} />
          <Route path="/checkout/:productId/payment" element={<PaymentInstructions />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
