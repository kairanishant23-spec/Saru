import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, BarChart3, Package } from "lucide-react";
import logo from "/logo.png";

export default function Login() {
  const [email, setEmail] = useState("admin@himsaru.com");
  const [password, setPassword] = useState("admin123");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useLogin();
  const { data: user, isLoading } = useGetMe();

  useEffect(() => {
    if (user) setLocation("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: async () => {
          toast({ title: "Welcome back!" });
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({
            title: "Login failed",
            description: err.message || "Invalid email or password",
            variant: "destructive",
          });
        },
      }
    );
  };

  const features = [
    { icon: Package, text: "Inventory & product management" },
    { icon: BarChart3, text: "Sales, purchases & reports" },
    { icon: ShieldCheck, text: "Accounts, GST & cash book" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">

      {/* ── Left panel — forest green branding (desktop) / top banner (mobile) ── */}
      <div className="lg:w-[46%] bg-sidebar flex flex-col relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-10 w-36 h-36 rounded-full bg-accent/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-10 min-h-[200px] lg:min-h-0">

          {/* Logo + brand */}
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Himsaru Logo"
              className="w-14 h-14 lg:w-20 lg:h-20 object-contain flex-shrink-0 drop-shadow-lg"
            />
            <div>
              <div className="font-bold text-sidebar-foreground text-xl lg:text-2xl tracking-wide">HIMSARU</div>
              <div className="text-[11px] text-sidebar-foreground/50 uppercase tracking-widest">ERP System</div>
            </div>
          </div>

          {/* Headline — hidden on small mobile, shown md+ */}
          <div className="hidden sm:block space-y-6 py-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-sidebar-foreground leading-tight">
                Manage your business<br />
                <span className="text-accent">smarter, faster.</span>
              </h2>
              <p className="mt-3 text-sidebar-foreground/60 text-sm leading-relaxed">
                A complete ERP built for Indian trading &amp; wholesale businesses — with GST, inventory, and accounts built in.
              </p>
            </div>

            <div className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-sm text-sidebar-foreground/75">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer — desktop only */}
          <div className="hidden lg:block text-[11px] text-sidebar-foreground/35">
            © {new Date().getFullYear()} Himsaru Enterprises · Himachal Pradesh
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-7">

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your ERP account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground/80 text-xs font-semibold uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="h-11 bg-card border-border focus-visible:ring-accent text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground/80 text-xs font-semibold uppercase tracking-wide">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11 bg-card border-border focus-visible:ring-accent text-base"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground">
            Default: admin@himsaru.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
