import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRentalSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { availableColors, fuelLevels, getFuelLevelText } from "@/lib/vehicles";
import { calculateRentalCosts, calculateTotalDays } from "@/lib/calculations";
import SignaturePad from "@/components/ui/signature-pad";
import { 
  UserCheck, Car, Camera, Calendar, CreditCard, Signature, 
  ArrowLeft, ArrowRight, Upload, AlertCircle 
} from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProcessingModal } from "@/components/ui/loading-spinner";

const rentalFormSchema = z.object({
  customerId: z.number().optional(),
  vehicle: z.string().default(""),
  color: z.string().default(""),
  mileageLimit: z.string().default("300"),
  extraMileageCharge: z.string().default("1.50"),
  fuelLevel: z.number().min(0).max(8).default(4),
  currentMileage: z.number().min(0).default(0),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  totalDays: z.number().min(1).default(1),
  rentalPerDay: z.string().default("100"),
  deposit: z.string().default("500"),
  discount: z.string().default("0"),
  grandTotal: z.union([z.string(), z.number()]).transform(val => String(val)).default("100"),
  signatureData: z.string().optional(),
  vehiclePhotos: z.array(z.any()).optional(),
  paymentProof: z.any().optional(),
});

type RentalFormData = z.infer<typeof rentalFormSchema>;

interface RentalFormProps {
  onViewChange: (view: string) => void;
  onComplete: (data: any) => void;
}

export default function RentalForm({ onViewChange, onComplete }: RentalFormProps) {
  const [currentStep, setCurrentStep] = useState(1); // Start with step 1 since terms already accepted
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const [availabilityStatus, setAvailabilityStatus] = useState<{available: boolean; conflicts: any[]} | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [processingStep, setProcessingStep] = useState<'creating' | 'generating' | null>(null);
  const { toast } = useToast();
  const { customer } = useAuth();

  // Fetch vehicles from database
  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  // Debug logging
  console.log('Vehicles data:', vehicles);
  console.log('Vehicles loading:', vehiclesLoading);
  console.log('Vehicles error:', vehiclesError);

  const form = useForm<RentalFormData>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: {
      customerId: customer?.id,
      fuelLevel: 4,
      currentMileage: 0,
      mileageLimit: "",
      extraMileageCharge: "",
      vehicle: "",
      color: "",
      startDate: "",
      endDate: "",
      totalDays: 1,
      rentalPerDay: "",
      deposit: "",
      discount: "0",
      grandTotal: "",
    },
  });

  const createRentalMutation = useMutation({
    mutationFn: async (data: RentalFormData) => {
      setProcessingStep('creating');
      console.log("Creating rental with mutation...");
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'vehiclePhotos' && key !== 'paymentProof' && key !== 'signatureData') {
          formData.append(key, String(value));
        }
      });
      
      // Add files
      vehiclePhotos.forEach((photo, index) => {
        formData.append('vehiclePhotos', photo);
      });
      
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }
      
      if (signatureData) {
        formData.append('signatureData', signatureData);
      }

      console.log("Sending rental request to server...");
      const response = await fetch('/api/rentals', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Rental creation error:", error);
        throw new Error(error.message);
      }

      const result = await response.json();
      console.log("Rental created successfully:", result);
      return result;
    },
    onSuccess: (rental) => {
      console.log("Rental creation success, generating agreement for rental ID:", rental.id);
      setProcessingStep('generating');
      generateAgreementMutation.mutate(rental.id);
    },
    onError: (error: Error) => {
      setProcessingStep(null);
      console.error("Rental creation failed:", error);
      toast({
        title: "Rental Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAgreementMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      console.log("Generating agreement for rental ID:", rentalId);
      const response = await apiRequest('POST', `/api/rentals/${rentalId}/generate-agreement`);
      const data = await response.json();
      console.log("Agreement generation response:", data);
      return data;
    },
    onSuccess: (data) => {
      setProcessingStep(null);
      console.log("Agreement generated successfully:", data);
      toast({
        title: "Agreement Generated!",
        description: "Your rental agreement has been created and emailed to you.",
      });
      onComplete(data);
      onViewChange('final-confirmation');
    },
    onError: (error: Error) => {
      setProcessingStep(null);
      console.error("Agreement generation failed:", error);
      toast({
        title: "Agreement Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: RentalFormData) => {
    console.log("=== FORM SUBMISSION STARTED ===");
    console.log("Form submission started with data:", data);
    console.log("Vehicle photos:", vehiclePhotos);
    console.log("Payment proof:", paymentProof);
    console.log("Signature data:", signatureData);
    console.log("Current customer:", customer);
    
    // Create submission data with defaults for missing fields
    const submissionData = {
      ...data,
      customerId: data.customerId || customer?.id || 1,
      vehicle: data.vehicle || "Generic Vehicle",
      color: data.color || "Black",
      mileageLimit: data.mileageLimit || "300",
      extraMileageCharge: data.extraMileageCharge || "1.50",
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
      rentalPerDay: data.rentalPerDay || "100",
      deposit: data.deposit || "500",
      grandTotal: data.grandTotal || "100",
      vehiclePhotos: vehiclePhotos.length > 0 ? vehiclePhotos : [],
      paymentProof: paymentProof || null,
      signatureData: signatureData || ""
    };
    
    console.log("Submitting data with defaults:", submissionData);
    createRentalMutation.mutate(submissionData);
  };

  const watchedValues = form.watch();
  
  // Auto-calculate total days when dates change
  useEffect(() => {
    const startDate = watchedValues.startDate;
    const endDate = watchedValues.endDate;
    
    if (startDate && endDate) {
      const totalDays = calculateTotalDays(startDate, endDate);
      if (totalDays > 0) {
        form.setValue('totalDays', totalDays);
      }
    }
  }, [watchedValues.startDate, watchedValues.endDate, form]);
  
  // Auto-calculate costs and update grandTotal
  const costs = calculateRentalCosts({
    rentalPerDay: Number(watchedValues.rentalPerDay) || 0,
    deposit: Number(watchedValues.deposit) || 0,
    discount: Number(watchedValues.discount) || 0,
    totalDays: watchedValues.totalDays || 1,
  });

  // Auto-update grand total when costs change
  useEffect(() => {
    form.setValue('grandTotal', costs.grandTotal.toString());
  }, [costs.grandTotal, form]);

  // Auto-update mileage info when vehicle changes
  const selectedVehicle = watchedValues.vehicle;
  const selectedVehicleData = vehicles.find(v => v.name === selectedVehicle);
  
  // Auto-populate mileage fields when vehicle changes
  useEffect(() => {
    if (selectedVehicleData) {
      form.setValue('mileageLimit', `${selectedVehicleData.mileageLimit} KM`);
      form.setValue('extraMileageCharge', 'RM 2.50'); // Default charge, could be made configurable
    }
  }, [selectedVehicleData, form]);

  // Check vehicle availability when dates or vehicle change
  useEffect(() => {
    const checkAvailability = async () => {
      const vehicle = watchedValues.vehicle;
      const startDate = watchedValues.startDate;
      const endDate = watchedValues.endDate;
      
      if (vehicle && startDate && endDate) {
        setCheckingAvailability(true);
        try {
          const response = await apiRequest(
            'POST',
            '/api/rentals/check-availability',
            { vehicle, startDate, endDate }
          );
          const data = await response.json();
          setAvailabilityStatus(data);
        } catch (error) {
          console.error('Failed to check availability:', error);
        } finally {
          setCheckingAvailability(false);
        }
      }
    };
    
    checkAvailability();
  }, [watchedValues.vehicle, watchedValues.startDate, watchedValues.endDate]);

  const photoTypes = ['Front With Customer', 'Front', 'Back', 'Left', 'Right', 'Interior/Mileage', 'Known Damage'];

  const handleVehiclePhotoChange = async (index: number, file: File) => {
    try {
      // Import compression utility
      const { compressImage } = await import('@/lib/imageCompression');
      
      // Compress the image before setting it
      console.log(`Compressing vehicle photo ${index}:`, file.name);
      const compressedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        maxSizeInMB: 1
      });
      
      const newPhotos = [...vehiclePhotos];
      newPhotos[index] = compressedFile;
      setVehiclePhotos(newPhotos);
      form.setValue('vehiclePhotos', newPhotos as any);
      
      toast({
        title: "Photo Compressed",
        description: `Photo compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
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
      form.setValue('vehiclePhotos', newPhotos as any);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <UserCheck className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Confirm Your Details</h3>
              <p className="text-slate-600">Please verify your information</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Full Name</Label>
                <Input value={customer?.fullName || ''} readOnly className="bg-slate-100" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={customer?.email || ''} readOnly className="bg-slate-100" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={customer?.phone || ''} readOnly className="bg-slate-100" />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea value={customer?.address || ''} readOnly className="bg-slate-100" rows={3} />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={nextStep} className="btn-gradient">
                Next Step <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Car className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Car Details</h3>
              <p className="text-slate-600">Select your vehicle and details</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Vehicle Selection</Label>
                <select 
                  className="input-glass h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  onChange={(e) => form.setValue('vehicle', e.target.value)}
                >
                  <option value="">
                    {vehiclesLoading ? "Loading vehicles..." : "Select a vehicle"}
                  </option>
                  {!vehiclesLoading && vehicles.length === 0 && (
                    <option value="" disabled>No vehicles available</option>
                  )}
                  {!vehiclesLoading && vehicles.length > 0 && vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.name}>
                      {vehicle.name} ({vehicle.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Color</Label>
                <Select onValueChange={(value) => form.setValue('color', value)}>
                  <SelectTrigger className="input-glass">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mileage Limit (KM)</Label>
                <Input
                  value={selectedVehicleData ? `${selectedVehicleData.mileageLimit} KM` : ''}
                  readOnly
                  className="bg-slate-100"
                  placeholder="Auto-calculated"
                />
              </div>
              <div>
                <Label>Extra Mileage Charges (RM/km)</Label>
                <Input
                  value="RM 2.50"
                  readOnly
                  className="bg-slate-100"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="mt-6">
              <Label className="mb-4 block">Current Fuel Level</Label>
              <div className="glass-dark rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-700">E</span>
                  <span className="text-sm font-medium text-slate-700">F</span>
                </div>
                <Slider
                  value={[form.getValues('fuelLevel') || 4]}
                  onValueChange={(value) => form.setValue('fuelLevel', value[0])}
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

            <div className="mt-6">
              <Label>Current Vehicle Mileage</Label>
              <Input
                {...form.register('currentMileage', { valueAsNumber: true })}
                type="number"
                placeholder="Enter current mileage"
                className="input-glass"
                min="0"
                step="1"
              />
              <p className="text-xs text-slate-500 mt-1">Enter the current odometer reading in kilometers</p>
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2" size={16} />
                Previous
              </Button>
              <Button onClick={nextStep} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
                Next Step <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Vehicle Photos</h3>
              <p className="text-slate-600">Upload 7 photos of the vehicle condition</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photoTypes.map((photoType, index) => (
                <div key={photoType} className="glass-dark rounded-xl p-4">
                  <Label className="flex items-center mb-3">
                    <Camera className="mr-2" size={16} />
                    {photoType}
                  </Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-sm text-slate-600 mb-2">Click to upload</p>
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
                    <Label htmlFor={`photo-${index}`} className="cursor-pointer text-xs bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                      {vehiclePhotos[index] ? vehiclePhotos[index].name : 'Choose File'}
                    </Label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2" size={16} />
                Previous
              </Button>
              <Button onClick={nextStep} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                Next Step <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Calendar className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Rental Details</h3>
              <p className="text-slate-600">Select your rental dates and times</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  {...form.register('startDate')}
                  className="input-glass"
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  defaultValue="10:00"
                  className="input-glass"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  {...form.register('endDate')}
                  className="input-glass"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  defaultValue="10:00"
                  readOnly
                  className="bg-slate-100"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Total Days</Label>
                <Input
                  {...form.register('totalDays', { valueAsNumber: true })}
                  type="number"
                  className="input-glass text-lg font-semibold"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            {/* Vehicle Availability Alert */}
            {availabilityStatus && !availabilityStatus.available && (
              <Alert className="mt-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Sorry, this vehicle is already booked for the selected dates.</strong>
                  <br />
                  The vehicle is already reserved during this period. Please select different dates or choose another vehicle.
                </AlertDescription>
              </Alert>
            )}

            {checkingAvailability && (
              <div className="mt-6 text-center text-sm text-slate-600">
                Checking vehicle availability...
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2" size={16} />
                Previous
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={availabilityStatus && !availabilityStatus.available}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Payment Details</h3>
              <p className="text-slate-600">Enter payment information and upload proof</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Rental Per Day (RM)</Label>
                <Input
                  {...form.register('rentalPerDay', { 
                    required: "Rental per day is required",
                    valueAsNumber: false 
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className="input-glass"
                  placeholder="Enter daily rental rate"
                />
                {form.formState.errors.rentalPerDay && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.rentalPerDay.message}</p>
                )}
              </div>
              <div>
                <Label>Deposit (RM)</Label>
                <Input
                  {...form.register('deposit', { 
                    required: "Deposit is required",
                    valueAsNumber: false 
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className="input-glass"
                  placeholder="Enter deposit amount"
                />
                {form.formState.errors.deposit && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.deposit.message}</p>
                )}
              </div>
              <div>
                <Label>Rental Subtotal (RM)</Label>
                <Input
                  value={costs.subtotal.toFixed(2)}
                  readOnly
                  className="bg-slate-100 font-semibold"
                />
              </div>
              <div>
                <Label>Total Deposit (RM)</Label>
                <Input
                  value={costs.deposit.toFixed(2)}
                  readOnly
                  className="bg-slate-100 font-semibold"
                />
              </div>
              <div>
                <Label>Discount (RM)</Label>
                <Input
                  {...form.register('discount')}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className="input-glass"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Grand Total (RM)</Label>
                <Input
                  value={costs.grandTotal.toFixed(2)}
                  readOnly
                  className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-bold text-lg"
                />
                <input type="hidden" {...form.register('grandTotal', { valueAsNumber: true })} value={costs.grandTotal} />
              </div>
            </div>

            <div className="mt-6">
              <Label>Upload Payment Proof</Label>
              <div className="glass-dark rounded-xl p-6 border-2 border-dashed border-slate-300 text-center">
                <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-600 mb-2">Upload receipt or payment screenshot</p>
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
                        form.setValue('paymentProof', e.target.files);
                        
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
                        form.setValue('paymentProof', e.target.files);
                      }
                    }
                  }}
                  className="hidden"
                  id="payment-proof"
                />
                <Label htmlFor="payment-proof" className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 cursor-pointer transition-colors">
                  {paymentProof ? paymentProof.name : 'Choose File'}
                </Label>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2" size={16} />
                Previous
              </Button>
              <Button onClick={nextStep} className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white">
                Next Step <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Signature className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Finalize & Sign</h3>
              <p className="text-slate-600">Provide your digital signature to complete</p>
            </div>

            <div className="mb-6">
              <Label className="mb-4 block">Digital Signature</Label>
              <SignaturePad
                onSignatureChange={setSignatureData}
                className="glass-dark rounded-xl"
              />
            </div>

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2" size={16} />
                Previous
              </Button>
              <Button
                onClick={() => {
                  console.log("=== GENERATE AGREEMENT BUTTON CLICKED ===");
                  console.log("Form state:", form.getValues());
                  console.log("Form errors:", form.formState.errors);
                  console.log("Is form valid:", form.formState.isValid);
                  console.log("Signature data available:", !!signatureData);
                  console.log("Customer data:", customer);
                  
                  const formData = form.getValues();
                  console.log("Current form values:", formData);
                  
                  // Allow submission even without signature (incomplete info is OK)
                  if (!signatureData) {
                    console.log("No signature data, but proceeding anyway as incomplete info is allowed");
                    toast({
                      title: "Notice",
                      description: "Proceeding without signature - you can add it later.",
                    });
                  }
                  
                  console.log("Calling form.handleSubmit...");
                  // Force submission regardless of validation errors
                  const currentData = form.getValues();
                  onSubmit(currentData);
                }}
                disabled={createRentalMutation.isPending || generateAgreementMutation.isPending}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-w-[200px]"
              >
                {createRentalMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading Files...
                  </>
                ) : generateAgreementMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Signature className="mr-2" size={16} />
                    Generate Agreement
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Progress Bar */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Rental Booking Form</h2>
          <span className="text-sm text-slate-600">Step {currentStep} of 6</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full progress-bar transition-all duration-300" 
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {renderStep()}

      {/* Processing Modal */}
      <ProcessingModal 
        isOpen={processingStep !== null}
        variant="pdf"
        message={
          processingStep === 'creating' 
            ? "Creating your rental booking..." 
            : "Generating your professional rental agreement..."
        }
      />
    </div>
  );
}
