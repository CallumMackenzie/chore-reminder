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

    func load() async {
        guard let client else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            snapshot = try await client.fetchSnapshot()
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

    func update(_ chore: ChoreItem, status: ChoreStatus, userId: String) async {
        guard let client, chore.actionable else { return }
        updatingReminderId = chore.id
        defer { updatingReminderId = nil }
        do {
            snapshot = try await client.update(reminderId: chore.reminderId, status: status, userId: userId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func reset() {
        snapshot = nil
        errorMessage = nil
    }
}
