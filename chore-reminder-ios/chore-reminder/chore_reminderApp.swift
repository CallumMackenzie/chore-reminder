import SwiftUI
import SwiftData

@main
struct chore_reminderApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: UserSession.self)
    }
}
