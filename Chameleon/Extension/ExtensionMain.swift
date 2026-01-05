import Foundation
import CoreMediaIO

@main
struct ExtensionMain {
    static func main() {
        let providerSource = ExtensionProviderSource(clientQueue: nil)
        CMIOExtensionProvider.startService(provider: providerSource.provider)
        CFRunLoopRun()
    }
}

