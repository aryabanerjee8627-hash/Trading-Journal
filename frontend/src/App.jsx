import React, { useState, useEffect } from 'react'
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton,
  useUser,
  useAuth
} from '@clerk/clerk-react'
import { api } from './lib/api'
import StatsCards from './components/StatsCards'
import TradingCharts from './components/TradingCharts'
import TradeForm from './components/TradeForm'
import TradeList from './components/TradeList'
import FluidBackground from './components/FluidBackground'
// import AnimatedBackground from './components/AnimatedBackground'
import CursorFollower from './components/CursorFollower'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

export default function App() {
  const { user } = useUser()
  const { isSignedIn, getToken } = useAuth()
  const [trades, setTrades] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)

  useEffect(() => {
    if (isSignedIn) {
      fetchData()
    } else {
      setTrades([])
      setStats(null)
      setLoading(false)
    }
  }, [isSignedIn])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tradesData, statsData] = await Promise.all([
        api.get('/trades/', getToken),
        api.get('/trades/stats', getToken)
      ])
      setTrades(tradesData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrade = async (tradeData) => {
    try {
      await api.post('/trades/', tradeData, getToken)
      fetchData()
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create trade:', error)
      alert('Failed to create trade: ' + error.message)
    }
  }

  const handleUpdateTrade = async (tradeData) => {
    try {
      await api.put(`/trades/${editingTrade.id}`, tradeData, getToken)
      fetchData()
      setShowForm(false)
      setEditingTrade(null)
    } catch (error) {
      console.error('Failed to update trade:', error)
      alert('Failed to update trade: ' + error.message)
    }
  }

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return
    try {
      await api.delete(`/trades/${tradeId}`, getToken)
      fetchData()
    } catch (error) {
      console.error('Failed to delete trade:', error)
    }
  }

  const handleEditClick = (trade) => {
    setEditingTrade(trade)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen">
      <FluidBackground />
      {/* <AnimatedBackground /> */}
      <CursorFollower />
      <SignedOut>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Fire Forex Analytics & Journal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Log your trades, track your progress, and analyze your forex trading performance.</p>
              <SignInButton mode="modal">
                <Button className="w-full" size="lg">Sign In to Start</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="p-8 max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Fire Forex Analytics & Journal</h1>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <div className="flex items-center gap-4">
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>Add Trade</Button>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>

          <main>
            {showForm ? (
              <TradeForm 
                initialData={editingTrade}
                onSubmit={editingTrade ? handleUpdateTrade : handleAddTrade}
                onCancel={() => {
                  setShowForm(false)
                  setEditingTrade(null)
                }}
              />
            ) : (
              <>
                {loading ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 animate-pulse">
                          <div className="flex justify-between items-center mb-3">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-4 w-4 bg-muted rounded" />
                          </div>
                          <div className="h-8 w-20 bg-muted rounded mb-1" />
                          <div className="h-3 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 animate-pulse">
                          <div className="h-4 w-40 bg-muted rounded mb-4" />
                          <div className="h-60 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <StatsCards stats={stats} />
                    <TradingCharts trades={trades} />
                    <TradeList 
                      trades={trades} 
                      onEdit={handleEditClick}
                      onDelete={handleDeleteTrade}
                    />
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </SignedIn>
    </div>
  )
}

