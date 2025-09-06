import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  MapPin, 
  Clock, 
  Package, 
  User, 
  Truck, 
  Route, 
  AlertTriangle, 
  Edit, 
  Save, 
  Plus,
  Trash2,
  Navigation
} from 'lucide-react';

interface Package {
  id: string;
  recipient: string;
  address: string;
  status: 'pending' | 'in-transit' | 'delivered';
  priority: 'low' | 'medium' | 'high';
  weight?: number;
  notes?: string;
}

interface Vehicle {
  vehicle_id: string;
  driver: string;
  location: string;
  next_stop: string;
  packages: number;
  status: string;
  speed: number;
  eta: string;
  lat?: number;
  lng?: number;
  fuel?: number;
  battery?: number;
  mileage?: number;
  last_maintenance?: string;
}

interface VehicleDetailsDrawerProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdate: () => void;
}

export function VehicleDetailsDrawer({ vehicle, isOpen, onClose, onVehicleUpdate }: VehicleDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<Vehicle | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState<Partial<Package>>({
    recipient: '',
    address: '',
    status: 'pending',
    priority: 'medium',
    weight: 0,
    notes: ''
  });

  useEffect(() => {
    if (vehicle) {
      setEditedVehicle({ ...vehicle });
      // Mock packages data - in real app this would come from API
      setPackages([
        {
          id: 'PKG-001',
          recipient: 'John Doe',
          address: '123 Main St, Downtown',
          status: 'in-transit',
          priority: 'high',
          weight: 2.5,
          notes: 'Fragile - Handle with care'
        },
        {
          id: 'PKG-002',
          recipient: 'Jane Smith',
          address: '456 Oak Ave, Midtown',
          status: 'pending',
          priority: 'medium',
          weight: 1.2
        },
        {
          id: 'PKG-003',
          recipient: 'Bob Johnson',
          address: '789 Pine Rd, Uptown',
          status: 'delivered',
          priority: 'low',
          weight: 0.8
        }
      ]);
    }
  }, [vehicle]);

  if (!isOpen || !vehicle) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getPackageStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in-transit': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleSave = () => {
    // In real app, this would call API to update vehicle
    setIsEditing(false);
    onVehicleUpdate();
  };

  const handleAddPackage = () => {
    if (!newPackage.recipient || !newPackage.address) return;
    
    const packageToAdd: Package = {
      id: `PKG-${String(packages.length + 1).padStart(3, '0')}`,
      recipient: newPackage.recipient!,
      address: newPackage.address!,
      status: newPackage.status as Package['status'] || 'pending',
      priority: newPackage.priority as Package['priority'] || 'medium',
      weight: newPackage.weight || 0,
      notes: newPackage.notes || ''
    };

    setPackages(prev => [...prev, packageToAdd]);
    setNewPackage({
      recipient: '',
      address: '',
      status: 'pending',
      priority: 'medium',
      weight: 0,
      notes: ''
    });
    setShowAddPackage(false);
  };

  const handleRemovePackage = (packageId: string) => {
    setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Truck className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">{vehicle.vehicle_id}</h2>
            </div>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`} />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-b border-slate-700/50 rounded-none">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="route">Route</TabsTrigger>
            </TabsList>

            {/* Vehicle Details */}
            <TabsContent value="details" className="p-6 space-y-6">
              {/* Driver Info */}
              <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <User className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">Driver</h3>
                </div>
                {isEditing ? (
                  <Input
                    value={editedVehicle?.driver || ''}
                    onChange={(e) => setEditedVehicle(prev => prev ? { ...prev, driver: e.target.value } : null)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                ) : (
                  <p className="text-slate-300">{vehicle.driver}</p>
                )}
              </Card>

              {/* Status & Location */}
              <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      <span className="text-white font-medium">Location</span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(vehicle.status).replace('bg-', 'border-') + ' text-white'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <p className="text-slate-300">{vehicle.location}</p>
                  
                  <div className="flex items-center space-x-2">
                    <Navigation className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">Next Stop:</span>
                  </div>
                  <p className="text-slate-300">{vehicle.next_stop}</p>
                </div>
              </Card>

              {/* Performance Metrics */}
              <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                <h3 className="text-lg font-medium text-white mb-4">Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Speed</span>
                      <span className="text-white">{vehicle.speed} mph</span>
                    </div>
                    <Progress value={(vehicle.speed / 60) * 100} className="h-2" />
                  </div>
                  
                  {vehicle.fuel && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Fuel</span>
                        <span className="text-white">{vehicle.fuel}%</span>
                      </div>
                      <Progress value={vehicle.fuel} className="h-2" />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">ETA</span>
                      <p className="text-white font-medium">{vehicle.eta}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Packages</span>
                      <p className="text-white font-medium">{vehicle.packages}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Packages */}
            <TabsContent value="packages" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Packages ({packages.length})</h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddPackage(true)}
                  className="bg-blue-600/80 hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {showAddPackage && (
                <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                  <div className="space-y-3">
                    <Input
                      placeholder="Recipient"
                      value={newPackage.recipient || ''}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, recipient: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    <Input
                      placeholder="Address"
                      value={newPackage.address || ''}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleAddPackage}
                        className="bg-green-600/80 hover:bg-green-600"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddPackage(false)}
                        className="border-slate-600 text-slate-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-3">
                {packages.map((pkg) => (
                  <Card key={pkg.id} className="bg-slate-800/50 border-slate-700/50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white">{pkg.id}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getPackageStatusColor(pkg.status)}>
                          {pkg.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(pkg.priority)}>
                          {pkg.priority}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePackage(pkg.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-white">{pkg.recipient}</p>
                      <p className="text-xs text-slate-400">{pkg.address}</p>
                      {pkg.weight && (
                        <p className="text-xs text-slate-400">Weight: {pkg.weight} lbs</p>
                      )}
                      {pkg.notes && (
                        <p className="text-xs text-slate-300 italic">{pkg.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Route */}
            <TabsContent value="route" className="p-6 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Route className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">Route Planning</h3>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                <div className="text-center text-slate-400 py-8">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <div className="text-sm">Route Optimization</div>
                  <div className="text-xs">Coming Soon</div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="p-6 border-t border-slate-700/50">
            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                className="flex-1 bg-green-600/80 hover:bg-green-600"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
