import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffLoginSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ArrowLeft, User, Lock } from "lucide-react";
import { z } from "zod";

type StaffLoginData = z.infer<typeof staffLoginSchema>;

interface StaffLoginProps {
  onViewChange: (view: string) => void;
}

export default function StaffLogin({ onViewChange }: StaffLoginProps) {
  const { toast } = useToast();
  const { setStaff } = useAuth();

  const form = useForm<StaffLoginData>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: StaffLoginData) => {
      return apiRequest('POST', '/api/staff/login', data);
    },
    onSuccess: (data) => {
      setStaff(data);
      onViewChange('staff-dashboard');
      toast({
        title: "Login Successful",
        description: "Welcome to the staff dashboard.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffLoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="absolute -top-12 left-0 text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => onViewChange('role-selection')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Role Selection
        </Button>

        {/* Main Form Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Staff Login</h1>
            <p className="text-white/70">Access the administrative dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/90 flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-red-400 focus:ring-red-400/20"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-red-300 text-sm">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-red-400 focus:ring-red-400/20"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-red-300 text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-200"
            >
              {loginMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Signing In...
                </div>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Login Hint */}
          <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="text-red-200 text-sm text-center">
              Use your assigned staff credentials to access the dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}