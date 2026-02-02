"use client";

import { useState, useRef } from "react";
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
import { RoleSelect } from "@/components/gigpack/ui/role-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COUNTRY_CODES } from "@/lib/utils/phone";
import { uploadAvatar, getUserInitials } from "@/lib/utils/avatar";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useUser } from "@/lib/providers/user-provider";

interface ProfileFormProps {
  profile: {
    id: string;
    name: string | null;
    main_instrument: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    default_country_code: string | null;
  } | null;
  user: User;
}

export function ProfileForm({ profile, user }: ProfileFormProps) {
  const router = useRouter();
  const { refetch: refetchUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.name || "");
  const [instrument, setInstrument] = useState(profile?.main_instrument || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [countryCode, setCountryCode] = useState(profile?.default_country_code || "+972");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const publicUrl = await uploadAvatar(user.id, file);
      
      // Add cache-busting timestamp to force browser to reload image
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      
      // Update profile with new avatar URL (without cache buster in DB)
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        // Update local state with cache-busted URL for immediate display
        setAvatarUrl(cacheBustedUrl);
        setMessage({ type: "success", text: "Avatar updated successfully!" });
        
        // Refetch user data from UserProvider to update avatar everywhere
        await refetchUser();
        
        // Refresh the page to ensure all components update
        router.refresh();
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to upload avatar" 
      });
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

      {/* Avatar Upload Section */}
      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <div className="relative w-20 h-20">
          <Avatar 
            className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => fileInputRef.current?.click()}
          >
            <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
            <AvatarFallback className="text-lg">
              {getUserInitials(name)}
            </AvatarFallback>
          </Avatar>
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full h-20 w-20">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
            disabled={uploadingAvatar}
          />
        </div>
      </div>

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
        <Label>Main Instrument</Label>
        <RoleSelect
          value={instrument}
          onChange={setInstrument}
          disabled={loading}
          className="h-9"
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

