import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Camera, Car, Fuel, FileText, ArrowLeft, ArrowRight, 
  Signature, CheckCircle2, Upload, Download, MessageCircle, 
  Eye, ExternalLink
} from "lucide-react";
import SignaturePad from "@/components/ui/signature-pad";

const rentalCompletionSchema = z.object({
  currentMileage: z.number().min(0, "Current mileage must be 0 or greater"),
  fuelLevel: z.number().min(0).max(8),
  color: z.string().min(1, "Vehicle color is required"),
  // Pricing fields
  rentalPerDay: z.number().min(0, "Rental per day must be 0 or greater"),
  totalDays: z.number().min(1, "Total days must be at least 1"),
  deposit: z.number().min(0, "Deposit must be 0 or greater"),
  discount: z.number().min(0, "Discount must be 0 or greater").default(0),
  grandTotal: z.number().min(0, "Grand total must be 0 or greater"),
  mileageLimit: z.number().min(0, "Mileage limit must be 0 or greater"),
  extraMileageCharge: z.number().min(0, "Extra mileage charge must be 0 or greater"),
});

type RentalCompletionData = z.infer<typeof rentalCompletionSchema>;

interface RentalCompletionFormProps {
  rentalId: number;
  customer: {
    id: number;
    fullName: string;
    email: string;
  };
  onComplete: () => void;
  onCancel: () => void;
}

const photoTypes = [
  { id: 'front_with_customer', label: 'Front With Customer', icon: '👥' },
  { id: 'front', label: 'Front', icon: '🚗' },
  { id: 'back', label: 'Back', icon: '🚙' },
  { id: 'left', label: 'Left Side', icon: '⬅️' },
  { id: 'right', label: 'Right Side', icon: '➡️' },
  { id: 'interior_mileage', label: 'Interior/Mileage', icon: '🏎️' },
  { id: 'known_damage', label: 'Known Damage', icon: '⚠️' },
];

const fuelLevels = ['Empty', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'Full'];

const availableColors = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Purple', 'Gold'
];

export default function RentalCompletionForm({ 
  rentalId, 
  customer, 
  onComplete, 
  onCancel 
}: RentalCompletionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);
  
  const { toast } = useToast();

  const form = useForm<RentalCompletionData>({
    resolver: zodResolver(rentalCompletionSchema),
    defaultValues: {
      currentMileage: 0,
      fuelLevel: 8, // Default to full tank
      color: "",
      // Pricing defaults
      rentalPerDay: 0,
      totalDays: 1,
      deposit: 0,
      discount: 0,
      grandTotal: 0,
      mileageLimit: 150,
      extraMileageCharge: 0.50,
    },
  });

  const handleVehiclePhotoChange = async (index: number, file: File) => {
    try {
      // Import compression utility
      const { compressImageDetailed } = await import('@/lib/imageCompression');
      
      // Compress the image before setting it
      console.log(`Compressing vehicle photo ${index}:`, file.name);
      const result = await compressImageDetailed(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
        maxSizeInMB: 0.5 // Smaller target for multiple photos
      });
      
      if (!result.success) {
        throw new Error(`Could not compress image to target size after ${result.iterations} iterations`);
      }
      
      const newPhotos = [...vehiclePhotos];
      newPhotos[index] = result.file;
      setVehiclePhotos(newPhotos);
      
      toast({
        title: "Photo Compressed",
        description: `Photo compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(result.finalSize / 1024 / 1024).toFixed(2)}MB (${result.compressionRatio.toFixed(1)}x smaller)`,
      });
    } catch (error) {
      console.error('Image compression failed:', error);
      toast({
        title: "Compression Failed", 
        description: "Using original image. File might be large for upload.",
        variant: "destructive",
      });
      
      // Fallback to original file
      const newPhotos = [...vehiclePhotos];
      newPhotos[index] = file;
      setVehiclePhotos(newPhotos);
    }
  };

  const completeRentalMutation = useMutation({
    mutationFn: async (data: RentalCompletionData) => {
      setIsSubmitting(true);
      const formData = new FormData();
      
      // Add form fields
      formData.append('currentMileage', data.currentMileage.toString());
      formData.append('fuelLevel', data.fuelLevel.toString());
      formData.append('color', data.color);
      formData.append('customerId', customer.id.toString());
      
      // Add pricing fields
      formData.append('rentalPerDay', data.rentalPerDay.toString());
      formData.append('totalDays', data.totalDays.toString());
      formData.append('deposit', data.deposit.toString());
      formData.append('discount', data.discount.toString());
      formData.append('grandTotal', data.grandTotal.toString());
      formData.append('mileageLimit', data.mileageLimit.toString());
      formData.append('extraMileageCharge', data.extraMileageCharge.toString());

      // Add vehicle photos
      vehiclePhotos.forEach((photo, index) => {
        if (photo) {
          formData.append('vehiclePhotos', photo);
        }
      });
      
      // Add payment proof if provided
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }
      
      // Add signature
      if (signatureData) {
        formData.append('signatureData', signatureData);
      }

      console.log("Submitting to API:", `/api/staff/rentals/${rentalId}/complete`);
      
      const response = await fetch(`/api/staff/rentals/${rentalId}/complete`, {
        method: 'PATCH',
        body: formData,
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Failed to complete rental: ${response.status} ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      toast({
        title: "Rental Agreement Completed! 🎉",
        description: data.message || "The rental agreement has been generated and sent to the customer.",
      });
      
      // If we have PDF data, show download options
      if (data.pdfUrl) {
        setPdfData(data);
        setShowPdfDialog(true);
      } else {
        onComplete();
      }
    },
    onError: (error: Error) => {
      console.error("Rental completion error:", error);
      toast({
        title: "Completion Failed",
        description: error.message || "Failed to complete rental. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = (data: RentalCompletionData) => {
    console.log("Form submission data:", data);
    console.log("Signature data:", signatureData);

    if (!signatureData) {
      toast({
        title: "Signature Required",
        description: "Please provide customer signature to complete the rental.",
        variant: "destructive",
      });
      return;
    }

    // Calculate grand total and validate it's not negative
    const subtotal = (data.rentalPerDay || 0) * (data.totalDays || 1);
    const calculatedGrandTotal = subtotal + (data.deposit || 0) - (data.discount || 0);
    
    if (calculatedGrandTotal < 0) {
      toast({
        title: "Invalid Pricing",
        description: "The discount cannot be greater than the subtotal plus deposit.",
        variant: "destructive",
      });
      return;
    }

    const finalData = { ...data, grandTotal: calculatedGrandTotal };
    
    console.log("Final data being submitted:", finalData);
    completeRentalMutation.mutate(finalData);
  };

  const onInvalid = (errors: any) => {
    console.log("Form validation errors:", errors);
    
    // Find the first error to focus on
    const firstErrorField = Object.keys(errors)[0];
    const firstError = errors[firstErrorField];
    
    toast({
      title: "Form Validation Failed",
      description: firstError?.message || "Please fix the highlighted errors before submitting.",
      variant: "destructive",
    });

    // Focus the first invalid field
    const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
    if (element) {
      element.focus();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="glass">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Car className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl">Vehicle Details</CardTitle>
              <p className="text-slate-600">Record vehicle color and current mileage</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Vehicle Color</Label>
                <select 
                  {...form.register('color')}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vehicle color</option>
                  {availableColors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                {form.formState.errors.color && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.color.message}</p>
                )}
              </div>

              <div>
                <Label>Current Vehicle Mileage (KM)</Label>
                <Input
                  {...form.register('currentMileage', { 
                    valueAsNumber: true,
                    validate: (value) => {
                      if (!Number.isInteger(value) || value < 0) {
                        return "Please enter a valid positive whole number";
                      }
                      return true;
                    }
                  })}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter current mileage (numbers only)"
                  data-testid="input-current-mileage"
                  onKeyDown={(e) => {
                    // Prevent decimal point, minus sign, and 'e' (scientific notation)
                    if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    // Prevent pasting non-numeric content
                    const paste = e.clipboardData.getData('text');
                    if (!/^\d+$/.test(paste)) {
                      e.preventDefault();
                    }
                  }}
                />
                {form.formState.errors.currentMileage && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.currentMileage.message}</p>
                )}
              </div>

              <div>
                <Label className="mb-4 block">Current Fuel Level</Label>
                <div className="glass-dark rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-700">E</span>
                    <span className="text-sm font-medium text-slate-700">F</span>
                  </div>
                  <Slider
                    value={[form.watch('fuelLevel') || 8]}
                    onValueChange={(value) => {
                      form.setValue('fuelLevel', value[0]);
                      form.trigger('fuelLevel');
                    }}
                    max={8}
                    step={1}
                    className="fuel-gauge"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    {fuelLevels.map((level, index) => (
                      <span key={index}>{level}</span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="glass">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl">Vehicle Photos</CardTitle>
              <p className="text-slate-600">Take photos for documentation</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {photoTypes.map((photoType, index) => (
                  <div key={photoType.id} className="glass-dark rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-700">
                        {photoType.icon} {photoType.label}
                      </span>
                      {vehiclePhotos[index] && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleVehiclePhotoChange(index, file);
                          }
                        }}
                        className="hidden"
                        id={`photo-${index}`}
                      />
                      <Label 
                        htmlFor={`photo-${index}`} 
                        className="cursor-pointer inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        data-testid={`button-upload-photo-${photoType.id}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {vehiclePhotos[index] ? 'Update Photo' : 'Take Photo'}
                      </Label>
                      {vehiclePhotos[index] && (
                        <p className="text-xs text-green-600 mt-2">✅ Photo uploaded</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="glass">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl">Pricing & Payment</CardTitle>
              <p className="text-slate-600">Set rental pricing and payment details</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rental Per Day (RM)</Label>
                  <Input
                    {...form.register('rentalPerDay', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Daily rental rate"
                    data-testid="input-rental-per-day"
                  />
                  {form.formState.errors.rentalPerDay && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.rentalPerDay.message}</p>
                  )}
                </div>

                <div>
                  <Label>Total Days</Label>
                  <Input
                    {...form.register('totalDays', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Number of rental days"
                    data-testid="input-total-days"
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                  />
                  {form.formState.errors.totalDays && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.totalDays.message}</p>
                  )}
                </div>

                <div>
                  <Label>Security Deposit (RM)</Label>
                  <Input
                    {...form.register('deposit', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Security deposit amount"
                    data-testid="input-deposit"
                  />
                  {form.formState.errors.deposit && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.deposit.message}</p>
                  )}
                </div>

                <div>
                  <Label>Discount (RM)</Label>
                  <Input
                    {...form.register('discount', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Discount amount (optional)"
                    data-testid="input-discount"
                  />
                  {form.formState.errors.discount && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.discount.message}</p>
                  )}
                </div>

                <div>
                  <Label>Mileage Limit (KM)</Label>
                  <Input
                    {...form.register('mileageLimit', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Daily mileage limit"
                    data-testid="input-mileage-limit"
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                  />
                  {form.formState.errors.mileageLimit && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.mileageLimit.message}</p>
                  )}
                </div>

                <div>
                  <Label>Extra Mileage Charge (RM/KM)</Label>
                  <Input
                    {...form.register('extraMileageCharge', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Charge per extra km"
                    data-testid="input-extra-mileage-charge"
                  />
                  {form.formState.errors.extraMileageCharge && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.extraMileageCharge.message}</p>
                  )}
                </div>
              </div>

              {/* Grand Total Calculation */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Pricing Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Daily Rate:</span>
                    <span>RM {(form.watch('rentalPerDay') || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days:</span>
                    <span>{form.watch('totalDays') || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>RM {((form.watch('rentalPerDay') || 0) * (form.watch('totalDays') || 1)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit:</span>
                    <span>RM {(form.watch('deposit') || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-RM {(form.watch('discount') || 0).toFixed(2)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Grand Total:</span>
                    <span>RM {(((form.watch('rentalPerDay') || 0) * (form.watch('totalDays') || 1)) + (form.watch('deposit') || 0) - (form.watch('discount') || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Proof Upload */}
              <div className="glass-dark rounded-xl p-4">
                <Label className="mb-3 block">Payment Proof (Optional)</Label>
                <div className="text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          // Import compression utility
                          const { compressImage } = await import('@/lib/imageCompression');
                          
                          // Compress the payment proof image
                          console.log('Compressing payment proof:', file.name);
                          const compressedFile = await compressImage(file, {
                            maxWidth: 1200,
                            maxHeight: 1200,
                            quality: 0.8,
                            maxSizeInMB: 1
                          });
                          
                          setPaymentProof(compressedFile);
                          
                          toast({
                            title: "Payment Proof Compressed",
                            description: `Image compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                          });
                        } catch (error) {
                          console.error('Payment proof compression failed:', error);
                          toast({
                            title: "Compression Failed",
                            description: "Using original image. File might be large for upload.",
                            variant: "destructive",
                          });
                          
                          // Fallback to original file
                          setPaymentProof(file);
                        }
                      }
                    }}
                    className="hidden"
                    id="payment-proof"
                  />
                  <Label 
                    htmlFor="payment-proof" 
                    className="cursor-pointer inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    data-testid="button-upload-payment-proof"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {paymentProof ? 'Update Payment Proof' : 'Upload Payment Proof'}
                  </Label>
                  {paymentProof && (
                    <p className="text-xs text-green-600 mt-2">✅ Payment proof uploaded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="glass">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Signature className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl">Customer Signature</CardTitle>
              <p className="text-slate-600">Get customer's digital signature</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Label className="mb-4 block">Customer: {customer.fullName}</Label>
                <SignaturePad
                  onSignatureChange={setSignatureData}
                  className="glass-dark rounded-xl"
                />
                <p className="text-sm text-slate-500 mt-2">
                  Ask the customer to sign using their finger or a stylus
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="glass">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <CardTitle className="text-2xl">Review & Complete</CardTitle>
              <p className="text-slate-600">Generate rental agreement</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p><strong>Customer:</strong> {customer.fullName}</p>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Vehicle Color:</strong> {form.getValues('color')}</p>
                <p><strong>Current Mileage:</strong> {form.getValues('currentMileage')} KM</p>
                <p><strong>Fuel Level:</strong> {fuelLevels[form.watch('fuelLevel')]}</p>
                <p><strong>Daily Rate:</strong> RM {(form.watch('rentalPerDay') || 0).toFixed(2)}</p>
                <p><strong>Total Days:</strong> {form.watch('totalDays') || 1}</p>
                <p><strong>Grand Total:</strong> RM {(((form.watch('rentalPerDay') || 0) * (form.watch('totalDays') || 1)) + (form.watch('deposit') || 0) - (form.watch('discount') || 0)).toFixed(2)}</p>
                <p><strong>Photos:</strong> {vehiclePhotos.filter(Boolean).length} of {photoTypes.length} uploaded</p>
                <p><strong>Payment Proof:</strong> {paymentProof ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                <p><strong>Signature:</strong> {signatureData ? '✅ Signed' : '❌ Not signed'}</p>
              </div>

              <Button
                onClick={form.handleSubmit(onSubmit, onInvalid)}
                disabled={isSubmitting || !signatureData}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="button-complete-rental"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Agreement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Rental Agreement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Complete Booking</h2>
          <p className="text-slate-600">Vehicle handover for {customer.fullName}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onCancel}
          data-testid="button-cancel-completion"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-8">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= step 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-200 text-slate-500'
            }`}>
              {step}
            </div>
            {step < 5 && (
              <div className={`w-16 h-1 ${
                currentStep > step ? 'bg-blue-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <Button 
            onClick={prevStep} 
            variant="outline"
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2" size={16} />
            Previous
          </Button>
          <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
            Next Step 
            <ArrowRight className="ml-2" size={16} />
          </Button>
        </div>
      )}

      {/* PDF Success Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="w-6 h-6 mr-2" />
              Rental Agreement Generated Successfully!
            </DialogTitle>
          </DialogHeader>
          
          {pdfData && (
            <div className="space-y-6">
              {/* Agreement Info */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Agreement Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Customer:</span> {pdfData.customerName}
                  </div>
                  <div>
                    <span className="font-medium">Vehicle:</span> {pdfData.vehicle}
                  </div>
                  <div>
                    <span className="font-medium">Period:</span> {pdfData.period}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> RM {pdfData.total}
                  </div>
                </div>
                <div className="mt-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    pdfData.emailSent 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pdfData.emailSent ? '✅ Email sent to customer' : '⚠️ Email delivery unavailable'}
                  </span>
                </div>
              </div>

              {/* PDF Preview */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Rental Agreement PDF</h4>
                <div className="bg-gray-100 h-40 rounded flex items-center justify-center mb-4">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-600">PDF Agreement Generated</p>
                    <p className="text-xs text-gray-500">{pdfData.customerName}-agreement.pdf</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => window.open(pdfData.pdfUrl, '_blank')}
                    variant="outline"
                    className="flex items-center"
                    data-testid="button-view-pdf"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>

                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = pdfData.downloadUrl || pdfData.pdfUrl;
                      link.download = `${pdfData.customerName}-agreement.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center bg-blue-600 hover:bg-blue-700"
                    data-testid="button-download-pdf"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>

                  <Button
                    onClick={() => {
                      const whatsappMessage = `Hi ${pdfData.customerName}, your rental agreement for ${pdfData.vehicle} (${pdfData.period}) has been generated. Total: RM ${pdfData.total}. Please check your email for the PDF agreement.`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    variant="outline"
                    className="flex items-center text-green-600 border-green-600 hover:bg-green-50"
                    data-testid="button-share-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + pdfData.pdfUrl);
                      toast({
                        title: "Link Copied",
                        description: "PDF link copied to clipboard",
                      });
                    }}
                    variant="outline"
                    className="flex items-center"
                    data-testid="button-copy-link"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setShowPdfDialog(false);
                    onComplete();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-close-pdf-dialog"
                >
                  Complete & Continue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}