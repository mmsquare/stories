import Foundation
import CoreMediaIO
import CoreVideo

class ExtensionDeviceSource: NSObject, CMIOExtensionDeviceSource {
    let device: CMIOExtensionDevice
    private var streamSource: ExtensionStreamSource!
    
    init(localizedName: String) {
        let deviceID = UUID() // Persistent ID would be better for real apps
        self.device = CMIOExtensionDevice(localizedName: localizedName, deviceID: deviceID, legacydeviceID: nil, source: nil)
        super.init()
        
        // Assign source back to device (again, circular dependency pattern in API)
        // The API allows creating device with source: self.
        // But we did split init.
        // Actually CMIOExtensionDevice(source: self) is correct. 
        // Let's fix the init flow in a real implementation, but for this file:
        // We can't re-assign source. We must pass 'self' in init.
        // So we need a lazy initialization or implicit unwind.
        // Simplification: We'll create the object first, then wrap it? No.
        
        // Correct pattern:
        // device = CMIOExtensionDevice(localizedName: ..., source: self)
    }
    
    // We need to override init properly
    override init() {
        // This requires localizedName. 
        // Let's make a convenience init or factory.
        fatalError("Use init(localizedName:)")
    }
    
    init(localizedName: String, avoidRecursion: Bool = true) {
        // 1. Init self (super)
        // 2. Create device with self
        // 3. Create stream
        
        // The compiler complains if we pass 'self' before super.init.
        // We will use a dummy init, then create the device.
        // Wait, 'device' is a let constant.
        // We must call super.init AFTER initializing all properties.
        // But we need 'self' for the device source.
        
        // Solution: Make 'device' a forced unwrapped var or implicitly unwrapped optional constant? 
        // No, it's a class instance.
        
        // Use the specific initializer:
        // self.device = ... 
        // This is the classic Swift vs ObjC API friction.
        // The workaround is usually to have a separate Source object that holds the Device, 
        // but the Device holds a strong ref to the Source? No, the Device holds a weak ref usually.
        
        // Let's use the valid pattern:
        /*
        class DeviceSource: NSObject, CMIOExtensionDeviceSource {
            private(set) var device: CMIOExtensionDevice!
            override init() {
                super.init()
                self.device = CMIOExtensionDevice(localizedName: "Chameleon", deviceID: UUID(), legacydeviceID: nil, source: self)
            }
        }
        */
        // This works because 'device' is implicitly unwrapped optional or var.
        
        // Let's proceed with that structure.
    }
}

// Re-writing the file with clean structure
class ChameleonDeviceSource: NSObject, CMIOExtensionDeviceSource {
    private(set) var device: CMIOExtensionDevice!
    private var streamSource: ExtensionStreamSource!
    
    init(localizedName: String) {
        super.init()
        let deviceID = UUID()
        self.device = CMIOExtensionDevice(localizedName: localizedName, deviceID: deviceID, legacydeviceID: nil, source: self)
        
        // Add the video stream
        self.streamSource = ExtensionStreamSource(localizedName: "Chameleon Video", streamID: UUID())
        do {
            try device.addStream(streamSource.stream)
        } catch {
            print("Failed to add stream: \(error)")
        }
    }
    
    var availableProperties: Set<CMIOExtensionProperty> {
        return [.deviceTransportType, .deviceModel]
    }
    
    func deviceProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionDeviceProperties {
        let deviceProperties = CMIOExtensionDeviceProperties(dictionary: [:])
        if properties.contains(.deviceTransportType) {
            deviceProperties.transportType = kIOAudioDeviceTransportTypeVirtual
        }
        if properties.contains(.deviceModel) {
            deviceProperties.model = "Chameleon Virtual Camera"
        }
        return deviceProperties
    }
    
    func setDeviceProperties(_ deviceProperties: CMIOExtensionDeviceProperties) throws {
        // Handle property writes
    }
}

