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
    <div className="min-h-screen bg-background">
      <SignedOut>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Trading Journal 3.0</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Log your trades, track your progress, and analyze your performance.</p>
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
              <h1 className="text-3xl font-bold">Trading Journal</h1>
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
                  <p className="text-center py-12">Loading data...</p>
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

