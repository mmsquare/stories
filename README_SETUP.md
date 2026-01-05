# Chameleon Setup Guide (App Only)

Since Personal Development Teams cannot build System Extensions (Virtual Cameras), this guide focuses on building the **Chameleon App** to demonstrate the reaction detection and overlay logic.

## 1. Create Xcode Project
1.  Open Xcode.
2.  Create a new project: **macOS > App**.
3.  Product Name: `Chameleon`
4.  Interface: **SwiftUI**
5.  Language: **Swift**
6.  Save it in the root folder where I generated the `Chameleon` source folder.

## 2. Add Source Files
Replace the default files with the ones I created.

### Main App Target (`Chameleon`)
1.  Delete `ContentView.swift` (the default one) and `ChameleonApp.swift` if you wish.
2.  Drag the following files from the `Chameleon/Logic` and `Chameleon/App` folders into the **Chameleon** group in Xcode:
    -   `ReactionDetector.swift` (Target: **Chameleon**)
    -   `OverlayRenderer.swift` (Target: **Chameleon**)
    -   `CameraManager.swift` (Target: **Chameleon**)
    -   `ContentView.swift` (Target: **Chameleon**)
3.  Update your `ChameleonApp.swift` (entry point) to use `ContentView()`:
    ```swift
    import SwiftUI
    @main
    struct ChameleonApp: App {
        var body: some Scene {
            WindowGroup {
                ContentView()
            }
        }
    }
    ```

## 3. Configuration (`Infnewo.plist`)

1.  Select the **Chameleon** target.
2.  Go to the **Signing & Capabilities** tab.
3.  Add **Camera** (Hardware > Camera) capability.
4.  Open `Info.plist` (or the Info tab) and ensure `Privacy - Camera Usage Description` is set (e.g., "Used to detect reactions").
5.  **Do NOT** add "System Extension" capability.

## 4. Build and Run
1.  Select the **Chameleon** scheme.
2.  Run (Cmd+R).
3.  Grant Camera permissions.
4.  You should see your face in the window.
    -   **Smile** -> "Celebrate" (Purple Border + 🎉)
    -   **Nod** -> "Agree" (Green Border + 👍)
    -   **Shake Head** -> "Disagree" (Red Border + 👎)
