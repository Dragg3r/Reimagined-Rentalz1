import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { vehicles } from "@/lib/vehicles";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { Calendar, Car, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function VehicleSchedule() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['/api/staff/vehicle-schedule', selectedVehicle, { month: currentMonth, year: currentYear }],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedVehicle,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateBooked = (date: Date) => {
    if (!schedule) return false;
    
    return schedule.some(rental => {
      const start = new Date(rental.startDate);
      const end = new Date(rental.endDate);
      return isWithinInterval(date, { start, end });
    });
  };

  const getBookingsForDate = (date: Date) => {
    if (!schedule) return [];
    
    return schedule.filter(rental => {
      const start = new Date(rental.startDate);
      const end = new Date(rental.endDate);
      return isWithinInterval(date, { start, end });
    });
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Selection */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <Car className="mr-2" size={24} />
          Select Vehicle
        </h3>
        <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
          <SelectTrigger className="w-full glass-input">
            <SelectValue placeholder="Choose a vehicle to view schedule" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(vehicles).map(([category, vehicleList]) => (
              <div key={category}>
                <div className="px-2 py-1 text-sm font-semibold text-slate-600">{category}</div>
                {vehicleList.map((vehicle) => (
                  <SelectItem key={vehicle} value={vehicle}>
                    {vehicle}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar View */}
      {selectedVehicle && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Calendar className="mr-2" size={24} />
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="glass-button"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="glass-button"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="glass-button"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-slate-600 py-2">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {monthDays.map((date, index) => {
                const isBooked = isDateBooked(date);
                const bookings = getBookingsForDate(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "relative p-3 min-h-[80px] rounded-lg border transition-all",
                      isBooked ? "bg-red-50 border-red-300" : "bg-white/50 border-slate-200",
                      isToday && "ring-2 ring-primary"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium",
                      isBooked ? "text-red-700" : "text-slate-700"
                    )}>
                      {format(date, 'd')}
                    </div>
                    {isBooked && (
                      <Badge 
                        variant="destructive" 
                        className="absolute bottom-1 right-1 text-xs"
                      >
                        Booked
                      </Badge>
                    )}
                    {bookings.length > 0 && (
                      <div className="mt-1 text-xs text-red-600">
                        {bookings.length} booking{bookings.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Booking Details */}
          {schedule && schedule.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold text-slate-800">Bookings this month:</h4>
              {schedule.map(rental => (
                <div key={rental.id} className="glass p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {format(new Date(rental.startDate), 'MMM d')} - {format(new Date(rental.endDate), 'MMM d')}
                      </span>
                      <span className="text-slate-600 ml-2">
                        ({rental.totalDays} days)
                      </span>
                    </div>
                    <Badge variant={rental.status === 'completed' ? 'default' : 'secondary'}>
                      {rental.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}