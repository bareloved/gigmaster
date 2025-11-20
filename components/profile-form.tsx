"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/lib/utils/phone";
import type { User } from "@supabase/supabase-js";

interface ProfileFormProps {
  profile: {
    id: string;
    name: string | null;
    main_instrument: string | null;
    email: string | null;
    phone: string | null;
    default_country_code: string | null;
  } | null;
  user: User;
}

export function ProfileForm({ profile, user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile?.name || "");
  const [instrument, setInstrument] = useState(profile?.main_instrument || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [countryCode, setCountryCode] = useState(profile?.default_country_code || "+972");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        main_instrument: instrument,
        phone: phone || null,
        default_country_code: countryCode,
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={user.email} disabled />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instrument">Main Instrument</Label>
        <Input
          id="instrument"
          type="text"
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          disabled={loading}
          placeholder="e.g., Keys, Drums, Bass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="countryCode">Default Country Code</Label>
        <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
          <SelectTrigger id="countryCode">
            <SelectValue placeholder="Select country code" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((code) => (
              <SelectItem key={code.value} value={code.value}>
                {code.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This will be used as the default for all phone number inputs throughout the app.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number (for WhatsApp)</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          placeholder="501234567"
        />
        <p className="text-xs text-muted-foreground">
          Optional. Enter just the number (country code will be added automatically based on your default above).
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

