import SwiftData
import SwiftUI

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var sessions: [UserSession]
    @StateObject private var model = ChoreViewModel()
    @State private var phone = ""
    @State private var showsCompletionSmile = false

    var body: some View {
        if let session = sessions.first, let householdId = session.householdId {
            authenticatedView(session, householdId: householdId)
        } else {
            loginView
        }
    }

    private var loginView: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Spacer()
                Image(systemName: "checklist.checked")
                    .font(.system(size: 56, weight: .medium))
                    .foregroundStyle(.tint)
                VStack(spacing: 6) {
                    Text("Collingclean")
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
            .padding(24)
        }
    }

    private func authenticatedView(_ session: UserSession, householdId: String) -> some View {
        NavigationStack {
            Group {
                if let snapshot = model.snapshot {
                    choreList(snapshot, householdId: householdId, userId: session.userId)
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
            .navigationTitle("Collingclean")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh", systemImage: "arrow.clockwise") {
                            Task { await model.load(householdId: householdId) }
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
                if model.snapshot == nil { await model.load(householdId: householdId) }
            }
            .onChange(
                of: model.snapshot?.today.contains {
                    $0.assigneeId == session.userId && $0.status == .completed
                } ?? false,
                initial: true
            ) { _, isCompleted in
                withAnimation(.spring(response: 0.8, dampingFraction: 0.72)) {
                    showsCompletionSmile = isCompleted
                }
            }
            .alert("Collingclean", isPresented: errorPresented) {
                Button("OK", role: .cancel) { model.errorMessage = nil }
            } message: {
                Text(model.errorMessage ?? "Something went wrong.")
            }
        }
        .overlay(alignment: .bottom) {
            if showsCompletionSmile {
                CompletionCelebration()
                    .safeAreaPadding(.bottom, 18)
                    .transition(
                        .asymmetric(
                            insertion: .move(edge: .bottom)
                                .combined(with: .scale(scale: 0.55))
                                .combined(with: .opacity),
                            removal: .scale(scale: 0.8).combined(with: .opacity)
                        )
                    )
            }
        }
    }

    private var errorPresented: Binding<Bool> {
        Binding(
            get: { model.snapshot != nil && model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )
    }

    private func choreList(_ snapshot: ChoreSnapshot, householdId: String, userId: String) -> some View {
        List {
            Section {
                if snapshot.today.isEmpty {
                    Label("No chores today", systemImage: "sparkles")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.today) { chore in
                        VStack(alignment: .leading, spacing: 8) {
                            ChoreRow(chore: chore, showsDate: false)
                            if chore.actionable && chore.assigneeId == userId {
                                HStack(spacing: 8) {
                                    OutcomeButton(
                                        title: "Complete",
                                        systemImage: "checkmark.circle.fill",
                                        color: .green,
                                        selected: chore.status == .completed,
                                        disabled: model.updatingReminderId != nil
                                    ) {
                                        Task { await complete(chore, householdId: householdId, userId: userId) }
                                    }
                                    OutcomeButton(
                                        title: "Skip",
                                        systemImage: "forward.circle.fill",
                                        color: .orange,
                                        selected: chore.status == .skipped,
                                        disabled: model.updatingReminderId != nil
                                    ) {
                                        Task {
                                            await model.update(
                                                chore,
                                                status: .skipped,
                                                householdId: householdId,
                                                userId: userId
                                            )
                                        }
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
                        .padding(.vertical, 2)
                    }
                }
            } header: {
                SectionHeader(title: "Today", systemImage: "sun.max.fill")
            }

            Section {
                if snapshot.history.isEmpty {
                    Text("No recent chores.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.history) { chore in
                        ChoreRow(chore: chore, showsDate: true)
                    }
                }
            } header: {
                SectionHeader(title: "Past 3 Days", systemImage: "clock.arrow.circlepath")
            }

            Section {
                if snapshot.upcoming.isEmpty {
                    Text("Nothing scheduled in the next 5 days.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.upcoming) { chore in
                        ChoreRow(chore: chore, showsDate: true)
                    }
                }
            } header: {
                SectionHeader(title: "Next 5 Days", systemImage: "calendar")
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(.compact)
        .environment(\.defaultMinListRowHeight, 40)
        .contentMargins(.top, 8, for: .scrollContent)
        .refreshable { await model.load(householdId: householdId) }
    }

    private func logIn() async {
        guard let identity = await model.login(phone: phone) else { return }
        sessions.forEach(modelContext.delete)
        modelContext.insert(UserSession(
            householdId: identity.householdId,
            userId: identity.userId,
            displayName: identity.displayName
        ))
        try? modelContext.save()
        phone = ""
        await model.load(householdId: identity.householdId)
    }

    private func signOut() {
        sessions.forEach(modelContext.delete)
        try? modelContext.save()
        model.reset()
    }

    private func complete(_ chore: ChoreItem, householdId: String, userId: String) async {
        guard await model.update(
            chore,
            status: .completed,
            householdId: householdId,
            userId: userId
        ) else { return }
        withAnimation(.spring(response: 0.8, dampingFraction: 0.72)) {
            showsCompletionSmile = true
        }
    }
}

private struct CompletionCelebration: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "face.smiling")
                .font(.system(size: 36, weight: .semibold))
                .symbolEffect(.bounce, options: .speed(0.7))
            Text("Nice work!")
                .font(.headline.weight(.semibold))
            Spacer(minLength: 0)
            Image(systemName: "checkmark.circle.fill")
                .font(.title2)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity, minHeight: 68)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(.green.gradient)
                .shadow(color: .green.opacity(0.3), radius: 10, y: 5)
        )
        .padding(.horizontal, 18)
            .accessibilityLabel("Chore completed")
    }
}

private struct SectionHeader: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(nil)
    }
}

private struct ChoreRow: View {
    let chore: ChoreItem
    let showsDate: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 9) {
            ZStack {
                Circle().fill(.tint.opacity(0.13)).frame(width: 34, height: 34)
                Text(chore.assigneeName.prefix(1).uppercased())
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.tint)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(chore.task.capitalized)
                    .font(.subheadline.weight(.semibold))
                HStack(spacing: 5) {
                    Text(chore.assigneeName)
                    if showsDate, let dueDate = chore.dueDate {
                        Text("·")
                        Text(dueDate, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Label(chore.status.label, systemImage: chore.status.systemImage)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(chore.status.color)
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(chore.status.color.opacity(0.11), in: Capsule())
        }
        .padding(.vertical, 1)
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
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.small)
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
