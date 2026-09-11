import Foundation
import SwiftData

@Model
final class UserSession {
    @Attribute(.unique) var storageKey: String
    var userId: String
    var displayName: String

    init(userId: String, displayName: String) {
        self.storageKey = "current-user"
        self.userId = userId
        self.displayName = displayName
    }
}
