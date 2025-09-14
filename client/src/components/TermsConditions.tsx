import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FileText, ArrowLeft, Check } from "lucide-react";

interface TermsConditionsProps {
  onViewChange: (view: string) => void;
}

export default function TermsConditions({ onViewChange }: TermsConditionsProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { customer, setCustomer } = useAuth();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error("No customer logged in");
      const response = await apiRequest('POST', `/api/customers/${customer.id}/accept-terms`);
      return response.json();
    },
    onSuccess: () => {
      if (customer) {
        setCustomer({ ...customer, hasAcceptedTerms: true });
      }
      toast({
        title: "Terms Accepted",
        description: "You can now browse vehicles and make booking requests.",
      });
      // Navigate to customer portal after accepting terms
      setTimeout(() => {
        onViewChange('customer-portal');
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isScrolledToBottom);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAcceptTerms = () => {
    acceptTermsMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <FileText className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Terms & Conditions</h2>
          <p className="text-slate-600">Please read and accept our rental agreement</p>
        </div>

        <div 
          ref={scrollRef}
          className="glass-dark rounded-xl p-6 h-96 overflow-y-auto mb-6"
        >
          <div className="prose prose-slate max-w-none">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Reimagined Rentalz</h3>
            <p className="text-slate-700 mb-4">
              This Agreement outlines the terms for vehicle rental from Reimagined Rentalz. 
              By signing, the Renter agrees to these clauses. Breaches may lead to penalties, deposit forfeiture, 
              agreement termination, and legal action.
            </p>
            
            <h4 className="text-md font-semibold text-slate-800 mb-3">1. Rental Period and Vehicle Usage</h4>
            <p className="text-sm text-slate-700 mb-2">
              <strong>1.1. Genting Highland Usage Fee:</strong> An additional surcharge (RM150-RM350, vehicle-dependent) 
              applies for Genting Highlands travel. Declare and settle this fee with Reimagined Rentalz before departure.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>1.2. Early Termination of Rental:</strong> No refunds or partial refunds are provided for early returns. 
              The Renter must honor the original booking duration.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>1.3. Late Return Penalty:</strong> Vehicles returned late incur a RM 25-300 per hour penalty, 
              unless Reimagined Rentalz provides prior written agreement.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>1.4. Mileage Limits & Charges:</strong> Exceeding any daily mileage cap results in an overage charge 
              (RM1.50–RM5.00/km), payable to Reimagined Rentalz.
            </p>
            <p className="text-sm text-slate-700 mb-4">
              <strong>1.5. Fuel Level Requirement:</strong> Return vehicles with the same fuel level as received. 
              Reimagined Rentalz will impose a RM50–RM200 refueling charge if not met.
            </p>
            
            <h4 className="text-md font-semibold text-slate-800 mb-3">2. Driver Authorization & Responsibilities</h4>
            <p className="text-sm text-slate-700 mb-2">
              <strong>2.1. Unregistered Drivers Prohibited:</strong> Only authorized individuals listed in this Agreement 
              may drive the vehicle. Any unregistered driver voids this Agreement and forfeits the full deposit to Reimagined Rentalz.
            </p>
            <p className="text-sm text-slate-700 mb-4">
              <strong>2.2. Traffic Violations & Summons:</strong> The Renter is solely responsible for all traffic fines, 
              parking summons, and toll charges incurred during the rental period. Outstanding penalties will be deducted 
              from the deposit by Reimagined Rentalz.
            </p>
            
            <h4 className="text-md font-semibold text-slate-800 mb-3">3. Vehicle Care and Prohibited Actions</h4>
            <p className="text-sm text-slate-700 mb-2">
              <strong>3.1. Unauthorized Workshop Visits:</strong> Renters are strictly prohibited from sending the vehicle 
              to any external workshop. Violations result in immediate agreement termination by Reimagined Rentalz 
              and full deposit forfeiture. All repairs must be coordinated with Reimagined Rentalz.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>3.2. Vehicle Misuse & Reckless Behavior:</strong> Vehicle abuse (e.g., drifting, burnouts, 
              unauthorized decals/stickers, aggressive revving, off-road use, redlining while idle) is strictly forbidden. 
              This results in full deposit forfeiture to Reimagined Rentalz and potential legal action.
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>3.3. Speed Limit Violations:</strong> Speeding is monitored via GPS/dash cam. A first offense results 
              in a written warning from Reimagined Rentalz. A second offense leads to immediate rental termination 
              and full deposit forfeiture, with no exceptions.
            </p>
            <p className="text-sm text-slate-700 mb-4">
              <strong>3.4. Smoking & Vaping Strictly Prohibited:</strong> A RM300 cleaning fee will be charged by 
              Reimagined Rentalz if the interior smells of smoke, vape, or strong odors.
            </p>
            
            <div className="mt-8 p-4 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-600">Scroll to the bottom to enable the agreement button</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            type="button"
            onClick={() => onViewChange('customer-login')}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          <Button
            onClick={handleAcceptTerms}
            disabled={!hasScrolledToBottom || acceptTermsMutation.isPending}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            <Check className="mr-2" size={16} />
            {acceptTermsMutation.isPending ? 'Processing...' : 'I Have Scrolled and Agree'}
          </Button>
        </div>
      </div>
    </div>
  );
}
