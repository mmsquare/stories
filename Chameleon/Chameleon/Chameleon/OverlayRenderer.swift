import Foundation
import CoreImage
import CoreGraphics
import AppKit

class OverlayRenderer {
    private let context = CIContext()
    
    func render(pixelBuffer: CVPixelBuffer, reaction: Reaction) -> CVPixelBuffer? {
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // If no reaction, return original (or maybe just listening?)
        if reaction == .none {
            return pixelBuffer
        }
        
        // Create overlay
        guard let overlay = createOverlay(for: reaction, size: ciImage.extent.size) else {
            return pixelBuffer
        }
        
        // Composite
        let composition = overlay.composited(over: ciImage)
        
        // Render back to CVPixelBuffer
        // Note: In a real high-perf app, we might use a pixel buffer pool here to avoid allocation
        // For MVP, we'll render to a new buffer or the same one if possible (CIContext can render to CVPixelBuffer)
        
        return renderToBuffer(image: composition, originalBuffer: pixelBuffer)
    }
    
    private func createOverlay(for reaction: Reaction, size: CGSize) -> CIImage? {
        let color: CIColor
        let emoji: String
        
        switch reaction {
        case .agree:
            color = CIColor(red: 0, green: 1, blue: 0, alpha: 0.8) // Green
            emoji = "👍 Agree"
        case .disagree:
            color = CIColor(red: 1, green: 0, blue: 0, alpha: 0.8) // Red
            emoji = "👎 Disagree"
        case .celebrate:
            color = CIColor(red: 0.8, green: 0, blue: 0.8, alpha: 0.8) // Purple
            emoji = "🎉 Celebrate"
        case .confused:
            color = CIColor(red: 1, green: 1, blue: 0, alpha: 0.8) // Yellow
            emoji = "🤔 Confused"
        case .listening:
            color = CIColor(red: 0, green: 0, blue: 1, alpha: 0.4) // Blue, subtle
            emoji = "👂 Listening"
        case .none:
            return nil
        }
        
        // 1. Border Overlay
        // We can generate a border by drawing a rectangle with a stroke
        // For CIImage, it's easier to use a generator filter or perform drawing in CGContext and convert to CIImage
        
        return drawOverlayUsingCoreGraphics(size: size, color: color, text: emoji)
    }
    
    private func drawOverlayUsingCoreGraphics(size: CGSize, color: CIColor, text: String) -> CIImage? {
        // Create a transparent context
        let width = Int(size.width)
        let height = Int(size.height)
        let bitsPerComponent = 8
        let bytesPerRow = 4 * width
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        
        guard let context = CGContext(data: nil,
                                      width: width,
                                      height: height,
                                      bitsPerComponent: bitsPerComponent,
                                      bytesPerRow: bytesPerRow,
                                      space: colorSpace,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
            return nil
        }
        
        // Draw Border
        let rect = CGRect(x: 0, y: 0, width: width, height: height)
        let borderWidth: CGFloat = 20.0
        
        context.setStrokeColor(red: color.red, green: color.green, blue: color.blue, alpha: color.alpha)
        context.setLineWidth(borderWidth)
        context.stroke(rect)
        
        // Draw Text/Emoji Background pill
        let fontSize: CGFloat = 64.0
        let font = CTFontCreateWithName("Helvetica" as CFString, fontSize, nil)
        
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: NSColor.white
        ]
        
        let attributedString = NSAttributedString(string: text, attributes: attributes)
        let line = CTLineCreateWithAttributedString(attributedString)
        let bounds = CTLineGetImageBounds(line, context)
        
        // Pill background
        let padding: CGFloat = 20
        let pillRect = CGRect(x: (CGFloat(width) - bounds.width) / 2 - padding,
                              y: 50, // Bottom offset
                              width: bounds.width + padding * 2,
                              height: bounds.height + padding * 2)
        
        context.setFillColor(red: color.red, green: color.green, blue: color.blue, alpha: color.alpha)
        // Rounded rect manually or simple rect
        context.fill(pillRect)
        
        // Draw Text
        context.textPosition = CGPoint(x: (CGFloat(width) - bounds.width) / 2, y: 50 + padding)
        CTLineDraw(line, context)
        
        // Convert to CIImage
        if let cgImage = context.makeImage() {
            return CIImage(cgImage: cgImage)
        }
        return nil
    }
    
    private func renderToBuffer(image: CIImage, originalBuffer: CVPixelBuffer) -> CVPixelBuffer? {
        // We need to render into a pixel buffer.
        // Ideally we use a pool. For now, let's try to render back into the original if allowed,
        // or create a new one matching the original's attributes.
        
        // For safety in this MVP, let's create a copy to avoid modifying the input buffer in place
        // if it's being read by something else (though AVFoundation buffers are usually copy-on-write or pooled).
        // However, CVPixelBufferCreate is verbose.
        
        // Simplified: Render to the input buffer directly if possible.
        // CIContext.render(_:to:) works.
        
        context.render(image, to: originalBuffer)
        return originalBuffer
    }
}

