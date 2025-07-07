import React, { useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

type BBox = {
  class_name: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

type ImageCanvasProps = {
  imageUrl: string | null
  bboxes: BBox[]
  loading: boolean
  style?: React.CSSProperties // Allow custom styling
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageUrl, bboxes, loading, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.src = imageUrl
    img.onload = () => {
      const aspectRatio = img.width / img.height
      const targetHeight = style?.height ? parseInt(style.height.toString(), 10) : img.height
      const targetWidth = targetHeight * aspectRatio

      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      bboxes.forEach((bbox) => {
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 4
        ctx.strokeRect(bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1)
        ctx.font = '16px Arial'
        ctx.fillStyle = 'yellow'
        ctx.fillText(
          `${bbox.class_name} (${(bbox.confidence * 100).toFixed(1)}%)`,
          bbox.x1,
          bbox.y1 > 20 ? bbox.y1 - 5 : bbox.y1 + 15
        )
      })
    }
  }, [imageUrl, bboxes, style])

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        mt: 2,
        ...style, // Apply custom styles
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ maxWidth: 500, border: '1px solid #ccc', display: 'block' }}
      />
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: 'white' }} />
        </Box>
      )}
    </Box>
  )
}

export default ImageCanvas