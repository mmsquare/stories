import Foundation
import Vision
import CoreImage
import Combine

enum Reaction: String {
    case none = "Normal"
    case agree = "Agree"         // Nod
    case disagree = "Disagree"   // Shake
    case celebrate = "Celebrate" // Smile
    case confused = "Confused"   // Frown/Eyebrows
    case listening = "Listening" // Stillness
}

class ReactionDetector: ObservableObject {
    // MARK: - Properties
    @Published var currentReaction: Reaction = .none
    
    private var faceLandmarksRequest: VNDetectFaceLandmarksRequest!
    private var sequenceHandler = VNSequenceRequestHandler()
    
    // History for gesture detection (Nod/Shake)
    private var noseHistory: [CGPoint] = []
    private let historyLimit = 15 // Approx 0.5-1 second at 30fps
    private var lastAnalysisTime = Date()
    
    // Thresholds
    private let movementThreshold: CGFloat = 0.02 // Normalized coord difference
    private let smileThreshold: CGFloat = 0.55 // Mouth width / Face width ratio approx
    
    init() {
        setupVision()
    }
    
    private func setupVision() {
        faceLandmarksRequest = VNDetectFaceLandmarksRequest { [weak self] request, error in
            guard let self = self,
                  let results = request.results as? [VNFaceObservation],
                  let face = results.first else {
                DispatchQueue.main.async { self?.currentReaction = .none }
                return
            }
            self.analyzeFace(face)
        }
    }
    
    func process(buffer: CVPixelBuffer) {
        // Throttle slightly if needed, but for now run every frame
        try? sequenceHandler.perform([faceLandmarksRequest], on: buffer)
    }
    
    private func analyzeFace(_ face: VNFaceObservation) {
        guard let landmarks = face.landmarks else { return }
        
        // 1. Get key points
        // Note: Vision coordinates are normalized (0.0 to 1.0)
        let nose = landmarks.nose?.normalizedPoints.first ?? .zero
        // Add bounding box offset to normalize points relative to the image, not just the face box
        // Actually, landmarks.normalizedPoints are relative to the face bounding box.
        // We need absolute position tracking for head movement.
        // VNFaceObservation.boundingBox is in normalized image coordinates.
        
        let noseInImage = CGPoint(
            x: face.boundingBox.origin.x + nose.x * face.boundingBox.size.width,
            y: face.boundingBox.origin.y + nose.y * face.boundingBox.size.height
        )
        
        updateHistory(point: noseInImage)
        
        // 2. Detect Gestures based on history
        let gesture = detectHeadGesture()
        
        // 3. Detect Expressions (Smile/Frown)
        let expression = detectExpression(landmarks, faceBoundingBox: face.boundingBox)
        
        // 4. Prioritize: Expression > Gesture > Listening
        var reaction: Reaction = .none
        
        if expression == .celebrate {
            reaction = .celebrate
        } else if expression == .confused {
            reaction = .confused
        } else if gesture != .none {
            reaction = gesture
        } else {
            // Check for listening (stillness)
            if isListening() {
                reaction = .listening
            }
        }
        
        DispatchQueue.main.async {
            self.currentReaction = reaction
        }
    }
    
    private func updateHistory(point: CGPoint) {
        noseHistory.append(point)
        if noseHistory.count > historyLimit {
            noseHistory.removeFirst()
        }
    }
    
    private func detectHeadGesture() -> Reaction {
        guard noseHistory.count >= historyLimit else { return .none }
        
        // Calculate variance/deltas
        var totalDX: CGFloat = 0
        var totalDY: CGFloat = 0
        var changesX = 0
        var changesY = 0
        
        for i in 1..<noseHistory.count {
            let prev = noseHistory[i-1]
            let curr = noseHistory[i]
            let dx = curr.x - prev.x
            let dy = curr.y - prev.y
            
            totalDX += abs(dx)
            totalDY += abs(dy)
            
            // Count direction changes (zero crossings of velocity roughly)
            if i > 1 {
                let prevDx = prev.x - noseHistory[i-2].x
                let prevDy = prev.y - noseHistory[i-2].y
                if (dx > 0 && prevDx < 0) || (dx < 0 && prevDx > 0) { changesX += 1 }
                if (dy > 0 && prevDy < 0) || (dy < 0 && prevDy > 0) { changesY += 1 }
            }
        }
        
        // Nod: Significant Y movement, Direction changes in Y
        if totalDY > 0.05 && changesY >= 2 && totalDX < 0.03 {
            return .agree
        }
        
        // Shake: Significant X movement, Direction changes in X
        if totalDX > 0.05 && changesX >= 2 && totalDY < 0.03 {
            return .disagree
        }
        
        return .none
    }
    
    private func detectExpression(_ landmarks: VNFaceLandmarks2D, faceBoundingBox: CGRect) -> Reaction {
        // Celebrate (Smile)
        // Measure mouth width
        if let outerLips = landmarks.outerLips {
            let left = outerLips.normalizedPoints.min(by: { $0.x < $1.x })?.x ?? 0
            let right = outerLips.normalizedPoints.max(by: { $0.x < $1.x })?.x ?? 0
            let mouthWidth = right - left
            
            // Heuristic: Wide mouth relative to face width often indicates smiling
            // Note: landmarks are relative to face box. 0.0 to 1.0.
            // A neutral mouth is usually around 0.3-0.4 width of the face box?
            // A smile is wider.
            if mouthWidth > 0.5 { // Threshold needs tuning
                return .celebrate
            }
        }
        
        // Confused (Eyebrows squeezed or one raised)
        // Simplified: Measure distance between eyebrows
        if let leftEyebrow = landmarks.leftEyebrow,
           let rightEyebrow = landmarks.rightEyebrow {
            
            let leftInner = leftEyebrow.normalizedPoints.last ?? .zero // Approx inner
            let rightInner = rightEyebrow.normalizedPoints.first ?? .zero // Approx inner
            
            let dist = abs(rightInner.x - leftInner.x)
            
            // Frown squeezes eyebrows together
            if dist < 0.15 { // Threshold needs tuning
                return .confused
            }
        }
        
        return .none
    }
    
    private func isListening() -> Bool {
        guard noseHistory.count >= historyLimit else { return false }
        
        // Calculate total movement
        let start = noseHistory.first!
        let end = noseHistory.last!
        let totalDisp = hypot(end.x - start.x, end.y - start.y)
        
        // Very little net displacement, but face is present
        return totalDisp < 0.01
    }
}

