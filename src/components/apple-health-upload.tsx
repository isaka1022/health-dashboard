'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface AppleHealthUploadProps {
  userId: string
  onUploadComplete?: () => void
}

export function AppleHealthUpload({ userId, onUploadComplete }: AppleHealthUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.zip')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an Apple Health export XML file or ZIP archive.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 50MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      const response = await fetch('/api/imports/apple-health', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      toast({
        title: 'Upload Successful',
        description: `Processed ${result.recordsProcessed} health records from your Apple Health data.`,
      })

      onUploadComplete?.()

    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Apple Health Import
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
            ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-gray-400'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.zip"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              {uploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <span className="text-2xl">📱</span>
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                {uploading ? 'Processing...' : 'Upload Apple Health Data'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {uploading 
                  ? 'Parsing your health data and importing records...'
                  : 'Drag and drop your Apple Health export file here, or click to select'
                }
              </p>
            </div>

            {!uploading && (
              <Button variant="outline">
                Choose File
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">How to Export from Apple Health:</h4>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open the Health app on your iPhone</li>
              <li>Tap your profile picture in the top right</li>
              <li>Scroll down and tap &quot;Export All Health Data&quot;</li>
              <li>Wait for the export to complete</li>
              <li>Share the export.xml file to this device</li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Supported Data:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Sleep analysis (bedtime, wake time, duration)</li>
              <li>• Workout sessions (type, duration, calories)</li>
              <li>• Heart rate measurements</li>
              <li>• Daily step counts</li>
              <li>• Active energy burned</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Privacy & Security:</h4>
            <p className="text-xs text-gray-600">
              Your health data is processed locally and stored securely. 
              The uploaded file is deleted immediately after processing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}