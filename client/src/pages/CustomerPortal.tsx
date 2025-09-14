import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CustomerDashboard from "@/components/CustomerDashboard";
import { 
  Calendar, Car, Clock, CheckCircle, AlertCircle, 
  LogOut, User, MessageCircle, Send, X 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { bookingRequestSchema, type BookingRequestData, type Vehicle } from "@shared/schema";
import { z } from "zod";

interface CustomerPortalProps {
  onViewChange: (view: string) => void;
}

export default function CustomerPortal({ onViewChange }: CustomerPortalProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; conflicts: any[] } | null>(null);

  const { customer, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vehicles from database
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  // Fetch customer's booking requests
  const { data: bookingRequests = [] } = useQuery({
    queryKey: ['/api/booking-requests/customer', customer?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/booking-requests/customer/${customer?.id}`);
      return response.json();
    },
    enabled: !!customer?.id,
  });

  const checkAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle || !startDate || !endDate) return null;
      
      setCheckingAvailability(true);
      try {
        const response = await apiRequest('POST', `/api/vehicles/${selectedVehicle.id}/check-availability`, {
          startDate,
          endDate
        });
        return response.json();
      } finally {
        setCheckingAvailability(false);
      }
    },
    onSuccess: (result) => {
      if (!result) return;
      setAvailabilityResult(result);
      if (result.available) {
        toast({
          title: "Vehicle Available! ✅",
          description: `${selectedVehicle?.name} is available for your selected dates.`,
        });
      } else {
        toast({
          title: "Vehicle Not Available",
          description: "This vehicle has conflicts with existing bookings.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Availability Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createBookingRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle || !customer) return;

      // Convert date strings to ISO format for the backend
      const startDateISO = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const endDateISO = new Date(endDate + 'T00:00:00.000Z').toISOString();

      const bookingData: BookingRequestData = {
        customerId: customer.id,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        startDate: startDateISO,
        endDate: endDateISO,
        customerMessage: customerMessage || undefined,
      };

      const response = await apiRequest('POST', '/api/booking-requests', bookingData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Request Sent! 📧",
        description: "Your booking request has been sent to our staff for approval. You'll receive an email confirmation shortly.",
      });
      
      // Reset form
      setSelectedVehicle(null);
      setShowBookingForm(false);
      setStartDate("");
      setEndDate("");
      setCustomerMessage("");
      setAvailabilityResult(null);
      
      // Refresh booking requests
      queryClient.invalidateQueries({ queryKey: ['/api/booking-requests/customer'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowBookingForm(true);
    setAvailabilityResult(null);
  };

  const handleCheckAvailability = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    checkAvailabilityMutation.mutate();
  };

  const handleSubmitBookingRequest = () => {
    if (!availabilityResult?.available) {
      toast({
        title: "Check Availability First",
        description: "Please check vehicle availability before submitting your request.",
        variant: "destructive",
      });
      return;
    }

    createBookingRequestMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleLogout = () => {
    logout();
    onViewChange('role-selection');
  };

  if (vehiclesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-100">
      {/* Header */}
      <div className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Car className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Customer Portal</h1>
                <p className="text-sm text-slate-600">Welcome, {customer?.fullName}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* My Booking Requests */}
        {bookingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">My Booking Requests</h2>
            <div className="grid gap-4">
              {(bookingRequests as any[]).map((request: any) => (
                <Card key={request.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{request.vehicleName}</h3>
                        <p className="text-sm text-slate-600">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600">{request.totalDays} days</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(request.status)}
                        <p className="text-xs text-slate-500 mt-1">
                          Requested: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Selection */}
        {!showBookingForm && (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Choose Your Vehicle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(vehicles as Vehicle[]).map((vehicle: Vehicle) => (
                <Card key={vehicle.id} className="glass hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => handleVehicleSelect(vehicle)}
                      data-testid={`card-vehicle-${vehicle.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center justify-between">
                      {vehicle.name}
                      <Badge variant="outline" className="text-xs">
                        {vehicle.category}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vehicle.photoUrl && (
                        <img 
                          src={vehicle.photoUrl} 
                          alt={vehicle.name}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex items-center text-slate-600">
                        <Clock size={16} className="mr-2" />
                        <span className="text-sm">Mileage Limit: {vehicle.mileageLimit} km/day</span>
                      </div>
                      <Button 
                        className="w-full btn-gradient"
                        data-testid={`button-select-${vehicle.id}`}
                      >
                        Select Vehicle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Booking Request Form */}
        {showBookingForm && selectedVehicle && (
          <div className="max-w-2xl mx-auto">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-slate-800">
                    Book {selectedVehicle.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBookingForm(false);
                      setSelectedVehicle(null);
                      setAvailabilityResult(null);
                    }}
                    data-testid="button-close-booking"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>

                {/* Check Availability */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckAvailability}
                    disabled={!startDate || !endDate || checkingAvailability}
                    className="w-full btn-gradient"
                    data-testid="button-check-availability"
                  >
                    {checkingAvailability ? (
                      <>
                        <Clock className="mr-2 animate-spin" size={16} />
                        Checking Availability...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2" size={16} />
                        Check Availability
                      </>
                    )}
                  </Button>

                  {availabilityResult && (
                    <div className={`p-4 rounded-lg border ${
                      availabilityResult.available 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {availabilityResult.available ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <AlertCircle className="text-red-600" size={20} />
                        )}
                        <span className={`font-medium ${
                          availabilityResult.available ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {availabilityResult.available 
                            ? '✅ Vehicle Available!' 
                            : '❌ Vehicle Not Available'
                          }
                        </span>
                      </div>
                      {!availabilityResult.available && availabilityResult.conflicts.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          Conflicts with existing bookings
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Message */}
                <div>
                  <Label htmlFor="customer-message">Additional Message (Optional)</Label>
                  <Textarea
                    id="customer-message"
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Any special requests or notes..."
                    rows={3}
                    data-testid="textarea-message"
                  />
                </div>

                {/* Submit Booking Request */}
                <Button
                  onClick={handleSubmitBookingRequest}
                  disabled={!availabilityResult?.available || createBookingRequestMutation.isPending}
                  className="w-full btn-gradient"
                  data-testid="button-submit-booking"
                >
                  {createBookingRequestMutation.isPending ? (
                    <>
                      <Clock className="mr-2 animate-spin" size={16} />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" size={16} />
                      Submit Booking Request
                    </>
                  )}
                </Button>

                <div className="text-sm text-slate-600 text-center">
                  📧 You'll receive an email confirmation and our staff will review your request.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}