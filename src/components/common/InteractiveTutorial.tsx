import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  Package, 
  Map, 
  Play, 
  FastForward, 
  Pause, 
  RotateCcw, 
  Zap, 
  X,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  highlightElement?: string; // CSS selector for element to highlight
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to FleetLink!",
    description: "Your Fleet Management & Route Optimization Platform",
    icon: <Truck className="w-8 h-8" />,
    details: [
      "Track vehicles in real-time",
      "Optimize delivery routes automatically",
      "Simulate fleet operations",
      "Monitor delivery progress"
    ]
  },
  {
    title: "Step 1: Add a Vehicle",
    description: "Start by adding a vehicle to your fleet",
    icon: <Truck className="w-8 h-8" />,
    details: [
      "Click the 'Add Vehicle' button in the top toolbar",
      "Enter vehicle details (ID, driver name, location)",
      "The vehicle will appear on the map",
      "You can add multiple vehicles to your fleet"
    ],
    highlightElement: "[data-tutorial='add-vehicle']"
  },
  {
    title: "Step 2: Add Packages",
    description: "Assign delivery packages to your vehicle",
    icon: <Package className="w-8 h-8" />,
    details: [
      "Click on a vehicle card or map marker",
      "Click 'Add Package' in the vehicle details panel",
      "Enter destination, weight, and priority",
      "Add multiple packages for delivery stops",
      "Each package represents a delivery location"
    ],
    highlightElement: "[data-tutorial='add-package']"
  },
  {
    title: "Step 3: Generate Route",
    description: "Create an optimized delivery route",
    icon: <Map className="w-8 h-8" />,
    details: [
      "Select a vehicle with packages assigned",
      "Click 'Generate Route' button",
      "The system will optimize the delivery sequence",
      "Route appears as a blue line on the map",
      "Shows estimated distance and duration"
    ],
    highlightElement: "[data-tutorial='generate-route']"
  },
  {
    title: "Step 4: Start Simulation",
    description: "Watch your vehicle make deliveries",
    icon: <Play className="w-8 h-8" />,
    details: [
      "Click 'Start Simulation' to begin",
      "Vehicle moves along the optimized route",
      "Watch real-time progress on the map",
      "Packages are marked as delivered at each stop",
      "Track completion percentage"
    ],
    highlightElement: "[data-tutorial='start-simulation']"
  },
  {
    title: "Control Simulation Speed",
    description: "Speed up or slow down the simulation",
    icon: <FastForward className="w-8 h-8" />,
    details: [
      "Use speed controls: 1x, 2x, 5x, 10x",
      "Faster speeds for quick testing",
      "Pause simulation anytime",
      "Resume from where you left off",
      "Reset to start simulation over"
    ],
    highlightElement: "[data-tutorial='speed-control']"
  },
  {
    title: "Quick Add Features",
    description: "Rapid fleet setup tools",
    icon: <Zap className="w-8 h-8" />,
    details: [
      "'Quick Add Vehicle': Instantly add a vehicle with random location",
      "'Quick Add Package': Add package to selected vehicle quickly",
      "'Add 5 Vehicles': Bulk add multiple vehicles at once",
      "Perfect for testing and demonstrations",
      "All features work with real map data"
    ],
    highlightElement: "[data-tutorial='quick-add']"
  },
  {
    title: "Additional Controls",
    description: "Other helpful features",
    icon: <RotateCcw className="w-8 h-8" />,
    details: [
      "'Clear All': Remove all vehicles and packages",
      "'Reset Simulation': Stop and clear current simulation",
      "Click map to select different vehicles",
      "Vehicle cards show status and progress",
      "Map markers indicate delivery locations"
    ]
  },
  {
    title: "You're Ready!",
    description: "Start managing your fleet",
    icon: <Check className="w-8 h-8" />,
    details: [
      "Add your first vehicle to get started",
      "Experiment with different routes",
      "Try the quick add features",
      "You can replay this tutorial anytime from settings"
    ]
  }
];

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function InteractiveTutorial({ onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const totalSteps = tutorialSteps.length;
  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  // Highlight the target element
  useEffect(() => {
    if (step.highlightElement) {
      const element = document.querySelector(step.highlightElement);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        return () => {
          element.classList.remove('tutorial-highlight');
        };
      }
    }
  }, [step.highlightElement]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300" />
      
      {/* Tutorial Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-2xl pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={handleSkip}
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                {step.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{step.title}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {step.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step Details */}
            <div className="space-y-3">
              {step.details.map((detail, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip Tutorial
              </Button>

              <Button
                onClick={handleNext}
                className="gap-2"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSS for highlighting */}
      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 45 !important;
          animation: pulse-highlight 2s ease-in-out infinite;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          border-radius: 8px;
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </>
  );
}
