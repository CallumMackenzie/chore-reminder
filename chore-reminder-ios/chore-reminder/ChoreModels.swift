import Foundation

enum ChoreStatus: String, Codable, Sendable {
    case completed
    case skipped
    case pending
    case notCompleted
}

struct ChoreItem: Codable, Identifiable, Hashable, Sendable {
    let reminderId: String
    let scheduleId: String
    let taskId: String
    let assigneeId: String
    let assigneeName: String
    let task: String
    let dueAt: String
    let dueBy: String
    let status: ChoreStatus
    let actionable: Bool

    var id: String { reminderId }
    var dueDate: Date? { Self.iso8601.date(from: dueAt) }

    private static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

struct ChoreSnapshot: Codable, Sendable {
    let generatedAt: String
    let timezone: String
    let today: [ChoreItem]
    let upcoming: [ChoreItem]
    let history: [ChoreItem]
}

struct ChoreIdentity: Codable, Sendable {
    let userId: String
    let displayName: String
}
