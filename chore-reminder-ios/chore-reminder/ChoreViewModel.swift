import Combine
import Foundation

@MainActor
final class ChoreViewModel: ObservableObject {
    @Published private(set) var snapshot: ChoreSnapshot?
    @Published private(set) var isLoading = false
    @Published private(set) var updatingReminderId: String?
    @Published var errorMessage: String?

    private let client: ChoreAPIClient?

    init() {
        do {
            client = try ChoreAPIClient()
        } catch {
            client = nil
            errorMessage = error.localizedDescription
        }
    }

    func load(householdId: String) async {
        guard let client else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            snapshot = try await client.fetchSnapshot(householdId: householdId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func login(phone: String) async -> ChoreIdentity? {
        guard let client else { return nil }
        isLoading = true
        defer { isLoading = false }
        do {
            let identity = try await client.login(phone: phone)
            errorMessage = nil
            return identity
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    @discardableResult
    func update(_ chore: ChoreItem, status: ChoreStatus, householdId: String, userId: String) async -> Bool {
        guard let client, chore.actionable else { return false }
        updatingReminderId = chore.id
        defer { updatingReminderId = nil }
        do {
            snapshot = try await client.update(
                reminderId: chore.reminderId,
                status: status,
                householdId: householdId,
                userId: userId
            )
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func reset() {
        snapshot = nil
        errorMessage = nil
    }
}
