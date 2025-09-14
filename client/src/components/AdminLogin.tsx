import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, LogOut, Clock, Users, Plus, Edit, Trash2, Eye, Ban, Key
} from "lucide-react";

interface AdminLoginProps {
  onViewChange: (view: string) => void;
}

export default function AdminLogin({ onViewChange }: AdminLoginProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [auth, setAuth] = useState({ username: "", password: "" });
  const [staffLogs, setStaffLogs] = useState<any[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] = useState<number | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({ username: "", password: "" });
  const { toast } = useToast();

  const handleAuthentication = async () => {
    try {
      const response = await fetch('/api/staff/logs/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth)
      });
      
      if (response.ok) {
        const logs = await response.json();
        setStaffLogs(logs);
        setAuthenticated(true);
        
        // Fetch staff members for filtering
        try {
          const staffResponse = await fetch('/api/staff/members');
          if (staffResponse.ok) {
            const members = await staffResponse.json();
            setStaffMembers(members);
            setAllStaff(members);
          }
        } catch (err) {
          console.error('Failed to fetch staff members:', err);
        }
        
        toast({
          title: "Access Granted",
          description: "Admin panel loaded successfully."
        });
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid admin credentials.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const refreshLogs = async () => {
    try {
      const response = await fetch('/api/staff/logs/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...auth, 
          staffId: selectedStaffMember 
        })
      });
      
      if (response.ok) {
        const logs = await response.json();
        setStaffLogs(logs);
        toast({
          title: "Logs Updated",
          description: selectedStaffMember ? 
            `Showing logs for staff ID ${selectedStaffMember}` : 
            "Showing all staff logs"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update logs",
        variant: "destructive"
      });
    }
  };

  const addStaff = async () => {
    try {
      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });
      
      if (response.ok) {
        toast({
          title: "Staff Added",
          description: `New staff member ${newStaff.username} has been created.`
        });
        setNewStaff({ username: "", password: "" });
        setIsAddingStaff(false);
        
        // Refresh staff list
        const staffResponse = await fetch('/api/staff/members');
        if (staffResponse.ok) {
          const members = await staffResponse.json();
          setAllStaff(members);
          setStaffMembers(members);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Add Staff",
          description: error.message || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive"
      });
    }
  };

  const resetStaffPassword = async (staffId: number, newPassword: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      if (response.ok) {
        toast({
          title: "Password Reset",
          description: "Staff member password has been reset successfully."
        });
      } else {
        toast({
          title: "Failed to Reset Password",
          description: "Could not reset staff member password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const removeStaff = async (staffId: number, username: string) => {
    if (window.confirm(`Are you sure you want to remove staff member "${username}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/staff/${staffId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          toast({
            title: "Staff Removed",
            description: `Staff member ${username} has been removed.`
          });
          
          // Refresh staff list
          const staffResponse = await fetch('/api/staff/members');
          if (staffResponse.ok) {
            const members = await staffResponse.json();
            setAllStaff(members);
            setStaffMembers(members);
          }
        } else {
          toast({
            title: "Failed to Remove Staff",
            description: "Could not remove staff member",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove staff member",
          variant: "destructive"
        });
      }
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <p className="text-slate-600">Enter admin credentials to access the panel</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={auth.username}
                onChange={(e) => setAuth(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={auth.password}
                onChange={(e) => setAuth(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>
            <Button
              onClick={handleAuthentication}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Access Admin Panel
            </Button>
            <Button
              onClick={() => onViewChange('role-selection')}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
                <p className="text-sm text-slate-600">Staff Activity & Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => onViewChange('role-selection')}
                variant="outline"
                size="sm"
              >
                Back to Home
              </Button>
              <Button
                onClick={() => {
                  setAuthenticated(false);
                  setStaffLogs([]);
                  setStaffMembers([]);
                  setAllStaff([]);
                  setSelectedStaffMember(null);
                  setAuth({ username: "", password: "" });
                }}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Staff Activity</TabsTrigger>
            <TabsTrigger value="management">Staff Management</TabsTrigger>
          </TabsList>

          {/* Staff Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  Staff Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedStaffMember?.toString() || "all"} onValueChange={(value) => setSelectedStaffMember(value === "all" ? null : parseInt(value))}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Staff Members" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff Members</SelectItem>
                        {staffMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.username} (ID: {member.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={refreshLogs} size="sm" variant="outline">
                      <Clock className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {staffLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-slate-600">No activity logs found</p>
                    </div>
                  ) : (
                    staffLogs
                      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 15)
                      .map((log: any) => {
                        const isLogin = log.action === 'STAFF_LOGIN';
                        const actionColor = isLogin ? 'text-green-600' : log.action.includes('DELETE') ? 'text-red-600' : 'text-blue-600';
                        const actionIcon = isLogin ? '🔐' : log.action.includes('DELETE') ? '🗑️' : log.action.includes('CREATE') ? '➕' : '✏️';
                        
                        return (
                          <Card key={log.id} className={`${isLogin ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <span className="mr-2 text-lg">{actionIcon}</span>
                                  <span className="font-bold text-slate-800">{log.staffUsername}</span>
                                  <span className="text-sm text-slate-500 ml-2">ID: {log.staffId}</span>
                                  {isLogin && <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">LOGIN</span>}
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                <div>
                                  <span className="text-slate-600">Action:</span>
                                  <span className={`font-bold ml-2 ${actionColor}`}>{log.action.replace(/_/g, ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Target:</span>
                                  <span className="font-medium ml-2">{log.targetType} #{log.targetId || 'N/A'}</span>
                                </div>
                              </div>

                              {/* Details */}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  <span className="text-xs text-slate-600 font-medium">Details:</span>
                                  <div className="mt-1 text-xs">
                                    {Object.entries(log.details).map(([key, value]) => (
                                      <div key={key} className="mb-1">
                                        <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                        <span className="ml-2 font-medium">
                                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="management" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-500" />
                    Staff Management
                  </CardTitle>
                  <Button onClick={() => setIsAddingStaff(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingStaff && (
                  <Card className="mb-4 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">Add New Staff Member</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Username</label>
                          <input
                            type="text"
                            value={newStaff.username}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, username: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Password</label>
                          <input
                            type="password"
                            value={newStaff.password}
                            onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Enter password"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-3">
                        <Button onClick={addStaff} size="sm">
                          Add Staff
                        </Button>
                        <Button onClick={() => setIsAddingStaff(false)} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {allStaff.map((staff) => (
                    <Card key={staff.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{staff.username}</h4>
                            <p className="text-sm text-slate-600">ID: {staff.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => {
                                const newPassword = prompt(`Enter new password for ${staff.username}:`);
                                if (newPassword) {
                                  resetStaffPassword(staff.id, newPassword);
                                }
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Reset Password
                            </Button>
                            <Button
                              onClick={() => removeStaff(staff.id, staff.username)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}