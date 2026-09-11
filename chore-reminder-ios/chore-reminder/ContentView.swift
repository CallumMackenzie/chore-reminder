import SwiftData
import SwiftUI

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var sessions: [UserSession]
    @StateObject private var model = ChoreViewModel()
    @State private var phone = ""

    var body: some View {
        if let session = sessions.first {
            authenticatedView(session)
        } else {
            loginView
        }
    }

    private var loginView: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Spacer()
                Image(systemName: "checklist.checked")
                    .font(.system(size: 68))
                    .foregroundStyle(.tint)
                VStack(spacing: 8) {
                    Text("House Chores")
                        .font(.largeTitle.bold())
                    Text("Enter your phone number to find your household profile.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                TextField("Phone number", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .textFieldStyle(.roundedBorder)
                    .font(.title3)
                    .accessibilityLabel("Phone number")
                Button {
                    Task { await logIn() }
                } label: {
                    if model.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Continue")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.isLoading)
                if let error = model.errorMessage {
                    Text(error)
                        .font(.callout)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                Spacer()
                Text("Your phone number is used only to match the household configuration.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(28)
        }
    }

    private func authenticatedView(_ session: UserSession) -> some View {
        NavigationStack {
            Group {
                if let snapshot = model.snapshot {
                    choreList(snapshot, userId: session.userId)
                } else if model.isLoading {
                    ProgressView("Loading chores…")
                } else {
                    ContentUnavailableView(
                        "Couldn’t Load Chores",
                        systemImage: "exclamationmark.triangle",
                        description: Text(model.errorMessage ?? "Pull to try again.")
                    )
                }
            }
            .navigationTitle("Chores")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text(session.displayName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh", systemImage: "arrow.clockwise") {
                            Task { await model.load() }
                        }
                        Button("Change User", systemImage: "person.crop.circle.badge.xmark", role: .destructive) {
                            signOut()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .task(id: session.userId) {
                if model.snapshot == nil { await model.load() }
            }
            .alert("Chore Reminder", isPresented: errorPresented) {
                Button("OK", role: .cancel) { model.errorMessage = nil }
            } message: {
                Text(model.errorMessage ?? "Something went wrong.")
            }
        }
    }

    private var errorPresented: Binding<Bool> {
        Binding(
            get: { model.snapshot != nil && model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )
    }

    private func choreList(_ snapshot: ChoreSnapshot, userId: String) -> some View {
        List {
            Section("Today") {
                if snapshot.today.isEmpty {
                    Label("No chores today", systemImage: "sparkles")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.today) { chore in
                        VStack(alignment: .leading, spacing: 12) {
                            ChoreRow(chore: chore, showsDate: false)
                            if chore.actionable && chore.assigneeId == userId {
                                HStack(spacing: 10) {
                                    OutcomeButton(
                                        title: "Complete",
                                        systemImage: "checkmark.circle.fill",
                                        color: .green,
                                        selected: chore.status == .completed,
                                        disabled: model.updatingReminderId != nil
                                    ) {
                                        Task { await model.update(chore, status: .completed, userId: userId) }
                                    }
                                    OutcomeButton(
                                        title: "Skip",
                                        systemImage: "forward.circle.fill",
                                        color: .orange,
                                        selected: chore.status == .skipped,
                                        disabled: model.updatingReminderId != nil
                                    ) {
                                        Task { await model.update(chore, status: .skipped, userId: userId) }
                                    }
                                }
                                if model.updatingReminderId == chore.id {
                                    ProgressView().frame(maxWidth: .infinity)
                                }
                            } else if chore.assigneeId != userId {
                                Text("Only \(chore.assigneeName) can update this chore.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 5)
                    }
                }
            }

            Section("Upcoming") {
                if snapshot.upcoming.isEmpty {
                    Text("Nothing scheduled in the next 5 days.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.upcoming) { chore in
                        ChoreRow(chore: chore, showsDate: true)
                    }
                }
            }

            Section("Past 3 Days") {
                if snapshot.history.isEmpty {
                    Text("No recent chores.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.history) { chore in
                        ChoreRow(chore: chore, showsDate: true)
                    }
                }
            }
        }
        .refreshable { await model.load() }
    }

    private func logIn() async {
        guard let identity = await model.login(phone: phone) else { return }
        sessions.forEach(modelContext.delete)
        modelContext.insert(UserSession(userId: identity.userId, displayName: identity.displayName))
        try? modelContext.save()
        phone = ""
        await model.load()
    }

    private func signOut() {
        sessions.forEach(modelContext.delete)
        try? modelContext.save()
        model.reset()
    }
}

private struct ChoreRow: View {
    let chore: ChoreItem
    let showsDate: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle().fill(.tint.opacity(0.14)).frame(width: 42, height: 42)
                Text(chore.assigneeName.prefix(1).uppercased())
                    .font(.headline)
                    .foregroundStyle(.tint)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(chore.task.capitalized).font(.headline)
                Text(chore.assigneeName).foregroundStyle(.secondary)
                if showsDate, let dueDate = chore.dueDate {
                    Text(dueDate, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Label(chore.status.label, systemImage: chore.status.systemImage)
                .font(.caption.weight(.semibold))
                .foregroundStyle(chore.status.color)
        }
    }
}

private struct OutcomeButton: View {
    let title: String
    let systemImage: String
    let color: Color
    let selected: Bool
    let disabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage).frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(selected ? color : color.opacity(0.72))
        .disabled(disabled || selected)
    }
}

private extension ChoreStatus {
    var label: String {
        switch self {
        case .completed: "Completed"
        case .skipped: "Skipped"
        case .pending: "Pending"
        case .notCompleted: "Not completed"
        }
    }

    var systemImage: String {
        switch self {
        case .completed: "checkmark.circle.fill"
        case .skipped: "forward.circle.fill"
        case .pending: "clock.fill"
        case .notCompleted: "xmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .completed: .green
        case .skipped: .orange
        case .pending: .blue
        case .notCompleted: .red
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: UserSession.self, inMemory: true)
}
