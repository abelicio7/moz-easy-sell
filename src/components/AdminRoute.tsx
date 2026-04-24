import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      if (!authLoading) setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      setIsAdmin(data?.role === "admin");
    };

    checkAdmin();
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const deviceToken = localStorage.getItem("ensina_device_token");
  if (!deviceToken) {
    return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
