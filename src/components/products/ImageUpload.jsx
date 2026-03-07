import { useRef, useCallback } from 'react'
import { Camera, X } from 'lucide-react'

export default function ImageUpload({ images = [], onChange, maxImages = 10 }) {
  const inputRef = useRef(null)

  const handleFiles = useCallback(
    (fileList) => {
      const newFiles = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/')
      )
      const combined = [...images, ...newFiles].slice(0, maxImages)
      onChange(combined)
    },
    [images, maxImages, onChange]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleChange = useCallback(
    (e) => {
      if (e.target.files.length) {
        handleFiles(e.target.files)
        e.target.value = ''
      }
    },
    [handleFiles]
  )

  const removeImage = useCallback(
    (index) => {
      const updated = images.filter((_, i) => i !== index)
      onChange(updated)
    },
    [images, onChange]
  )

  const getPreviewUrl = (image) => {
    if (typeof image === 'string') return image
    return URL.createObjectURL(image)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        disabled={images.length >= maxImages}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-brand hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="h-8 w-8 text-gray-400" />
        <span className="text-sm text-gray-500">
          Drop photos here or tap to upload
        </span>
        <span className="text-xs text-gray-400">
          {images.length}/{maxImages} images
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* Thumbnail strip */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 h-20 w-20 rounded-[8px] overflow-hidden bg-gray-100"
            >
              <img
                src={getPreviewUrl(image)}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
