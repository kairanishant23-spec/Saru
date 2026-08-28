import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, X, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState("");
  const [businessLegalName, setBusinessLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName ?? "");
      setBusinessLegalName(settings.businessLegalName ?? "");
      setGstin(settings.gstin ?? "");
      setAddress(settings.address ?? "");
      setCity(settings.city ?? "");
      setState(settings.state ?? "");
      setPincode(settings.pincode ?? "");
      setPhone(settings.phone ?? "");
      setEmail(settings.email ?? "");
      setLogoPreview(settings.logoData ?? null);
    }
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (PNG, JPG, etc.)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
      setLogoChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoChanged(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    if (!businessName.trim()) {
      toast({ title: "Validation Error", description: "Business name is required", variant: "destructive" });
      return;
    }

    updateSettings.mutate({
      data: {
        businessName: businessName.trim(),
        businessLegalName: businessLegalName || null,
        gstin: gstin || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        phone: phone || null,
        email: email || null,
        ...(logoChanged ? { logoData: logoPreview } : {}),
      },
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved", description: "Business details updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        setLogoChanged(false);
      },
      onError: (err) => {
        toast({ title: "Failed to save settings", description: err.message || "Please try again", variant: "destructive" });
      },
    });
  };

  const currentLogo = logoPreview || "/logo.png";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-sm text-muted-foreground">Update your business name, GST number, logo, and contact details.</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {updateSettings.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading settings…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Business Logo
            </h2>

            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                <img
                  src={currentLogo}
                  alt="Business Logo"
                  className="w-full h-full object-contain p-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">PNG, JPG up to 2MB. Appears on invoices and sidebar.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {/* Business Details Card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 space-y-5">
            <h2 className="text-base font-semibold border-b border-border pb-3">Business Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Business Display Name <span className="text-destructive">*</span></Label>
                <Input
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. HIMSARU"
                />
                <p className="text-xs text-muted-foreground">Shown in sidebar and app header</p>
              </div>

              <div className="space-y-2">
                <Label>Legal / Registered Name</Label>
                <Input
                  value={businessLegalName}
                  onChange={e => setBusinessLegalName(e.target.value)}
                  placeholder="e.g. Himsaru Traders Pvt. Ltd."
                />
                <p className="text-xs text-muted-foreground">Shown on tax invoices</p>
              </div>

              <div className="space-y-2">
                <Label>GSTIN (GST Number)</Label>
                <Input
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 02AABCH1234A1Z5"
                  maxLength={15}
                  className="font-mono uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  type="tel"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street address, village, colony…"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>City / Tehsil</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Nalagarh" />
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Himachal Pradesh" />
              </div>

              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="e.g. 174101" maxLength={6} />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. info@himsaru.com" type="email" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
