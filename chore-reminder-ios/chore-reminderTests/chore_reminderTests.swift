//
//  chore_reminderTests.swift
//  chore-reminderTests
//
//  Created by Callum Mackenzie on 2026-09-10.
//

import Foundation
import Testing
@testable import chore_reminder

struct chore_reminderTests {
    @MainActor @Test func decodesChoreSnapshot() throws {
        let json = #"{"generatedAt":"2026-09-10T18:00:00.000Z","timezone":"America/Vancouver","today":[{"reminderId":"daily:1","scheduleId":"daily","taskId":"vacuum","assigneeId":"amelia","assigneeName":"Amelia Bowyer","task":"vacuum","dueAt":"2026-09-10T15:00:00.000Z","dueBy":"2026-09-11T15:00:00.000Z","status":"completed","actionable":true}],"upcoming":[],"history":[]}"#.data(using: .utf8)!

        let snapshot = try JSONDecoder().decode(ChoreSnapshot.self, from: json)

        #expect(snapshot.today.count == 1)
        #expect(snapshot.today[0].assigneeName == "Amelia Bowyer")
        #expect(snapshot.today[0].status == .completed)
        #expect(snapshot.today[0].dueDate != nil)
    }
}
