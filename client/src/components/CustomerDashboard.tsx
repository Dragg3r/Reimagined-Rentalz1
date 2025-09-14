import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, Star, Gift, Target, Calendar, Car, 
  TrendingUp, Award, Zap, Crown, Users, 
  ChevronRight, ArrowLeft, Plus, MessageSquare, 
  Heart, Flame, Sparkles, Medal
} from "lucide-react";
import type { Customer, CustomerBadge, CustomerActivity, CustomerReview, LoyaltyTier } from "@shared/schema";

interface CustomerDashboardProps {
  onViewChange: (view: string) => void;
}

// Point system configuration
const POINT_VALUES = {
  FIRST_BOOKING: 100,
  BOOKING_COMPLETED: 50,
  REVIEW_SUBMITTED: 25,
  REFERRAL_SUCCESSFUL: 75,
  PROFILE_COMPLETE: 30,
  EARLY_BIRD_BOOKING: 15, // Booking 7+ days in advance
  LONG_RENTAL: 40, // 7+ day rentals
  LOYALTY_BONUS: 10, // Monthly active user bonus
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 18000];

function getCustomerLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

function getProgressToNextLevel(points: number): { current: number; next: number; progress: number } {
  const level = getCustomerLevel(points);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const progress = nextThreshold > currentThreshold 
    ? ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100 
    : 100;
  
  return { current: currentThreshold, next: nextThreshold, progress };
}

export default function CustomerDashboard({ onViewChange }: CustomerDashboardProps) {
  const { customer } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);

  // Fetch customer profile with gamification data
  const { data: customerProfile } = useQuery<Customer>({
    queryKey: ['/api/customers/profile'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Fetch customer badges
  const { data: badges = [] } = useQuery<CustomerBadge[]>({
    queryKey: ['/api/customers/badges'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Fetch customer activity
  const { data: activities = [] } = useQuery<CustomerActivity[]>({
    queryKey: ['/api/customers/activities'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Fetch customer reviews
  const { data: reviews = [] } = useQuery<CustomerReview[]>({
    queryKey: ['/api/customers/reviews'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers/leaderboard'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Fetch loyalty tier
  const { data: loyaltyTier } = useQuery<LoyaltyTier | null>({
    queryKey: ['/api/customers/loyalty-tier'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!customer,
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number; reviewText: string }) => {
      const response = await apiRequest('POST', '/api/customers/reviews', reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted! 🌟",
        description: `You earned ${POINT_VALUES.REVIEW_SUBMITTED} points for your review!`,
      });
      setReviewText("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ['/api/customers/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/activities'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!customer || !customerProfile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const levelProgress = getProgressToNextLevel(customerProfile.totalPoints);
  const currentLevel = getCustomerLevel(customerProfile.totalPoints);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome back, {customerProfile.fullName}! 👋
          </h1>
          <p className="text-slate-600 mt-1">Track your journey and unlock amazing rewards</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => onViewChange('vehicles')}
          data-testid="button-browse-vehicles"
        >
          <Car className="w-4 h-4 mr-2" />
          Browse Vehicles
        </Button>
      </div>

      {/* Level Progress */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Level {currentLevel}</h3>
                <p className="text-blue-100">
                  {customerProfile.totalPoints} points total
                </p>
              </div>
            </div>
            {loyaltyTier && (
              <div className="text-right">
                <Badge className="bg-white/20 text-white border-white/30 mb-2">
                  {loyaltyTier.tierIcon} {loyaltyTier.tierName}
                </Badge>
                <p className="text-sm text-blue-100">
                  {loyaltyTier.discountPercentage}% discount on rentals
                </p>
              </div>
            )}
          </div>
          {currentLevel < LEVEL_THRESHOLDS.length && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to Level {currentLevel + 1}</span>
                <span>{Math.ceil(levelProgress.next - customerProfile.totalPoints)} points to go</span>
              </div>
              <Progress value={levelProgress.progress} className="bg-white/20" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Car className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{customerProfile.totalBookings}</p>
                <p className="text-sm text-slate-600">Total Bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{badges.length}</p>
                <p className="text-sm text-slate-600">Badges Earned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{customerProfile.totalPoints}</p>
                <p className="text-sm text-slate-600">Total Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">RM {parseFloat(customerProfile.totalSpent).toFixed(0)}</p>
                <p className="text-sm text-slate-600">Total Spent</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {badges.slice(0, 6).map((badge: CustomerBadge) => (
                    <div key={badge.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-2xl">{badge.badgeIcon}</span>
                      <div>
                        <p className="font-semibold">{badge.badgeTitle}</p>
                        <p className="text-xs text-slate-600">{badge.badgeDescription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Complete your first booking to earn badges!</p>
                  <Button 
                    onClick={() => onViewChange('vehicles')} 
                    className="mt-3"
                    data-testid="button-start-earning"
                  >
                    Start Earning Rewards
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Point Earning Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Earn More Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Complete a booking</p>
                      <p className="text-sm text-slate-600">+{POINT_VALUES.BOOKING_COMPLETED} points</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Write a review</p>
                      <p className="text-sm text-slate-600">+{POINT_VALUES.REVIEW_SUBMITTED} points</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Refer a friend</p>
                      <p className="text-sm text-slate-600">+{POINT_VALUES.REFERRAL_SUCCESSFUL} points</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Book 7 days ahead</p>
                      <p className="text-sm text-slate-600">+{POINT_VALUES.EARLY_BIRD_BOOKING} bonus points</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Medal className="w-5 h-5 mr-2" />
                Your Badge Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {badges.map((badge: CustomerBadge) => (
                    <div key={badge.id} className="text-center p-6 border rounded-xl hover:shadow-lg transition-shadow">
                      <div className="text-6xl mb-4">{badge.badgeIcon}</div>
                      <h3 className="font-bold text-lg mb-2">{badge.badgeTitle}</h3>
                      <p className="text-slate-600 text-sm mb-3">{badge.badgeDescription}</p>
                      <p className="text-xs text-slate-500">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">No badges yet</h3>
                  <p className="text-slate-500 mb-4">Start your rental journey to unlock amazing badges!</p>
                  <Button onClick={() => onViewChange('vehicles')} data-testid="button-start-journey">
                    Start Your Journey
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: CustomerActivity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{activity.description}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {activity.pointsEarned > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          +{activity.pointsEarned} pts
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Flame className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">No activity yet</h3>
                  <p className="text-slate-500">Your activity will appear here as you use our service!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          {/* Write Review Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Write a Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-slate-300'}`}
                      data-testid={`star-${star}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Review</label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with us..."
                  rows={4}
                  data-testid="textarea-review"
                />
              </div>
              <Button 
                onClick={() => submitReviewMutation.mutate({ rating, reviewText })}
                disabled={submitReviewMutation.isPending || !reviewText.trim()}
                data-testid="button-submit-review"
              >
                {submitReviewMutation.isPending ? "Submitting..." : `Submit Review (+${POINT_VALUES.REVIEW_SUBMITTED} points)`}
              </Button>
            </CardContent>
          </Card>

          {/* Previous Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Your Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: CustomerReview) => (
                    <div key={review.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${review.rating >= star ? 'text-yellow-400' : 'text-slate-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge variant="secondary">+{POINT_VALUES.REVIEW_SUBMITTED} pts</Badge>
                      </div>
                      <p className="text-slate-700">{review.reviewText}</p>
                      {review.staffResponse && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900">Staff Response:</p>
                          <p className="text-sm text-blue-800">{review.staffResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">No reviews yet</h3>
                  <p className="text-slate-500">Share your experience to help others and earn points!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Top Customers This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((customer: any, index: number) => (
                    <div key={customer.id} className={`flex items-center justify-between p-4 rounded-lg ${
                      customer.id === customerProfile.id ? 'bg-blue-50 border-blue-200 border-2' : 'bg-slate-50'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {customer.id === customerProfile.id ? 'You' : customer.fullName}
                          </p>
                          <p className="text-sm text-slate-600">Level {getCustomerLevel(customer.totalPoints)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{customer.totalPoints} pts</p>
                        <p className="text-sm text-slate-600">{customer.totalBookings} bookings</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">Leaderboard loading...</h3>
                  <p className="text-slate-500">Check back soon to see how you rank!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}