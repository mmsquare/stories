import Foundation
import AVFoundation
import CoreImage
import Combine

class CameraManager: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published var error: String?
    @Published var isStreaming = false
    
    // Dependencies
    private let detector = ReactionDetector()
    private let renderer = OverlayRenderer()
    // In a real app, this would be the IPC bridge to the CMIOExtension
    // private let sink = StreamSink() 
    
    // AVFoundation
    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let discoverySession = AVCaptureDevice.DiscoverySession(
        deviceTypes: [.builtInWideAngleCamera, .externalUnknown],
        mediaType: .video,
        position: .unspecified
    )
    
    // Preview for UI
    @Published var currentFrame: CGImage?
    
    // Reaction for UI binding if needed
    var reactionPublisher: Published<Reaction>.Publisher { detector.$currentReaction }
    
    override init() {
        super.init()
        checkPermissions()
    }
    
    private func checkPermissions() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    DispatchQueue.main.async { self?.setupSession() }
                }
            }
        default:
            error = "Camera access denied"
        }
    }
    
    private func setupSession() {
        session.beginConfiguration()
        
        // Input
        guard let device = discoverySession.devices.first else {
            error = "No camera found"
            session.commitConfiguration()
            return
        }
        
        do {
            let input = try AVCaptureDeviceInput(device: device)
            if session.canAddInput(input) {
                session.addInput(input)
            }
        } catch {
            self.error = error.localizedDescription
            session.commitConfiguration()
            return
        }
        
        // Output
        videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "videoQueue"))
        videoOutput.alwaysDiscardsLateVideoFrames = true
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }
        
        session.commitConfiguration()
    }
    
    func start() {
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.startRunning()
            DispatchQueue.main.async { self.isStreaming = true }
        }
    }
    
    func stop() {
        DispatchQueue.global().async {
            self.session.stopRunning()
            DispatchQueue.main.async { self.isStreaming = false }
        }
    }
    
    // MARK: - Delegate
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        // 1. Detect Reaction
        detector.process(buffer: pixelBuffer)
        let reaction = detector.currentReaction
        
        // 2. Render Overlay
        // Note: renderer.render modifies the buffer or returns a new one.
        // We should use the result.
        guard let processedBuffer = renderer.render(pixelBuffer: pixelBuffer, reaction: reaction) else {
            return
        }
        
        // 3. Update UI Preview
        let ciImage = CIImage(cvPixelBuffer: processedBuffer)
        let context = CIContext() // Re-creating context is expensive, strictly should be shared, but ok for MVP
        if let cgImage = context.createCGImage(ciImage, from: ciImage.extent) {
            DispatchQueue.main.async {
                self.currentFrame = cgImage
            }
        }
        
        // 4. Send to Virtual Camera Extension (Sink)
        // StreamSink.shared.send(processedBuffer)
    }
}

