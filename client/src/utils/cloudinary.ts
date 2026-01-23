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
 * Get Cloudinary video URL
 */
export function getVideoUrl(cloudName: string, publicId: string): string {
  if (!cloudName || !publicId) return ''
  return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`
}

