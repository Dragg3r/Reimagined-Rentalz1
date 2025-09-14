import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ArrowLeft, Upload, User, IdCard, Mail, Phone, MapPin } from "lucide-react";
import { z } from "zod";

const registrationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(10, "Please enter your complete address"),
  icPassportNumber: z.string().min(1, "IC/Passport number is required"),
  socialMediaHandle: z.string().optional(),
});

type RegistrationData = z.infer<typeof registrationSchema>;

interface CustomerRegistrationProps {
  onViewChange: (view: string) => void;
}

export default function CustomerRegistration({ onViewChange }: CustomerRegistrationProps) {
  const [icPassportFile, setIcPassportFile] = useState<File | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [utilityBillFile, setUtilityBillFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      icPassportNumber: "",
      socialMediaHandle: "",
    },
    mode: "onChange",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const formData = new FormData();
      formData.append('fullName', data.fullName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('address', data.address);
      formData.append('icPassportNumber', data.icPassportNumber);
      if (data.socialMediaHandle) {
        formData.append('socialMediaHandle', data.socialMediaHandle);
      }
      if (icPassportFile) {
        formData.append('icPassport', icPassportFile);
      }
      if (driversLicenseFile) {
        formData.append('driversLicense', driversLicenseFile);
      }
      if (utilityBillFile) {
        formData.append('utilityBill', utilityBillFile);
      }

      const response = await fetch('/api/customers/register', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Your account has been created. You can now sign in.",
      });
      onViewChange('customer-login');
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("IC/Passport file:", icPassportFile);
    console.log("Driver's license file:", driversLicenseFile);
    console.log("Utility bill file:", utilityBillFile);
    
    if (!icPassportFile) {
      toast({
        title: "Missing Required File",
        description: "Please upload your IC/Passport image",
        variant: "destructive",
      });
      return;
    }

    if (!driversLicenseFile) {
      toast({
        title: "Missing Required File", 
        description: "Please upload your driver's license image",
        variant: "destructive",
      });
      return;
    }

    if (!utilityBillFile) {
      toast({
        title: "Missing Required File", 
        description: "Please upload your utility bill image",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIcPassportFile(file);
    }
  };

  const handleDriversLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDriversLicenseFile(file);
    }
  };

  const handleUtilityBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUtilityBillFile(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <UserPlus className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Let's start your Rental Journey</h2>
          <p className="text-slate-600">Create your account to begin</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <User className="mr-2" size={16} />
              Full Name (as per IC)
            </Label>
            <Input
              {...form.register('fullName')}
              className="input-glass"
              placeholder="Enter your full name"
            />
            {form.formState.errors.fullName && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <IdCard className="mr-2" size={16} />
              IC / Passport Number
            </Label>
            <Input
              {...form.register('icPassportNumber')}
              className="input-glass"
              placeholder="Enter your IC or Passport number"
            />
            {form.formState.errors.icPassportNumber && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.icPassportNumber.message}</p>
            )}
          </div>


          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Mail className="mr-2" size={16} />
              Email Address
            </Label>
            <Input
              {...form.register('email')}
              type="email"
              className="input-glass"
              placeholder="This will be your username"
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Phone className="mr-2" size={16} />
              Phone Number
            </Label>
            <Input
              {...form.register('phone')}
              type="tel"
              className="input-glass"
              placeholder="+60 12-345-6789"
            />
            {form.formState.errors.phone && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <MapPin className="mr-2" size={16} />
              Current Address
            </Label>
            <Textarea
              {...form.register('address')}
              rows={3}
              className="input-glass"
              placeholder="Enter your complete address"
            />
            {form.formState.errors.address && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.address.message}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <IdCard className="mr-2" size={16} />
              Instagram Username or Facebook ID (Optional)
            </Label>
            <Input
              {...form.register('socialMediaHandle')}
              className="input-glass"
              placeholder="@your_instagram or facebook.com/yourname"
            />
            <p className="text-xs text-slate-500 mt-1">This helps us verify your identity</p>
            {form.formState.errors.socialMediaHandle && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.socialMediaHandle.message}</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Upload className="mr-2" size={16} />
              Upload IC / Passport Front Page
            </Label>
            <div className="glass-dark rounded-xl p-6 border-2 border-dashed border-slate-300 text-center">
              <Upload className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mb-4">Image will be automatically compressed and watermarked</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="ic-upload"
              />
              <Label htmlFor="ic-upload" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
                {icPassportFile ? icPassportFile.name : 'Choose File'}
              </Label>
            </div>
            {!icPassportFile && (
              <p className="text-red-500 text-xs mt-1">IC/Passport image is required</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Upload className="mr-2" size={16} />
              Upload Driver's License (Front & Back)
            </Label>
            <div className="glass-dark rounded-xl p-6 border-2 border-dashed border-slate-300 text-center">
              <Upload className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mb-4">Image will be automatically compressed and watermarked</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleDriversLicenseChange}
                className="hidden"
                id="license-upload"
              />
              <Label htmlFor="license-upload" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
                {driversLicenseFile ? driversLicenseFile.name : 'Choose File'}
              </Label>
            </div>
            {!driversLicenseFile && (
              <p className="text-red-500 text-xs mt-1">Driver's license image is required</p>
            )}
          </div>

          <div>
            <Label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
              <Upload className="mr-2" size={16} />
              Upload Utility Bill (TNB/Water/Internet)
            </Label>
            <div className="glass-dark rounded-xl p-6 border-2 border-dashed border-slate-300 text-center">
              <Upload className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mb-4">Image will be automatically compressed and watermarked</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleUtilityBillChange}
                className="hidden"
                id="utility-upload"
              />
              <Label htmlFor="utility-upload" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
                {utilityBillFile ? utilityBillFile.name : 'Choose File'}
              </Label>
            </div>
            {!utilityBillFile && (
              <p className="text-red-500 text-xs mt-1">Utility bill image is required</p>
            )}
          </div>

          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => onViewChange('role-selection')}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back
            </Button>
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="flex-1 btn-gradient"
            >
              <UserPlus className="mr-2" size={16} />
              {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
