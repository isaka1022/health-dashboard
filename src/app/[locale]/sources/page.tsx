'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'
import { AppleHealthUpload } from '@/components/apple-health-upload'

export default function SourcesPage() {
  const [loading, setLoading] = useState(false)
  const [sheetName, setSheetName] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const { toast } = useToast()

  // Mock user ID - in real app this would come from authentication
  const mockUserId = 'user_123'

  const handleAddSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sheetName.trim() || !sheetUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both name and URL',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/sources/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sheetName,
          url: sheetUrl,
          userId: mockUserId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add sheet source')
      }

      toast({
        title: 'Success',
        description: 'Google Sheet source added successfully',
      })

      // Reset form
      setSheetName('')
      setSheetUrl('')

      // Trigger sync
      await fetch(`/api/sources/sheet/${result.source.id}/sync`, {
        method: 'POST',
      })

      toast({
        title: 'Sync Started',
        description: 'Your data is being imported. Check the dashboard in a few moments.',
      })

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
                <p className="text-sm text-gray-600">Connect your health data sources</p>
              </div>
              <Navigation />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Google Sheets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSheet} className="space-y-4">
                <div>
                  <Label htmlFor="sheetName">Source Name</Label>
                  <Input
                    id="sheetName"
                    type="text"
                    placeholder="My Health Data"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sheetUrl">Google Sheets URL</Label>
                  <Input
                    id="sheetUrl"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Make sure the sheet is publicly viewable
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Google Sheet'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Expected Columns:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Date (YYYY-MM-DD)</li>
                  <li>• Sleep Duration, Bedtime, Wake Time</li>
                  <li>• First Meal, Last Meal</li>
                  <li>• Exercise Duration, Exercise Type</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Apple Health */}
          <AppleHealthUpload 
            userId={mockUserId}
            onUploadComplete={() => {
              toast({
                title: 'Data Imported',
                description: 'Apple Health data has been imported. Check your dashboard for updated CAD scores.',
              })
            }}
          />
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Google シートの設定方法：</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>健康データを含むGoogleシートを作成</li>
                  <li><strong className="text-red-600">重要：</strong> シートの共有設定を「リンクを知っている全員が閲覧可能」に変更
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>右上の「共有」ボタンをクリック</li>
                      <li>「制限付き」を「リンクを知っている全員」に変更</li>
                      <li>「閲覧者」権限で十分です</li>
                    </ul>
                  </li>
                  <li>複数のシートタブがある場合、正しいタブを開いてURLをコピー（gid=XXXが含まれます）</li>
                  <li>完全なURLをコピーして上記に貼り付け</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Sample Sheet Template:</h4>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                  Date | Sleep Duration | Bedtime | Wake Time | First Meal | Last Meal | Exercise Duration | Exercise Type
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}