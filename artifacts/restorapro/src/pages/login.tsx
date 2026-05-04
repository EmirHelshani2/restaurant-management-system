import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      authenticate(response.token, response.user);
      
      // Route based on role
      const role = response.user.role;
      if (role === "kitchen") setLocation("/kitchen");
      else if (role === "bar") setLocation("/bar");
      else if (role === "waiter") setLocation("/waiter");
      else if (role === "cashier") setLocation("/cashier");
      else setLocation("/dashboard");
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.data?.error || "Invalid credentials",
      });
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl border border-sidebar-border overflow-hidden">
        <div className="p-8 text-center bg-sidebar-accent">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">RestoraPro</h1>
          <p className="text-sm text-muted-foreground mt-1">Professional Restaurant Management</p>
        </div>
        
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-4">
                <p>Demo accounts:</p>
                <p>admin@example.com / password</p>
                <p>waiter@example.com / password</p>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
