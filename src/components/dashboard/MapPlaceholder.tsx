import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, RefreshCw, Layers } from "lucide-react";

export function MapPlaceholder() {
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Live Fleet Map</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Layers className="h-4 w-4 mr-2" />
              Layers
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-64 h-48 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
            <div className="space-y-2 text-center">
              <Navigation className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Interactive Map</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Real-time vehicle tracking</p>
            <p className="text-xs text-muted-foreground">
              Connect to enable live GPS tracking, route optimization, and traffic updates
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}