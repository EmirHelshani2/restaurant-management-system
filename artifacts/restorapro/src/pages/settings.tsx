import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  restaurantName: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  taxRate: z.coerce.number().min(0).max(100),
  serviceChargeRate: z.coerce.number().min(0).max(100),
  receiptFooter: z.string().optional(),
});

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      restaurantName: "",
      address: "",
      phone: "",
      currency: "USD",
      taxRate: 0,
      serviceChargeRate: 0,
      receiptFooter: "",
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        restaurantName: settings.restaurantName,
        address: settings.address || "",
        phone: settings.phone || "",
        currency: settings.currency,
        taxRate: settings.taxRate,
        serviceChargeRate: settings.serviceChargeRate,
        receiptFooter: settings.receiptFooter || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettingsMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update settings", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Manage global restaurant configuration</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Info</CardTitle>
              <CardDescription>Basic information displayed on receipts and screens.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <FormField control={form.control} name="restaurantName" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Restaurant Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing & Taxes</CardTitle>
              <CardDescription>Configure standard rates applied to all orders.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <FormField control={form.control} name="taxRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="serviceChargeRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Charge (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="receiptFooter" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Receipt Footer Message</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Thank you for dining with us!" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
