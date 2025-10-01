import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { deleteVehicleCascade } from "@/lib/deleteVehicleCascade";
import { useToast } from "@/hooks/use-toast";

export function VehicleDeleteButton({ vehicleId, onVehicleUpdate }) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteVehicleCascade(vehicleId);
      toast({
        title: "Vehicle Deleted",
        description: `Vehicle ${vehicleId} and its packages have been deleted`,
      });
      onVehicleUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleDelete}
      variant="destructive"
      size="sm"
      className="w-full mt-2"
    >
      <Trash className="h-4 w-4 mr-2" />
      Delete Vehicle
    </Button>
  );
}
