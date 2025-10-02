import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from './AuthProvider'
import { Loader2, Truck, MapPin, BarChart3, Users, Shield, Zap } from 'lucide-react'
import ThreeBackground from './ThreeBackground'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('signin')

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent, isSignUp: boolean) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Account created successfully! You are now logged in.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* 3D Background */}
      <ThreeBackground className="opacity-30" />
      
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-blue-50/60" />
      
      {/* FleetLink branding - large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <h1 className="text-[8rem] md:text-[12rem] font-bold text-blue-600/5 leading-none tracking-wider select-none">
            FleetLink
          </h1>
          <div className="flex items-center justify-center gap-8 mt-8 text-blue-400/10">
            <Truck className="w-16 h-16" />
            <MapPin className="w-16 h-16" />
            <BarChart3 className="w-16 h-16" />
            <Users className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/25">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  FleetLink
                </h1>
                <p className="text-blue-600/70 text-sm font-medium">Fleet Management System</p>
              </div>
            </div>
          </div>

          {/* Auth card */}
          <Card className="bg-white/90 backdrop-blur-xl border border-blue-100/50 shadow-2xl shadow-blue-600/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-2xl font-bold text-slate-800">
                Welcome to FleetLink
              </CardTitle>
              <CardDescription className="text-center text-slate-600">
                Manage your fleet with precision and ease
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-blue-50">
                  <TabsTrigger 
                    value="signin" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-slate-700 font-medium">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                        className="h-12 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-slate-700 font-medium">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        minLength={6}
                        className="h-12 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 transition-all duration-200" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      <Shield className="mr-2 h-5 w-5" />
                      Sign In to FleetLink
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-slate-700 font-medium">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                        className="h-12 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-slate-700 font-medium">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Create a secure password (min 6 characters)"
                        minLength={6}
                        className="h-12 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 shadow-lg shadow-blue-600/25 transition-all duration-200" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      <Zap className="mr-2 h-5 w-5" />
                      Create FleetLink Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Features */}
              <div className="mt-6 pt-6 border-t border-blue-100">
                <p className="text-xs text-slate-500 text-center mb-4 font-medium">Trusted by fleet managers worldwide</p>
                <div className="flex justify-center gap-8 text-blue-600/60">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">Real-time Tracking</span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">Route Optimization</span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">Advanced Analytics</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}