import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearAuth, isLoggedIn } from "@/lib/auth";

export function Header({ accountHolder }: { accountHolder?: string }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  function handleHome() {
    navigate(isLoggedIn() ? "/" : "/login");
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <button
          type="button"
          onClick={handleHome}
          className="flex items-center gap-2 transition-opacity hover:opacity-70 sm:gap-3"
        >
          <img src="/logo-full.svg" alt="NexBridge" className="h-7 sm:h-8" />
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <span className="hidden text-muted-foreground text-sm sm:inline">インターネットバンキング</span>
        </button>
        {accountHolder && (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-muted-foreground text-sm sm:inline">{accountHolder} 様</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
