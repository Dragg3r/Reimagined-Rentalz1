import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Car, Calendar as CalendarIcon, Users, MapPin, Fuel, CheckCircle2, XCircle, ArrowLeft, UserCheck, UserPlus, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Vehicle } from "@shared/schema";

interface VehicleViewingProps {
  onNavigateBack: () => void;
  onNavigateToSignup: () => void;
  onNavigateToLogin: () => void;
}

export default function VehicleViewing({ onNavigateBack, onNavigateToSignup, onNavigateToLogin }: VehicleViewingProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; conflictingDates?: any[] } | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  
  const { customer } = useAuth();
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: () => fetch('/api/vehicles').then(res => res.json()),
  });

  const bookingRequestMutation = useMutation({
    mutationFn: async (data: {
      customerId: number;
      vehicleId: number;
      vehicleName: string;
      startDate: string;
      endDate: string;
      customerMessage?: string;
    }) => {
      return apiRequest('POST', '/api/booking-requests', data);
    },
    onSuccess: () => {
      toast({
        title: "Booking Request Submitted!",
        description: "We'll review your request and get back to you soon. Check your email for confirmation.",
      });
      setShowBookingForm(false);
      setCustomerMessage("");
      resetSelection();
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkAvailability = async () => {
    if (!selectedVehicle || !dateRange.from || !dateRange.to) return;

    setCheckingAvailability(true);
    try {
      const response = await fetch(`/api/vehicles/${selectedVehicle.id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });
      
      const result = await response.json();
      setAvailabilityResult(result);
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityResult({ available: false });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const resetSelection = () => {
    setSelectedVehicle(null);
    setDateRange({ from: undefined, to: undefined });
    setAvailabilityResult(null);
    setShowBookingForm(false);
    setCustomerMessage("");
  };

  const handleBookingRequest = () => {
    if (!selectedVehicle || !dateRange.from || !dateRange.to || !customer) return;

    bookingRequestMutation.mutate({
      customerId: customer.id,
      vehicleId: selectedVehicle.id,
      vehicleName: selectedVehicle.name,
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      customerMessage: customerMessage.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-lg text-slate-600">Loading our vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="glass-panel sticky top-0 z-10 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onNavigateBack}
                className="text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">View Our Vehicles</h1>
                <p className="text-slate-600">Choose your perfect ride and check availability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!vehicles || vehicles.length === 0 ? (
          <div className="glass-panel text-center py-12">
            <Car className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No Vehicles Available</h3>
            <p className="text-slate-500">Please check back later for available vehicles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vehicles.map((vehicle: Vehicle) => (
              <Card
                key={vehicle.id}
                className="glass-panel hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <CardHeader className="p-4">
                  <div className="relative">
                    {vehicle.photoUrl ? (
                      <img
                        src={vehicle.photoUrl}
                        alt={vehicle.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 flex items-center justify-center">
                        <Car className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                        {vehicle.category}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    {vehicle.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>Mileage Limit: {vehicle.mileageLimit} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Available for booking</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 btn-gradient"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicle(vehicle);
                    }}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Check Availability
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Details & Calendar Dialog */}
      <Dialog 
        open={!!selectedVehicle} 
        onOpenChange={() => resetSelection()}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-500" />
              {selectedVehicle?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedVehicle && (
            <div className="space-y-6">
              {/* Vehicle Photo */}
              {selectedVehicle.photoUrl ? (
                <img
                  src={selectedVehicle.photoUrl}
                  alt={selectedVehicle.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                  <Car className="w-16 h-16 text-slate-400" />
                </div>
              )}

              {/* Vehicle Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Category</span>
                  </div>
                  <p className="text-slate-600">{selectedVehicle.category}</p>
                </div>
                
                <div className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Mileage Limit</span>
                  </div>
                  <p className="text-slate-600">{selectedVehicle.mileageLimit} km</p>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Select Rental Period</h3>
                
                <div className="glass-panel p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Choose your rental dates (click start date, then end date)
                  </label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                      className="rounded-md border border-slate-200"
                    />
                  </div>
                </div>

                {dateRange.from && dateRange.to && (
                  <div className="glass-panel p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Selected Dates:</p>
                        <p className="text-sm text-slate-600">
                          {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                        </p>
                        <p className="text-sm text-slate-600">
                          Duration: {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                      <Button
                        onClick={checkAvailability}
                        disabled={checkingAvailability}
                        className="btn-gradient"
                      >
                        {checkingAvailability ? 'Checking...' : 'Check Availability'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Availability Result */}
                {availabilityResult && (
                  <div className={`glass-panel p-4 ${availabilityResult.available ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {availabilityResult.available ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {availabilityResult.available ? 'Available!' : 'Not Available'}
                      </span>
                    </div>
                    
                    {availabilityResult.available ? (
                      <div className="space-y-4">
                        <p className="text-green-700">
                          Great news! This vehicle is available for your selected dates.
                        </p>
                        
                        {customer ? (
                          // Logged-in customer: Show booking request options
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">Ready to book? We'll review your request and contact you within 24 hours.</p>
                            
                            {!showBookingForm ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                  onClick={() => setShowBookingForm(true)}
                                  className="w-full btn-gradient"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Request Booking
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => window.open(`https://wa.me/601111911595?text=${encodeURIComponent(`Hi! I would like to book ${selectedVehicle?.name} from ${dateRange.from ? format(dateRange.from, 'PPP') : ''} to ${dateRange.to ? format(dateRange.to, 'PPP') : ''}. Please confirm availability and pricing.`)}`, '_blank')}
                                  className="w-full"
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  WhatsApp Us
                                </Button>
                              </div>
                            ) : (
                              // Booking request form
                              <div className="space-y-4 glass-panel p-4">
                                <div className="space-y-2">
                                  <Label htmlFor="customerMessage">Additional Message (Optional)</Label>
                                  <Textarea
                                    id="customerMessage"
                                    placeholder="Any special requests or questions about your booking..."
                                    value={customerMessage}
                                    onChange={(e) => setCustomerMessage(e.target.value)}
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <Button
                                    onClick={handleBookingRequest}
                                    disabled={bookingRequestMutation.isPending}
                                    className="flex-1 btn-gradient"
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    {bookingRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowBookingForm(false);
                                      setCustomerMessage("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Not logged in: Show login/signup options
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-700">Choose how to continue:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Button
                                onClick={onNavigateToLogin}
                                variant="outline"
                                className="w-full"
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Login & Book
                              </Button>
                              <Button
                                onClick={onNavigateToSignup}
                                className="w-full btn-gradient"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Create Account
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-red-700">
                          Sorry, this vehicle is not available for your selected dates.
                        </p>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">Please try:</p>
                          <ul className="text-sm text-slate-600 space-y-1 ml-4">
                            <li>• Different dates for this vehicle</li>
                            <li>• Another vehicle from our fleet</li>
                          </ul>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setAvailabilityResult(null)}
                          className="w-full"
                        >
                          Try Different Dates
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}