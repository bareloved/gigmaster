"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GigContact, GigContactInsert, MusicianContact } from "@/lib/types/shared";
import type { LineupMember } from "@/lib/gigpack/types";

interface GigContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<GigContactInsert, 'gigId' | 'sortOrder'>) => void;
  lineup?: LineupMember[];
  contacts?: MusicianContact[];
  editingContact?: GigContact | null;
}

interface FormData {
  label: string;
  name: string;
  phone: string;
  email: string;
}

export function GigContactForm({
  open,
  onOpenChange,
  onSubmit,
  lineup = [],
  contacts = [],
  editingContact,
}: GigContactFormProps) {
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [selectedSource, setSelectedSource] = useState<{
    type: 'lineup' | 'contact';
    id: string;
    name: string;
    phone?: string;
    email?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      label: "",
      name: "",
      phone: "",
      email: "",
    },
  });

  // Reset form when dialog opens/closes or editingContact changes
  useEffect(() => {
    if (open) {
      if (editingContact) {
        setValue("label", editingContact.label);
        setValue("name", editingContact.name);
        setValue("phone", editingContact.phone || "");
        setValue("email", editingContact.email || "");
        setActiveTab("manual");
        setSelectedSource(null);
      } else {
        reset({ label: "", name: "", phone: "", email: "" });
        setSelectedSource(null);
      }
    }
  }, [open, editingContact, setValue, reset]);

  const handleSourceSelect = (source: typeof selectedSource) => {
    if (!source) return;
    setSelectedSource(source);
    setValue("name", source.name);
    setValue("phone", source.phone || "");
    setValue("email", source.email || "");
  };

  const phoneValue = watch("phone");
  const emailValue = watch("email");

  const onFormSubmit = (data: FormData) => {
    if (!data.phone && !data.email) {
      return; // Validation handled below
    }

    onSubmit({
      label: data.label,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      sourceType: selectedSource?.type || "manual",
      sourceId: selectedSource?.id || null,
    });

    reset();
    setSelectedSource(null);
    setActiveTab("manual");
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setSelectedSource(null);
    setActiveTab("manual");
    onOpenChange(false);
  };

  const hasContactMethod = !!phoneValue || !!emailValue;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {!editingContact && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lineup">From Lineup</TabsTrigger>
                <TabsTrigger value="circle">My Circle</TabsTrigger>
                <TabsTrigger value="manual">New Person</TabsTrigger>
              </TabsList>

              <TabsContent value="lineup" className="space-y-2 mt-4">
                {lineup.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No lineup members yet
                  </p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {lineup.filter(m => m.name).map((member, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          handleSourceSelect({
                            type: "lineup",
                            id: member.gigRoleId || `lineup-${idx}`,
                            name: member.name || "",
                            phone: undefined,
                            email: undefined,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent ${
                          selectedSource?.id === (member.gigRoleId || `lineup-${idx}`)
                            ? "bg-accent"
                            : ""
                        }`}
                      >
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.role}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="circle" className="space-y-2 mt-4">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No contacts in My Circle
                  </p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() =>
                          handleSourceSelect({
                            type: "contact",
                            id: contact.id,
                            name: contact.contact_name,
                            phone: contact.phone || undefined,
                            email: contact.email || undefined,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent ${
                          selectedSource?.id === contact.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="font-medium">{contact.contact_name}</div>
                        {(contact.phone || contact.email) && (
                          <div className="text-xs text-muted-foreground">
                            {contact.phone || contact.email}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                {/* Form fields shown below for all tabs */}
              </TabsContent>
            </Tabs>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">
                Role/Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                placeholder="e.g., Venue Manager, MD, Production"
                {...register("label", { required: "Label is required" })}
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contact name"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="054-555-1234"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                {...register("email")}
              />
            </div>

            {!hasContactMethod && (
              <p className="text-xs text-destructive">
                At least one of phone or email is required.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!hasContactMethod}>
              {editingContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
