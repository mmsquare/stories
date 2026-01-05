import Foundation
import CoreMediaIO
import CoreVideo

class ExtensionStreamSource: NSObject, CMIOExtensionStreamSource {
    private(set) var stream: CMIOExtensionStream!
    
    // Stream Format
    private let width = 1920
    private let height = 1080
    private let frameRate = 30.0
    
    // Timer for generating black frames if no input
    private var timer: Timer?
    
    init(localizedName: String, streamID: UUID) {
        super.init()
        
        // format
        let formatDescription = createFormatDescription()
        
        // 1. Create Stream
        self.stream = CMIOExtensionStream(localizedName: localizedName, streamID: streamID, direction: .source, clockType: .hostTime, source: self)
        
        // 2. Set Format
        do {
            try stream.addFormat(CMIOExtensionStreamFormat(formatDescription: formatDescription, frameRate: frameRate, frameDuration: CMTime(value: 1, timescale: Int32(frameRate))))
            stream.activeFormatIndex = 0
        } catch {
            print("Error setting format: \(error)")
        }
    }
    
    private func createFormatDescription() -> CMFormatDescription {
        var formatDescription: CMFormatDescription?
        CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCMVideoCodecType_422YpCbCr8, // Common web cam format
            width: Int32(width),
            height: Int32(height),
            extensions: nil,
            formatDescriptionOut: &formatDescription
        )
        return formatDescription!
    }
    
    var availableProperties: Set<CMIOExtensionProperty> {
        return [.streamActiveFormatIndex, .streamFrameDuration]
    }
    
    func streamProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionStreamProperties {
        let streamProperties = CMIOExtensionStreamProperties(dictionary: [:])
        if properties.contains(.streamActiveFormatIndex) {
            streamProperties.activeFormatIndex = 0
        }
        if properties.contains(.streamFrameDuration) {
            streamProperties.frameDuration = CMTime(value: 1, timescale: Int32(frameRate))
        }
        return streamProperties
    }
    
    func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties) throws {
        if let index = streamProperties.activeFormatIndex {
            stream.activeFormatIndex = index
        }
    }
    
    func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
        return true
    }
    
    func startStream() throws {
        // Start generating frames
        // In a real implementation, this connects to the 'Sink' from the main app.
        // For this MVP, we will start a timer that emits a placeholder frame.
        startFrameTimer()
    }
    
    func stopStream() throws {
        stopFrameTimer()
    }
    
    // MARK: - Frame Generation (Placeholder)
    
    private func startFrameTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / frameRate, repeats: true) { [weak self] _ in
            self?.emitFrame()
        }
    }
    
    private func stopFrameTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func emitFrame() {
        // Create a buffer (Black or Test Pattern)
        // This is where we would read from shared memory (IOSurface) populated by the Main App
        guard let buffer = createTestPixelBuffer() else { return }
        
        // Wrap in SampleBuffer
        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: Int32(frameRate)),
            presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
            decodeTimeStamp: .invalid
        )
        
        var sampleBuffer: CMSampleBuffer?
        var formatDesc: CMFormatDescription?
        CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: buffer, formatDescriptionOut: &formatDesc)
        
        guard let format = formatDesc else { return }
        
        CMSampleBufferCreateForImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: buffer,
            dataReady: true,
            makeDataReadyCallback: nil,
            refcon: nil,
            formatDescription: format,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        
        if let sampleBuffer = sampleBuffer {
            stream.send(sampleBuffer, discontinuity: [], hostTimeInNanoseconds: UInt64(timing.presentationTimeStamp.seconds * 1_000_000_000))
        }
    }
    
    private func createTestPixelBuffer() -> CVPixelBuffer? {
        // Helper to create a buffer
        var buffer: CVPixelBuffer?
        let attrs = [
            kCVPixelBufferCGImageCompatibilityKey: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey: true,
            kCVPixelBufferWidthKey: width,
            kCVPixelBufferHeightKey: height
        ] as [CFString : Any] as CFDictionary
        
        CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, attrs, &buffer)
        
        // Draw something distinctive
        if let buffer = buffer {
            CVPixelBufferLockBaseAddress(buffer, [])
            let context = CGContext(
                data: CVPixelBufferGetBaseAddress(buffer),
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
            )
            
            context?.setFillColor(CGColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1))
            context?.fill(CGRect(x: 0, y: 0, width: width, height: height))
            
            // Draw Text
            // ... (Simplified: just return the dark gray buffer for now)
            
            CVPixelBufferUnlockBaseAddress(buffer, [])
        }
        
        return buffer
    }
}

