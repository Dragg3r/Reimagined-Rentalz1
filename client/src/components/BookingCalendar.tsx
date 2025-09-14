import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Car, Clock, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getMonth, getYear } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface Booking {
  id: number;
  vehicle: string;
  startDate: string;
  endDate: string;
  customerId: number;
  customerName?: string;
  status: string;
}

interface Vehicle {
  id: number;
  name: string;
  category: string;
  isActive: boolean;
}

interface BookingCalendarProps {
  bookings: Booking[];
}

// Dynamic color palette for vehicles
const colorPalette = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500',
  'bg-teal-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-gray-500',
  'bg-purple-600', 'bg-red-600', 'bg-blue-700', 'bg-indigo-600', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-lime-500', 'bg-violet-500',
  'bg-fuchsia-500', 'bg-sky-500', 'bg-orange-600', 'bg-green-600', 'bg-blue-600',
  'bg-purple-700', 'bg-red-700', 'bg-yellow-600', 'bg-teal-600', 'bg-pink-600'
];

// Generate vehicle colors based on vehicle ID for consistency
const generateVehicleColors = (vehicles: Vehicle[]) => {
  const colors: { [key: string]: string } = {};
  vehicles.forEach((vehicle, index) => {
    colors[vehicle.name] = colorPalette[index % colorPalette.length];
  });
  return colors;
};

export default function BookingCalendar({ bookings }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch vehicles for dynamic legend
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
  });

  // Generate vehicle colors dynamically
  const vehicleColors = useMemo(() => {
    return generateVehicleColors(vehicles.filter(v => v.isActive));
  }, [vehicles]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return date >= bookingStart && date <= bookingEnd;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayBookings = (date: Date) => {
    return getBookingsForDate(date);
  };

  const getVehicleColor = (vehicle: string) => {
    return vehicleColors[vehicle] || 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vehicle Booking Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="hover:bg-blue-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 bg-white rounded-lg shadow-sm border">
                <span className="font-semibold text-gray-700">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="hover:bg-blue-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(date => {
              const dayBookings = getDayBookings(date);
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
              const isTodayDate = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`
                    min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}
                    ${isTodayDate ? 'ring-2 ring-blue-400' : ''}
                    ${!isSameMonth(date, currentDate) ? 'opacity-50' : ''}
                  `}
                  onClick={() => setSelectedDate(date)}
                >
                  {/* Date number */}
                  <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>

                  {/* Booking indicators */}
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs px-2 py-1 rounded-full text-white truncate ${getVehicleColor(booking.vehicle)}`}
                        title={`${booking.vehicle} - ${booking.customerName || `Customer ID: ${booking.customerId}`}`}
                      >
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          <span className="truncate">{booking.vehicle}</span>
                        </div>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bookings for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedDateBookings = getDayBookings(selectedDate);
              if (selectedDateBookings.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-8">
                    No bookings for this date
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {selectedDateBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${getVehicleColor(booking.vehicle)}`} />
                          <div>
                            <div className="font-semibold text-gray-900">{booking.vehicle}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.customerName || `Customer ID: ${booking.customerId}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d')}
                          </div>
                          <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Vehicle Legend</CardTitle>
        </CardHeader>
        <CardContent>
          {vehiclesLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading vehicles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(vehicleColors).map(([vehicle, color]) => (
                <div key={vehicle} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600">{vehicle}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}