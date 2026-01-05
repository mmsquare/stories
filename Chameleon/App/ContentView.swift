import SwiftUI

struct ContentView: View {
    @StateObject private var cameraManager = CameraManager()
    @State private var currentReactionText = "Normal"
    
    var body: some View {
        VStack {
            Text("Chameleon Virtual Camera")
                .font(.title)
                .padding()
            
            if let image = cameraManager.currentFrame {
                Image(decorative: image, scale: 1.0, orientation: .up)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 400)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray, lineWidth: 1)
                    )
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.black.opacity(0.1))
                        .frame(height: 400)
                    Text("Camera Off")
                        .foregroundColor(.gray)
                }
            }
            
            HStack {
                Button(action: {
                    if cameraManager.isStreaming {
                        cameraManager.stop()
                    } else {
                        cameraManager.start()
                    }
                }) {
                    Text(cameraManager.isStreaming ? "Stop Camera" : "Start Camera")
                        .frame(minWidth: 120)
                }
                .controlSize(.large)
            }
            .padding()
            
            Text("Detected Reaction: \(currentReactionText)")
                .font(.headline)
                .foregroundColor(.secondary)
                .onReceive(cameraManager.reactionPublisher) { reaction in
                    currentReactionText = reaction.rawValue
                }
            
            Text("To use: Open Zoom/Meet and select 'Chameleon Camera'")
                .font(.caption)
                .padding(.top)
        }
        .frame(minWidth: 600, minHeight: 600)
        .padding()
        .onAppear {
            // cameraManager.start() // Optional auto-start
        }
    }
}

