import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.status === "blocked" || profile?.status === "suspended") {
          toast.error("Sua conta foi suspensa ou bloqueada. Entre em contato com o suporte.");
          setIsAllowed(false);
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error("Error checking profile status in ProtectedRoute:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    if (!authLoading) {
      checkUserStatus();
    }
  }, [user, authLoading]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAllowed) return <Navigate to="/login" replace />;

  const deviceToken = localStorage.getItem("ensina_device_token");
  if (!deviceToken) {
    return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
