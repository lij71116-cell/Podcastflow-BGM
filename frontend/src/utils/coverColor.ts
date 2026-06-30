const DEFAULT_ACCENT = '#163d35'

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function extractAccentColorFromImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 32
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(DEFAULT_ACCENT)
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha < 128) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count += 1
        }
        if (count === 0) {
          resolve(DEFAULT_ACCENT)
          return
        }
        resolve(rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count)))
      } catch {
        resolve(DEFAULT_ACCENT)
      }
    }
    img.onerror = () => resolve(DEFAULT_ACCENT)
    img.src = imageUrl
  })
}
