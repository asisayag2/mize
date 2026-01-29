/**
 * Get Cloudinary image URL
 */
export function getImageUrl(
  cloudName: string, 
  publicId: string, 
  options?: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'limit' | 'scale'
    quality?: 'auto' | number
    format?: 'auto' | 'webp' | 'jpg' | 'png'
  }
): string {
  if (!cloudName || !publicId) return ''
  
  const transformations: string[] = []
  
  if (options?.width) transformations.push(`w_${options.width}`)
  if (options?.height) transformations.push(`h_${options.height}`)
  if (options?.crop) transformations.push(`c_${options.crop}`)
  if (options?.quality) transformations.push(`q_${options.quality}`)
  if (options?.format) transformations.push(`f_${options.format}`)
  
  const transformStr = transformations.length > 0 
    ? transformations.join(',') + '/'
    : ''
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`
}

/**
 * Get Cloudinary video URL with automatic optimization
 */
export function getVideoUrl(
  cloudName: string, 
  publicId: string,
  options?: {
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number
    format?: 'auto' | 'mp4' | 'webm'
  }
): string {
  if (!cloudName || !publicId) return ''
  
  const transformations: string[] = [
    'f_auto:video', // Automatic best video format (webm, mp4, etc.)
    `q_${options?.quality || 'auto'}`, // Automatic quality optimization
  ]
  
  const transformStr = transformations.join(',') + '/'
  
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformStr}${publicId}`
}

